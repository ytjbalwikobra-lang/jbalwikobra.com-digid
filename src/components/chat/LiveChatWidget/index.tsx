/**
 * LiveChatWidget/index.tsx
 * 
 * Widget chat mengambang untuk pelanggan berkomunikasi dengan support.
 * Fitur:
 * - Memulai percakapan baru
 * - Kirim/terima pesan secara realtime
 * - Indikator mengetik admin
 * - Berikan rating setelah percakapan
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  startConversation,
  sendCustomerMessage,
  getCustomerMessages,
  submitRating,
  uploadChatAttachment,
  getConversationDetails,
  subscribeToMessages,
  subscribeToConversations,
  subscribeToTypingIndicators,
  customerSetTyping,
  customerStopTyping
} from '../../../services/chatService';
import { getGameTitles } from '../../../services/product/catalogOps';
import type { ChatConversation, ChatMessage, ChatTopic } from '../../../types/chat';
import type { GameTitle } from '../../../types';

// Komponen sub-modules
import { ChatIcon, CloseIcon } from './ChatIcons';
import { ChatStartForm } from './ChatStartForm';
import { ChatView } from './ChatView';
import { ChatRatingView } from './ChatRatingView';

interface ChatWidgetProps {
  /** Posisi widget di layar */
  position?: 'bottom-right' | 'bottom-left';
  /** Apakah widget dibuka secara default */
  defaultOpen?: boolean;
  /** Callback saat percakapan dimulai */
  onConversationStart?: (conversation: ChatConversation) => void;
}

/** State tampilan widget chat */
type ViewState = 'start' | 'chat' | 'rating' | 'closed';

