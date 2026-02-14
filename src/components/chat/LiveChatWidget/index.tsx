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
  getCustomerConversations,
  subscribeToMessages,
  subscribeToConversations,
  subscribeToTypingIndicators,
  customerSetTyping,
  customerStopTyping,
  getChatSettings,
  isWithinBusinessHours
} from '../../../services/chatService';
import type { CustomerConversationSummary } from '../../../services/chatCustomerService';
import { useAuth } from '../../../contexts/TraditionalAuthContext';
import { getGameTitles } from '../../../services/product/catalogOps';
import type { ChatConversation, ChatMessage, ChatTopic, ChatSettings, PurchaseEmbedData } from '../../../types/chat';
import type { GameTitle } from '../../../types';

// Komponen sub-modules
import { ChatIcon, CloseIcon } from './ChatIcons';
import { ChatStartForm } from './ChatStartForm';
import { ChatView } from './ChatView';
import { ChatRatingView } from './ChatRatingView';
import { ConversationListView } from './ConversationListView';
import { ChatErrorBoundary } from '../../ChatErrorBoundary';

interface ChatWidgetProps {
  /** Posisi widget di layar */
  position?: 'bottom-right' | 'bottom-left';
  /** Apakah widget dibuka secara default */
  defaultOpen?: boolean;
  /** Callback saat percakapan dimulai */
  onConversationStart?: (conversation: ChatConversation) => void;
}

/** State tampilan widget chat */
type ViewState = 'conversations' | 'start' | 'chat' | 'rating' | 'closed';

