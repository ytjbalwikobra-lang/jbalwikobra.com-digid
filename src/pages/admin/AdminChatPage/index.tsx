/** Halaman admin untuk mengelola percakapan live chat dengan fitur realtime */

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useToast } from '../../../components/Toast';
import { useDebounce } from '../../../hooks/useDebounce';
import { useAuth } from '../../../contexts/TraditionalAuthContext';
import {
  adminListConversations,
  adminGetConversation,
  adminSendMessage,
  adminUpdateStatus,
  adminAssignConversation,
  adminLeaveConversation,
  adminGetActivityLogs,
  adminMarkRead,
  adminSetTyping,
  adminStopTyping,
  adminGetCannedResponses,
  subscribeToMessages,
  subscribeToAllMessages,
  subscribeToConversations,
  subscribeToTypingIndicators,
  uploadChatAttachment
} from '../../../services/chatService';
import type {
  ChatConversation,
  ChatMessage,
  ChatAdminParticipant,
  ChatActivityLog as ActivityLogType,
  ChatConversationStatus,
  ChatTypingIndicator as TypingIndicatorType,
  ChatCannedResponse
} from '../../../types/chat';

// Komponen sub-modules
import { type FilterStatus } from './chatHelpers';
import { ChatConversationList } from './ChatConversationList';
import { ChatPanel } from './ChatPanel';