const LiveChatWidget: React.FC<ChatWidgetProps> = ({
  position = 'bottom-right',
  defaultOpen = false,
  onConversationStart
}) => {
  // State umum
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [viewState, setViewState] = useState<ViewState>('start');
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State form awal
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  
  // State topik dan field kondisional
  const [topic, setTopic] = useState<ChatTopic>('lainnya');
  const [orderId, setOrderId] = useState('');
  const [gameTitle, setGameTitle] = useState('');
  const [gameTitles, setGameTitles] = useState<GameTitle[]>([]);
  
  // State rating
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  
  // State indikator mengetik
  const [adminTyping, setAdminTyping] = useState(false);
  
  // State lampiran gambar
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // State jumlah pesan belum dibaca (untuk badge FAB)
  const [unreadCount, setUnreadCount] = useState(0);
  
  // State nama admin yang menangani
  const [assignedAdminName, setAssignedAdminName] = useState<string | null>(null);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const unsubscribeTypingRef = useRef<(() => void) | null>(null);
  const unsubscribeConvRef = useRef<(() => void) | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);

  // Kelas posisi CSS — bottom-24 pada mobile agar tidak tertutup CyberBottomNav (z-100, ~76px tinggi)
  // z-[200] supaya di atas bottom nav (z-100) dan overlay (z-300 untuk modal)
  const positionClasses = position === 'bottom-right'
    ? 'right-4 bottom-24 lg:bottom-4'
    : 'left-4 bottom-24 lg:bottom-4';

  // --- Effects ---

  /** Scroll ke bawah saat ada pesan baru */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  /** Muat daftar game untuk selector topik jual akun */
  useEffect(() => {
    notificationAudioRef.current = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=');
    if (notificationAudioRef.current) {
      notificationAudioRef.current.volume = 0.4;
    }

    getGameTitles()
      .then(games => setGameTitles(games))
      .catch(err => console.error('[LiveChat] Gagal memuat game titles:', err));
    
    // Cek flag auto-open dari halaman payment
    const autoOpen = sessionStorage.getItem('open_live_chat');
    if (autoOpen === 'true') {
      sessionStorage.removeItem('open_live_chat');
      setIsOpen(true);
    }
    
    // Cek URL param ?chat=open (dari link WhatsApp)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('chat') === 'open') {
      setIsOpen(true);
      // Bersihkan param agar tidak terbuka lagi saat refresh
      urlParams.delete('chat');
      const newUrl = urlParams.toString()
        ? `${window.location.pathname}?${urlParams.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  /** Muat percakapan dari localStorage */
  useEffect(() => {
    const savedConvId = localStorage.getItem('chat_conversation_id');
    const savedEmail = localStorage.getItem('chat_customer_email');
    const savedName = localStorage.getItem('chat_customer_name');
    
    if (savedConvId && savedEmail) {
      setConversation({ id: savedConvId } as ChatConversation);
      setCustomerEmail(savedEmail);
      setCustomerName(savedName || '');
      setViewState('chat');
      loadMessages(savedConvId);
    }
  }, []);

  /** Reset unread saat widget dibuka */
  useEffect(() => {
    if (isOpen) setUnreadCount(0);
  }, [isOpen]);

  /** Langganan pesan realtime — mekanisme utama penerimaan pesan */
  useEffect(() => {
    if (conversation?.id) {
      const { unsubscribe } = subscribeToMessages(conversation.id, (msg) => {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // Tambah unread jika chat tertutup dan pesan dari admin/system
        if (!isOpen && msg.senderType !== 'customer') {
          setUnreadCount(prev => prev + 1);
          try {
            if (notificationAudioRef.current) {
              notificationAudioRef.current.currentTime = 0;
              notificationAudioRef.current.play().catch(() => undefined);
            }
          } catch (err) {
            console.error('[LiveChat] Gagal memutar suara notif:', err);
          }
        }
      });
      unsubscribeRef.current = unsubscribe;
      return () => { unsubscribe(); };
    }
  }, [conversation?.id, isOpen]);

  /** Langganan indikator mengetik admin */
  useEffect(() => {
    if (conversation?.id) {
      unsubscribeTypingRef.current?.();
      const { unsubscribe } = subscribeToTypingIndicators(conversation.id, (indicators) => {
        const hasAdminTyping = indicators.some(i => i.userType === 'admin');
        setAdminTyping(hasAdminTyping);
      });
      unsubscribeTypingRef.current = unsubscribe;
      return () => { unsubscribe(); setAdminTyping(false); };
    }
  }, [conversation?.id]);

  /** Langganan perubahan percakapan — deteksi saat admin ditugaskan */
  useEffect(() => {
    if (conversation?.id) {
      // Ambil data awal untuk nama admin
      getConversationDetails(conversation.id).then(result => {
        if (!result.error && result.assignedAdmin?.name) {
          setAssignedAdminName(result.assignedAdmin.name);
        }
      });

      // Langganan realtime: deteksi perubahan assigned_admin_id
      unsubscribeConvRef.current?.();
      const { unsubscribe } = subscribeToConversations((conv) => {
        if (conv.id === conversation.id && conv.assignedAdminId) {
          // Admin ditugaskan — ambil nama via API (realtime tidak punya join)
          getConversationDetails(conversation.id).then(result => {
            if (!result.error && result.assignedAdmin?.name) {
              setAssignedAdminName(result.assignedAdmin.name);
            }
          });
        }
      });
      unsubscribeConvRef.current = unsubscribe;
      return () => { unsubscribe(); };
    }
  }, [conversation?.id]);

  // --- Fungsi utilitas ---

  /** Muat pesan dari server */
  const loadMessages = async (convId: string) => {
    setIsLoading(true);
    try {
      const result = await getCustomerMessages(convId, { limit: 50 });
      setMessages(result.messages);
    } catch (err) {
      console.error('[LiveChat] Gagal memuat pesan:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handler ---

  /** Handler mulai percakapan baru */
  const handleStartConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await startConversation({
        customerName,
        customerEmail,
        subject,
        initialMessage,
        topic,
        gameTitle: topic === 'jual_akun' ? gameTitle : undefined,
        orderId: topic === 'pembelian_rental' ? orderId : undefined
      });

      if (result.error || !result.conversation) {
        setError(result.error || 'Gagal memulai percakapan');
        return;
      }

      // Simpan ke localStorage
      localStorage.setItem('chat_conversation_id', result.conversation.id);
      localStorage.setItem('chat_customer_email', customerEmail);
      localStorage.setItem('chat_customer_name', customerName);

      setConversation(result.conversation);
      setViewState('chat');
      onConversationStart?.(result.conversation);

      if (initialMessage) {
        await loadMessages(result.conversation.id);
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  /** Handler perubahan input pesan dengan indikator mengetik */
  const handleInputChange = useCallback((value: string) => {
    setNewMessage(value);
    
    if (conversation?.id && value.trim()) {
      customerSetTyping(conversation.id, customerName);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (conversation?.id) {
          customerStopTyping(conversation.id);
        }
      }, 3000);
    }
  }, [conversation?.id, customerName]);

  /** Handler kirim pesan */
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversation?.id) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setIsLoading(true);
    
    customerStopTyping(conversation.id);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    try {
      const result = await sendCustomerMessage(
        conversation.id,
        messageText,
        customerEmail,
        customerName
      );

      if (result.error) {
        setError(result.error);
        setNewMessage(messageText);
        return;
      }

      // Tambahkan secara optimistik jika belum ada dari realtime
      if (result.message) {
        setMessages(prev => {
          if (prev.some(m => m.id === result.message!.id)) return prev;
          return [...prev, result.message!];
        });
      }
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim pesan');
      setNewMessage(messageText);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  /** Handler kirim lampiran gambar */
  const handleSendImage = async () => {
    if (!selectedFile || !conversation?.id) return;
    setIsUploading(true);
    setError(null);

    try {
      // Upload file ke Supabase Storage via backend
      const uploadResult = await uploadChatAttachment(conversation.id, selectedFile);
      if (uploadResult.error || !uploadResult.url) {
        setError(uploadResult.error || 'Gagal upload gambar');
        return;
      }

      // Kirim pesan dengan lampiran
      const caption = newMessage.trim() || '📷 Gambar';
      const result = await sendCustomerMessage(
        conversation.id,
        caption,
        customerEmail,
        customerName,
        {
          messageType: 'image',
          attachmentUrl: uploadResult.url,
          attachmentName: uploadResult.fileName || selectedFile.name,
          attachmentType: uploadResult.mimeType || selectedFile.type
        }
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      // Tambahkan secara optimistik
      if (result.message) {
        setMessages(prev => {
          if (prev.some(m => m.id === result.message!.id)) return prev;
          return [...prev, result.message!];
        });
      }

      // Reset state
      setSelectedFile(null);
      setNewMessage('');
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim gambar');
    } finally {
      setIsUploading(false);
      inputRef.current?.focus();
    }
  };

  /** Handler kirim rating */
  const handleSubmitRating = async () => {
    if (!conversation?.id || rating === 0) return;
    setIsLoading(true);

    try {
      const result = await submitRating({
        conversationId: conversation.id,
        rating,
        feedback
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setRatingSubmitted(true);
      
      // Bersihkan localStorage
      localStorage.removeItem('chat_conversation_id');
      localStorage.removeItem('chat_customer_email');
      localStorage.removeItem('chat_customer_name');
      
      // Tampilkan ucapan terima kasih, lalu reset
      setTimeout(() => {
        setConversation(null);
        setMessages([]);
        setRating(0);
        setFeedback('');
        setRatingSubmitted(false);
        setViewState('start');
        setIsOpen(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim rating');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render ---

  return (
    <div className={`fixed ${positionClasses} z-[200]`}>
      {/* Jendela Chat — fullscreen pada mobile kecil, popup pada desktop */}
      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:relative sm:mb-4 w-full sm:w-[380px] h-full sm:h-[min(520px,75vh)] bg-[var(--cyber-bg-card)] sm:border sm:border-[var(--cyber-border)] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-2 sm:animate-in sm:fade-in sm:zoom-in-95 duration-200">
          {/* Header — gradient dengan status online */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[var(--cyber-accent)] to-[color-mix(in_srgb,var(--cyber-accent)_80%,#7c3aed)] text-white safe-area-top">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base">Live Chat</h3>
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-white/15 rounded-full">
                  <span className="w-1.5 h-1.5 bg-[var(--cyber-success)] rounded-full animate-pulse" />
                  <span className="text-[10px] font-medium">Online</span>
                </span>
              </div>
              <p className="text-xs text-white/70 truncate mt-0.5">
                {viewState === 'start' ? 'Biasanya membalas dalam beberapa menit' : 
                 viewState === 'rating' ? 'Berikan penilaian Anda' : 
                 assignedAdminName ? `Terhubung dengan ${assignedAdminName}` : 'Tim support siap membantu'}
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 -mr-1 hover:bg-white/20 active:bg-white/30 rounded-full transition-colors touch-manipulation"
              aria-label="Tutup chat"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Konten */}
          <div className="flex-1 overflow-hidden">
            {viewState === 'start' && (
              <ChatStartForm
                customerName={customerName}
                customerEmail={customerEmail}
                subject={subject}
                initialMessage={initialMessage}
                topic={topic}
                orderId={orderId}
                gameTitle={gameTitle}
                gameTitles={gameTitles}
                isLoading={isLoading}
                error={error}
                onNameChange={setCustomerName}
                onEmailChange={setCustomerEmail}
                onSubjectChange={setSubject}
                onMessageChange={setInitialMessage}
                onTopicChange={setTopic}
                onOrderIdChange={setOrderId}
                onGameTitleChange={setGameTitle}
                onSubmit={handleStartConversation}
              />
            )}
            {viewState === 'chat' && (
              <ChatView
                messages={messages}
                newMessage={newMessage}
                isLoading={isLoading}
                error={error}
                adminTyping={adminTyping}
                selectedFile={selectedFile}
                isUploading={isUploading}
                messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
                inputRef={inputRef as React.RefObject<HTMLInputElement>}
                onInputChange={handleInputChange}
                onSubmit={handleSendMessage}
                onFileSelect={setSelectedFile}
                onSendImage={handleSendImage}
                onEndChat={() => setViewState('rating')}
              />
            )}
            {viewState === 'rating' && (
              <ChatRatingView
                rating={rating}
                feedback={feedback}
                isLoading={isLoading}
                error={error}
                ratingSubmitted={ratingSubmitted}
                onRatingChange={setRating}
                onFeedbackChange={setFeedback}
                onSubmit={handleSubmitRating}
                onBack={() => setViewState('chat')}
              />
            )}
          </div>
        </div>
      )}

      {/* Tombol Toggle Widget — tersembunyi saat chat fullscreen pada mobile */}
      <button
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) setUnreadCount(0); }}
        className={`relative w-14 h-14 bg-[var(--cyber-accent)] text-white rounded-full shadow-lg shadow-[var(--cyber-accent)]/30 hover:shadow-[var(--cyber-accent)]/50 active:scale-90 transition-all hover:scale-110 flex items-center justify-center touch-manipulation ${isOpen ? 'hidden sm:flex' : 'flex'}`}
        aria-label={isOpen ? 'Tutup chat' : 'Buka chat'}
      >
        {isOpen ? <CloseIcon /> : <ChatIcon />}
        {/* Badge jumlah pesan belum dibaca */}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-[var(--cyber-error)] text-white text-xs font-bold rounded-full flex items-center justify-center ring-2 ring-[var(--cyber-bg-card)] animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {/* Pulse glow saat ada pesan baru */}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute inset-0 rounded-full bg-[var(--cyber-accent)] animate-ping opacity-40" />
        )}
      </button>
    </div>
  );
};

export default LiveChatWidget;