const LiveChatWidget: React.FC<ChatWidgetProps> = ({
  position = 'bottom-right',
  defaultOpen = false,
  onConversationStart
}) => {
  // Auth — deteksi user yang login
  const { user } = useAuth();
  const isLoggedIn = !!user;
  
  // State umum
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [viewState, setViewState] = useState<ViewState>('start');
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State daftar percakapan user (untuk user yang login)
  const [customerConversations, setCustomerConversations] = useState<CustomerConversationSummary[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  
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
  
  // State pengaturan jam operasional
  const [chatSettings, setChatSettings] = useState<ChatSettings | null>(null);
  const [isOfflineHours, setIsOfflineHours] = useState(false);
  
  // Data embed pembelian yang akan dikirim setelah percakapan dimulai
  const [pendingPurchaseEmbed, setPendingPurchaseEmbed] = useState<PurchaseEmbedData | null>(null);
  
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
    // Gunakan file WAV asli untuk notifikasi chat — preload agar siap di mobile
    notificationAudioRef.current = new Audio('/assets/mixkit-bell-notification-933.wav');
    if (notificationAudioRef.current) {
      notificationAudioRef.current.preload = 'auto';
      notificationAudioRef.current.volume = 0.4;
    }

    // Unlock audio saat user pertama kali berinteraksi (wajib untuk iOS/Android)
    const unlockAudio = () => {
      const audio = notificationAudioRef.current;
      if (!audio) return;
      const p = audio.play();
      if (p && typeof p.then === 'function') {
        p.then(() => { audio.pause(); audio.currentTime = 0; }).catch(() => {});
      }
      // Hapus listener setelah unlock
      ['click', 'touchstart'].forEach(e => document.removeEventListener(e, unlockAudio, true));
    };
    ['click', 'touchstart'].forEach(e =>
      document.addEventListener(e, unlockAudio, { capture: true, passive: true, once: false })
    );

    getGameTitles()
      .then(games => setGameTitles(games))
      .catch(err => console.error('[LiveChat] Gagal memuat game titles:', err));
    
    // Cek flag auto-open dari halaman payment
    const autoOpen = sessionStorage.getItem('open_live_chat');
    if (autoOpen === 'true') {
      sessionStorage.removeItem('open_live_chat');
      setIsOpen(true);

      // Cek data embed pembelian dari halaman payment
      const purchaseRaw = sessionStorage.getItem('chat_purchase_embed');
      if (purchaseRaw) {
        sessionStorage.removeItem('chat_purchase_embed');
        try {
          const embedData = JSON.parse(purchaseRaw) as PurchaseEmbedData;
          if (embedData.embedType === 'purchase_history') {
            setPendingPurchaseEmbed(embedData);
            // Pre-fill form: topik pembelian dan order ID
            setTopic('pembelian_rental');
            if (embedData.orderId) setOrderId(embedData.orderId);
            if (embedData.productName) setSubject(embedData.productName);
            // Pre-fill nama & email dari data pembelian (jika belum login)
            if (embedData.customerName && !customerName) setCustomerName(embedData.customerName);
            if (embedData.customerEmail && !customerEmail) setCustomerEmail(embedData.customerEmail);
          }
        } catch (err) {
          console.error('[LiveChat] Gagal parse purchase embed data:', err);
        }
      }
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
    
    // Muat pengaturan jam operasional chat
    getChatSettings().then(settings => {
      setChatSettings(settings);
      if (settings.businessHoursEnabled) {
        setIsOfflineHours(!isWithinBusinessHours(settings));
      }
    }).catch(err => console.error('[LiveChat] Gagal memuat chat settings:', err));
  }, []);

  /** Auto-fill nama dan email dari user yang login */
  useEffect(() => {
    if (user) {
      if (user.name && !customerName) setCustomerName(user.name);
      if (user.email && !customerEmail) setCustomerEmail(user.email);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Muat percakapan dari localStorage dan validasi status */
  useEffect(() => {
    const savedConvId = localStorage.getItem('chat_conversation_id');
    const savedEmail = localStorage.getItem('chat_customer_email');
    const savedName = localStorage.getItem('chat_customer_name');
    
    if (savedConvId && savedEmail) {
      // Validasi: cek apakah percakapan masih aktif (bukan closed/resolved)
      getConversationDetails(savedConvId).then(result => {
        if (!result.error) {
          const status = result.status;
          if (status === 'closed' || status === 'resolved') {
            // Percakapan sudah selesai — hapus data lama
            localStorage.removeItem('chat_conversation_id');
            localStorage.removeItem('chat_customer_email');
            localStorage.removeItem('chat_customer_name');
            console.info('[LiveChat] Percakapan lama sudah closed/resolved, kembali ke form awal');
            // Jika user login, tampilkan conversation list
            if (isLoggedIn) setViewState('conversations');
            return;
          }
          // Percakapan masih aktif — lanjutkan
          setConversation({ id: savedConvId } as ChatConversation);
          setCustomerEmail(savedEmail);
          setCustomerName(savedName || '');
          setViewState('chat');
          loadMessages(savedConvId);
        } else {
          // Percakapan tidak ditemukan atau error — bersihkan localStorage
          localStorage.removeItem('chat_conversation_id');
          localStorage.removeItem('chat_customer_email');
          localStorage.removeItem('chat_customer_name');
          // Jika user login, tampilkan conversation list
          if (isLoggedIn) setViewState('conversations');
        }
      }).catch(() => {
        // Error saat validasi — bersihkan untuk safety
        localStorage.removeItem('chat_conversation_id');
        localStorage.removeItem('chat_customer_email');
        localStorage.removeItem('chat_customer_name');
      });
    } else if (isLoggedIn) {
      // User login tapi tidak ada percakapan tersimpan — tampilkan conversation list
      setViewState('conversations');
    }
  }, [isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Reset unread saat widget dibuka */
  useEffect(() => {
    if (isOpen) setUnreadCount(0);
  }, [isOpen]);

  /** Cek ulang status jam operasional setiap 60 detik */
  useEffect(() => {
    if (!chatSettings?.businessHoursEnabled) return;
    const interval = setInterval(() => {
      setIsOfflineHours(!isWithinBusinessHours(chatSettings));
    }, 60000);
    return () => clearInterval(interval);
  }, [chatSettings]);

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
              const p = notificationAudioRef.current.play();
              if (p && typeof p.then === 'function') {
                p.catch(() => {
                  // Audio diblokir — fallback vibrate di mobile
                  if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                });
              }
            }
          } catch (err) {
            // Fallback vibrate jika Audio sama sekali gagal
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate([100, 50, 100]);
            }
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

  /** Muat daftar percakapan milik user yang login */
  const loadCustomerConversations = useCallback(async () => {
    if (!user) return;
    setConversationsLoading(true);
    try {
      const result = await getCustomerConversations({
        userId: user.id,
        customerEmail: user.email
      });
      if (!result.error) {
        setCustomerConversations(result.conversations);
      }
    } catch (err) {
      console.error('[LiveChat] Gagal memuat daftar percakapan:', err);
    } finally {
      setConversationsLoading(false);
    }
  }, [user]);

  /** Muat percakapan saat viewState = conversations */
  useEffect(() => {
    if (viewState === 'conversations' && isOpen && isLoggedIn) {
      loadCustomerConversations();
    }
  }, [viewState, isOpen, isLoggedIn, loadCustomerConversations]);

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

  /** Handler pilih percakapan dari daftar */
  const handleSelectConversation = useCallback((conv: CustomerConversationSummary) => {
    setConversation({ id: conv.id } as ChatConversation);
    setCustomerEmail(conv.customerEmail || user?.email || '');
    setCustomerName(conv.customerName || user?.name || '');
    
    // Simpan ke localStorage
    localStorage.setItem('chat_conversation_id', conv.id);
    if (conv.customerEmail) localStorage.setItem('chat_customer_email', conv.customerEmail);
    if (conv.customerName) localStorage.setItem('chat_customer_name', conv.customerName);
    
    setViewState('chat');
    loadMessages(conv.id);
  }, [user]);

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
        userId: user?.id,
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

      // Kirim pesan embed riwayat pembelian jika tersedia
      if (pendingPurchaseEmbed) {
        try {
          await sendCustomerMessage(
            result.conversation.id,
            '📦 Riwayat Pembelian',
            customerEmail,
            'System',
            {
              messageType: 'system' as any,
              metadata: pendingPurchaseEmbed as unknown as Record<string, unknown>
            }
          );
          // Muat ulang pesan agar embed tampil
          await loadMessages(result.conversation.id);
        } catch (embedErr) {
          console.error('[LiveChat] Gagal mengirim purchase embed:', embedErr);
        }
        setPendingPurchaseEmbed(null);
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
      // Upload file ke Supabase Storage via backend (sertakan customerEmail untuk guest)
      const uploadResult = await uploadChatAttachment(conversation.id, selectedFile, customerEmail);
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
        // User login kembali ke daftar percakapan, guest kembali ke form
        if (isLoggedIn) {
          setViewState('conversations');
        } else {
          setViewState('start');
          setIsOpen(false);
        }
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
          {/* Header — gradient dengan status online/offline */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[var(--cyber-accent)] to-[color-mix(in_srgb,var(--cyber-accent)_80%,#7c3aed)] text-white safe-area-top">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base">Live Chat</h3>
                {isOfflineHours ? (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/20 rounded-full">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                    <span className="text-[10px] font-medium text-amber-200">{chatSettings?.offlineLabel || 'Offline'}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 bg-white/15 rounded-full">
                    <span className="w-1.5 h-1.5 bg-[var(--cyber-success)] rounded-full animate-pulse" />
                    <span className="text-[10px] font-medium">Online</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-white/70 truncate mt-0.5">
                {viewState === 'conversations' ? `Halo, ${user?.name || 'User'}` :
                 viewState === 'start' ? (isOfflineHours ? 'Balasan mungkin lebih lambat dari biasanya' : 'Biasanya membalas dalam beberapa menit') : 
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
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Banner offline — ditampilkan di luar jam operasional */}
            {isOfflineHours && chatSettings?.offlineMessage && (
              <div className="px-3 pt-3 shrink-0">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <div className="flex gap-2">
                    <span className="text-sm mt-0.5 shrink-0">🕐</span>
                    <p className="text-xs text-amber-200/90 leading-relaxed">
                      {chatSettings.offlineMessage}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex-1 overflow-hidden">
            {viewState === 'conversations' && (
              <ConversationListView
                conversations={customerConversations}
                isLoading={conversationsLoading}
                onSelectConversation={handleSelectConversation}
                onNewConversation={() => setViewState('start')}
              />
            )}
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
                isLoggedIn={isLoggedIn}
                onNameChange={setCustomerName}
                onEmailChange={setCustomerEmail}
                onSubjectChange={setSubject}
                onMessageChange={setInitialMessage}
                onTopicChange={setTopic}
                onOrderIdChange={setOrderId}
                onGameTitleChange={setGameTitle}
                onSubmit={handleStartConversation}
                onBackToList={isLoggedIn ? () => setViewState('conversations') : undefined}
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

/** Wrapped dengan ErrorBoundary untuk mencegah widget crash */
const LiveChatWidgetWithBoundary: React.FC<ChatWidgetProps> = (props) => (
  <ChatErrorBoundary fallbackMessage="Chat widget mengalami masalah">
    <LiveChatWidget {...props} />
  </ChatErrorBoundary>
);

export default LiveChatWidgetWithBoundary;