const AdminChatPage: React.FC = () => {
  const toast = useToast();
  const { user } = useAuth();
  
  // State percakapan
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<ChatAdminParticipant[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogType[]>([]);
  // Statistik tidak ditampilkan di layout baru
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  
  // State loading — pisah antara initial load vs background refresh
  const [initialLoading, setInitialLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // State filter dan pencarian
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  
  // State input pesan
  const [newMessage, setNewMessage] = useState('');
  const [showActivityLog, setShowActivityLog] = useState(false);
  
  // State indikator mengetik
  const [typingUsers, setTypingUsers] = useState<TypingIndicatorType[]>([]);
  
  // State template respon cepat
  const [cannedResponses, setCannedResponses] = useState<ChatCannedResponse[]>([]);
  const [showCannedPicker, setShowCannedPicker] = useState(false);
  const [cannedFilter, setCannedFilter] = useState('');
  
  // State lampiran gambar
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubscribeMessagesRef = useRef<(() => void) | null>(null);
  const unsubscribeTypingRef = useRef<(() => void) | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const isFirstLoadRef = useRef(true);

  // Deteksi breakpoint: mobile (<640px), tablet (640-1023px), desktop (≥1024px)
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setIsMobile(w < 640);
      setIsTablet(w >= 640 && w < 1024);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setShowMobileDetail(false);
    }
  }, [isMobile]);

  /** Muat daftar percakapan — tanpa flicker saat background refresh */
  const loadConversations = useCallback(async () => {
    // Hanya tampilkan spinner pada initial load pertama kali
    if (isFirstLoadRef.current) {
      setInitialLoading(true);
    }
    try {
      const result = await adminListConversations({
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 100
      });
      
      // Log untuk debugging jika list kosong padahal seharusnya ada
      if (result.conversations.length === 0 && isFirstLoadRef.current) {
        console.warn('[AdminChat] API returned 0 conversations. total:', result.total);
      }
      
      // Smart merge: hanya update state jika data berubah — hindari re-render percuma
      setConversations(prev => {
        const next = result.conversations;
        if (prev.length === next.length && next.length > 0) {
          const isSame = prev.every((p, i) =>
            p.id === next[i].id &&
            p.updatedAt === next[i].updatedAt &&
            p.unreadCount === next[i].unreadCount &&
            p.status === next[i].status &&
            p.lastMessageAt === next[i].lastMessageAt
          );
          if (isSame) return prev;
        }
        return next;
      });
    } catch (err) {
      console.error('[AdminChat] Gagal memuat percakapan:', err);
      // Hanya tampilkan toast pada error, bukan setiap poll
      if (isFirstLoadRef.current) {
        toast?.showToast('Gagal memuat percakapan', 'error');
      }
    } finally {
      setInitialLoading(false);
      isFirstLoadRef.current = false;
    }
  }, [statusFilter, toast]);

  /** Muat detail percakapan yang dipilih */
  const loadConversationDetails = useCallback(async (convId: string) => {
    setMessageLoading(true);
    try {
      const conv = await adminGetConversation(convId);
      if (conv) {
        setSelectedConversation(conv);
        setMessages(conv.messages || []);
        setParticipants(conv.participants || []);
        await adminMarkRead(convId);
      }
    } catch (err) {
      console.error('[AdminChat] Gagal memuat detail percakapan:', err);
      toast?.showToast('Gagal memuat percakapan', 'error');
    } finally {
      setMessageLoading(false);
    }
  }, [toast]);

  /** Muat log aktivitas percakapan */
  const loadActivityLogs = useCallback(async (convId: string) => {
    try {
      const logs = await adminGetActivityLogs(convId);
      setActivityLogs(logs);
    } catch (err) {
      console.error('[AdminChat] Gagal memuat log aktivitas:', err);
    }
  }, []);

  /** Muat data awal saat komponen dimount */
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  /** Silent polling setiap 15 detik — tanpa spinner, data di-update di background */
  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations();
    }, 15000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  /** Langganan pembaruan percakapan secara realtime */
  useEffect(() => {
    const { unsubscribe } = subscribeToConversations((conv) => {
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === conv.id);
        if (idx >= 0) {
          const updated = [...prev];
          // Pertahankan lastMessage dan unreadCount dari state lokal jika realtime tidak punya
          updated[idx] = {
            ...updated[idx],
            ...conv,
            lastMessage: conv.lastMessage || updated[idx].lastMessage,
            unreadCount: conv.unreadCount ?? updated[idx].unreadCount
          };
          return updated;
        }
        return [conv, ...prev];
      });
    });
    return () => { unsubscribe(); };
  }, []);

  /** Langganan SEMUA pesan baru untuk update preview di daftar percakapan */
  useEffect(() => {
    const { unsubscribe } = subscribeToAllMessages((msg) => {
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === msg.conversationId);
        if (idx < 0) return prev; // Percakapan tidak ada di list — abaikan
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          lastMessage: msg,
          lastMessageAt: msg.createdAt,
          // Increment unread hanya jika pesan dari customer
          unreadCount: msg.senderType !== 'admin'
            ? (updated[idx].unreadCount || 0) + 1
            : updated[idx].unreadCount
        };
        // Pindahkan ke atas list (pesan terbaru)
        const [moved] = updated.splice(idx, 1);
        updated.unshift(moved);
        return updated;
      });
    });
    return () => { unsubscribe(); };
  }, []);

  /** Langganan pesan untuk percakapan yang dipilih */
  useEffect(() => {
    if (selectedConversation?.id) {
      unsubscribeMessagesRef.current?.();
      const { unsubscribe } = subscribeToMessages(selectedConversation.id, (msg) => {
        // Tambahkan pesan ke daftar pesan percakapan aktif
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        
        // Update preview pesan terakhir di daftar percakapan
        setConversations(prev => prev.map(c => {
          if (c.id !== msg.conversationId) return c;
          return {
            ...c,
            lastMessage: msg,
            lastMessageAt: msg.createdAt,
            // Increment unread jika pesan dari customer dan bukan percakapan aktif
            unreadCount: msg.senderType !== 'admin'
              ? (c.unreadCount || 0) + 1
              : c.unreadCount
          };
        }));
      });
      unsubscribeMessagesRef.current = unsubscribe;
      return () => { unsubscribe(); };
    }
  }, [selectedConversation?.id]);

  /** Langganan indikator mengetik untuk percakapan yang dipilih */
  useEffect(() => {
    if (selectedConversation?.id) {
      unsubscribeTypingRef.current?.();
      const { unsubscribe } = subscribeToTypingIndicators(selectedConversation.id, (indicators) => {
        setTypingUsers(indicators.filter(i => i.userType !== 'admin'));
      });
      unsubscribeTypingRef.current = unsubscribe;
      return () => { unsubscribe(); setTypingUsers([]); };
    }
  }, [selectedConversation?.id]);

  /** Muat template respon cepat saat komponen dimount */
  useEffect(() => {
    const loadCanned = async () => {
      const responses = await adminGetCannedResponses();
      if (Array.isArray(responses)) {
        setCannedResponses(responses);
      }
    };
    loadCanned();
  }, []);

  /** Scroll ke bawah saat ada pesan baru */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /** Handler perubahan input pesan dengan deteksi shortcut template */
  const handleMessageInputChange = useCallback((value: string) => {
    setNewMessage(value);
    
    // Deteksi shortcut template (diawali /)
    if (value.startsWith('/') && value.length > 1) {
      setCannedFilter(value.slice(1).toLowerCase());
      setShowCannedPicker(true);
    } else {
      setShowCannedPicker(false);
      setCannedFilter('');
    }
    
    // Kirim indikator mengetik
    if (selectedConversation?.id && value.trim()) {
      adminSetTyping(selectedConversation.id);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (selectedConversation?.id) {
          adminStopTyping(selectedConversation.id);
        }
      }, 3000);
    }
  }, [selectedConversation?.id]);

  /** Handler pemilihan template respon cepat */
  const handleSelectCannedResponse = useCallback((response: ChatCannedResponse) => {
    setNewMessage(response.message);
    setShowCannedPicker(false);
    setCannedFilter('');
    messageInputRef.current?.focus();
  }, []);

  /** Filter template respon cepat berdasarkan pencarian — dimemoize */
  const filteredCannedResponses = useMemo(() => 
    (Array.isArray(cannedResponses) ? cannedResponses : []).filter(cr => {
      // Kompatibel snake_case (is_active) dan camelCase (isActive)
      const active = cr.isActive ?? (cr as any).is_active ?? true;
      if (!cannedFilter) return active;
      return active && (
        cr.shortcut?.toLowerCase().includes(cannedFilter) ||
        cr.title?.toLowerCase().includes(cannedFilter) ||
        cr.category?.toLowerCase().includes(cannedFilter)
      );
    }), [cannedResponses, cannedFilter]);

  /** Filter percakapan berdasarkan pencarian — dimemoize */
  const filteredConversations = useMemo(() =>
    (Array.isArray(conversations) ? conversations : []).filter(conv => {
      if (debouncedSearch) {
        const search = debouncedSearch.toLowerCase();
        const matchName = conv.customerName?.toLowerCase().includes(search);
        const matchEmail = conv.customerEmail?.toLowerCase().includes(search);
        const matchSubject = conv.subject?.toLowerCase().includes(search);
        if (!matchName && !matchEmail && !matchSubject) return false;
      }
      return true;
    }), [conversations, debouncedSearch]);

  /** Handler kirim pesan */
  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation?.id) return;
    
    const messageText = newMessage.trim();
    setNewMessage('');
    setShowCannedPicker(false);
    setSendingMessage(true);
    
    adminStopTyping(selectedConversation.id);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    try {
      const result = await adminSendMessage(selectedConversation.id, messageText);
      if (result.error) {
        toast?.showToast(result.error, 'error');
        setNewMessage(messageText);
        return;
      }
      if (result.message) {
        setMessages(prev => {
          if (prev.some(m => m.id === result.message!.id)) return prev;
          return [...prev, result.message!];
        });
      }
    } catch (err: any) {
      toast?.showToast(err.message || 'Gagal mengirim pesan', 'error');
      setNewMessage(messageText);
    } finally {
      setSendingMessage(false);
    }
  }, [newMessage, selectedConversation?.id, toast]);

  /** Handler kirim gambar — upload lalu kirim pesan dengan lampiran */
  const handleSendImage = useCallback(async () => {
    if (!selectedFile || !selectedConversation?.id) return;
    setIsUploading(true);
    try {
      const uploadResult = await uploadChatAttachment(selectedConversation.id, selectedFile);
      if (!uploadResult.url) {
        toast?.showToast(uploadResult.error || 'Gagal mengunggah gambar', 'error');
        return;
      }
      const result = await adminSendMessage(selectedConversation.id, '', {
        messageType: 'image',
        attachmentUrl: uploadResult.url,
        attachmentName: selectedFile.name,
        attachmentType: selectedFile.type
      });
      if (result.error) {
        toast?.showToast(result.error, 'error');
        return;
      }
      if (result.message) {
        setMessages(prev => {
          if (prev.some(m => m.id === result.message!.id)) return prev;
          return [...prev, result.message!];
        });
      }
      setSelectedFile(null);
    } catch (err: any) {
      toast?.showToast(err.message || 'Gagal mengirim gambar', 'error');
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, selectedConversation?.id, toast]);

  /** Handler ubah status percakapan */
  const handleStatusChange = useCallback(async (status: ChatConversationStatus) => {
    if (!selectedConversation?.id) return;
    try {
      const result = await adminUpdateStatus(selectedConversation.id, status);
      if (result.error) {
        toast?.showToast(result.error, 'error');
        return;
      }
      setSelectedConversation(prev => prev ? { ...prev, status } : null);
      // Update juga di daftar percakapan langsung tanpa full reload
      setConversations(prev => prev.map(c => 
        c.id === selectedConversation.id ? { ...c, status } : c
      ));
      toast?.showToast(`Status diubah ke ${status}`, 'success');
    } catch (err: any) {
      toast?.showToast(err.message || 'Gagal mengubah status', 'error');
    }
  }, [selectedConversation?.id, toast]);

  /** Handler tangani percakapan — assign ke diri sendiri */
  const handleAssignToSelf = useCallback(async () => {
    if (!selectedConversation?.id || !user?.id) return;
    try {
      const result = await adminAssignConversation(selectedConversation.id, user.id);
      if (result.error) {
        toast?.showToast(result.error, 'error');
        return;
      }
      // Update status lokal ke 'assigned'
      setSelectedConversation(prev => prev ? { ...prev, status: 'assigned', assignedAdminId: user.id } : null);
      setConversations(prev => prev.map(c =>
        c.id === selectedConversation.id ? { ...c, status: 'assigned', assignedAdminId: user.id } : c
      ));
      toast?.showToast('Percakapan berhasil ditangani', 'success');
      loadConversationDetails(selectedConversation.id);
    } catch (err: any) {
      toast?.showToast(err.message || 'Gagal menangani percakapan', 'error');
    }
  }, [selectedConversation?.id, user?.id, toast, loadConversationDetails]);

  /** Handler keluar dari percakapan */
  const handleLeaveConversation = useCallback(async () => {
    if (!selectedConversation?.id) return;
    try {
      const result = await adminLeaveConversation(selectedConversation.id);
      if (result.error) {
        toast?.showToast(result.error, 'error');
        return;
      }
      toast?.showToast('Berhasil keluar dari percakapan', 'success');
      loadConversationDetails(selectedConversation.id);
    } catch (err: any) {
      toast?.showToast(err.message || 'Gagal keluar', 'error');
    }
  }, [selectedConversation?.id, toast, loadConversationDetails]);

  /** Handler pilih percakapan dari daftar */
  const handleSelectConversation = useCallback((conv: ChatConversation) => {
    setSelectedConversation(conv);
    setSelectedFile(null); // Reset file saat pindah percakapan
    loadConversationDetails(conv.id);
    loadActivityLogs(conv.id);
    // Reset unread count di daftar percakapan karena akan di-markRead
    setConversations(prev => prev.map(c =>
      c.id === conv.id ? { ...c, unreadCount: 0 } : c
    ));
    if (isMobile) {
      setShowMobileDetail(true);
    }
  }, [loadConversationDetails, loadActivityLogs, isMobile]);

  /** Toggle canned picker — stabil referensi */
  const handleToggleCannedPicker = useCallback(() => {
    setShowCannedPicker(prev => !prev);
    setCannedFilter('');
  }, []);

  const handleCloseCannedPicker = useCallback(() => setShowCannedPicker(false), []);
  const handleToggleActivityLog = useCallback(() => setShowActivityLog(prev => !prev), []);

  const listPane = (
    <ChatConversationList
      conversations={filteredConversations}
      selectedConversation={selectedConversation}
      loading={initialLoading}
      statusFilter={statusFilter}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      onStatusFilterChange={setStatusFilter}
      onSelectConversation={handleSelectConversation}
      onRefresh={loadConversations}
    />
  );

  const detailPane = (
    <ChatPanel
      selectedConversation={selectedConversation}
      messages={messages}
      participants={participants}
      activityLogs={activityLogs}
      messageLoading={messageLoading}
      sendingMessage={sendingMessage}
      typingUsers={typingUsers}
      newMessage={newMessage}
      showActivityLog={showActivityLog}
      showCannedPicker={showCannedPicker}
      filteredCannedResponses={filteredCannedResponses}
      cannedResponses={cannedResponses}
      messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
      messageInputRef={messageInputRef as React.RefObject<HTMLInputElement>}
      onMessageChange={handleMessageInputChange}
      onSendMessage={handleSendMessage}
      onSelectCannedResponse={handleSelectCannedResponse}
      onToggleCannedPicker={handleToggleCannedPicker}
      onCloseCannedPicker={handleCloseCannedPicker}
      selectedFile={selectedFile}
      isUploading={isUploading}
      onFileSelect={setSelectedFile}
      onSendImage={handleSendImage}
      onStatusChange={handleStatusChange}
      onAssignToSelf={handleAssignToSelf}
      onLeaveConversation={handleLeaveConversation}
      onToggleActivityLog={handleToggleActivityLog}
      onBack={isMobile ? () => setShowMobileDetail(false) : undefined}
    />
  );

  return (
    <>
      {/* Hero — hidden pada mobile agar chat full-screen */}
      {!isMobile && (
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-base lg:text-lg font-bold text-[var(--admin-text)]">Live Chat</h1>
            <p className="text-[11px] text-[var(--admin-text-secondary)] mt-0.5">
              {conversations.length > 0
                ? `${conversations.length} percakapan aktif`
                : 'Kelola percakapan pelanggan'
              }
            </p>
          </div>
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--admin-success)]/10 border border-[var(--admin-success)]/20 rounded-full">
            <span className="w-1.5 h-1.5 bg-[var(--admin-success)] rounded-full animate-pulse" />
            <span className="text-[11px] font-medium text-[var(--admin-success)]">Realtime</span>
          </span>
        </div>
      )}

      {/* Layout Utama — three-tier responsive */}
      {isMobile ? (
        /* Mobile: full-screen single panel, edge-to-edge */
        <div className="h-[calc(100dvh-76px)] -mx-3 -mb-3">
          {showMobileDetail ? detailPane : listPane}
        </div>
      ) : (
        /* Tablet & Desktop: side-by-side panels */
        <div className={`flex gap-3 ${isTablet ? 'h-[calc(100dvh-128px)]' : 'h-[calc(100vh-160px)]'}`}>
          <div className={`shrink-0 ${isTablet ? 'w-[280px]' : 'w-[380px]'}`}>
            {listPane}
          </div>
          <div className="flex-1 min-w-0">
            {detailPane}
          </div>
        </div>
      )}
    </>
  );
};

export default AdminChatPage;
