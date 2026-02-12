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
  adminGetMessages,
  incrementCannedResponseUsage,
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
import { useChatRealtime } from './hooks/useChatRealtime';
import { ChatErrorBoundary } from '../../../components/ChatErrorBoundary';

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
  
  // State infinite scroll pesan
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  /** Play suara notifikasi untuk pesan customer baru */
  const playNotificationSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(830, ctx.currentTime);
      osc.frequency.setValueAtTime(980, ctx.currentTime + 0.08);
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Browser tidak support Web Audio — abaikan
    }
  }, []);

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
        if (prev.length !== next.length) return next;
        if (next.length === 0) return prev; // Empty, no change needed
        
        // Optimized: cek hanya first & last item — likely change point
        const firstSame = prev[0].id === next[0].id &&
          prev[0].updatedAt === next[0].updatedAt &&
          prev[0].unreadCount === next[0].unreadCount;
        const lastSame = prev[prev.length - 1].id === next[next.length - 1].id &&
          prev[prev.length - 1].updatedAt === next[next.length - 1].updatedAt;
        
        if (firstSame && lastSame) return prev; // Most likely unchanged
        return next; // Something changed, update
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

  /** Muat detail percakapan yang dipilih — markRead fire-and-forget */
  const loadConversationDetails = useCallback(async (convId: string) => {
    setMessageLoading(true);
    try {
      const conv = await adminGetConversation(convId);
      if (conv) {
        setSelectedConversation(conv);
        setMessages(conv.messages || []);
        setParticipants(conv.participants || []);
        setHasMoreMessages((conv as any).hasMore ?? false);
        // Fire-and-forget: markRead tidak perlu ditunggu
        adminMarkRead(convId).catch(() => {});
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

  /** Silent polling setiap 60 detik + semua langganan realtime */
  useChatRealtime({
    selectedConversationId: selectedConversation?.id,
    playNotificationSound,
    setConversations,
    setMessages,
    setTypingUsers,
    loadConversations,
  });

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

  /** Handler pemilihan template respon cepat — increment usage tracking */
  const handleSelectCannedResponse = useCallback((response: ChatCannedResponse) => {
    setNewMessage(response.message);
    setShowCannedPicker(false);
    setCannedFilter('');
    messageInputRef.current?.focus();
    // Fire-and-forget: increment usage count di backend
    if (response.id) {
      incrementCannedResponseUsage(response.id).catch(() => {});
    }
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
  /** Handler kirim file — upload lalu kirim pesan dengan lampiran (gambar atau dokumen) */
  const handleSendImage = useCallback(async () => {
    if (!selectedFile || !selectedConversation?.id) return;
    setIsUploading(true);
    try {
      const uploadResult = await uploadChatAttachment(selectedConversation.id, selectedFile);
      if (!uploadResult.url) {
        toast?.showToast(uploadResult.error || 'Gagal mengunggah file', 'error');
        return;
      }
      // Deteksi tipe pesan: gambar vs dokumen
      const isImage = selectedFile.type.startsWith('image/');
      const result = await adminSendMessage(selectedConversation.id, '', {
        messageType: isImage ? 'image' : 'file',
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

  /** Handler ubah status percakapan — optimistic UI */
  const handleStatusChange = useCallback(async (status: ChatConversationStatus) => {
    if (!selectedConversation?.id) return;
    const prevStatus = selectedConversation.status;
    const convId = selectedConversation.id;

    // Optimistic: update UI dulu agar instant
    setSelectedConversation(prev => prev ? { ...prev, status } : null);
    setConversations(prev => prev.map(c => 
      c.id === convId ? { ...c, status } : c
    ));

    try {
      const result = await adminUpdateStatus(convId, status);
      if (result.error) {
        // Rollback jika gagal
        setSelectedConversation(prev => prev ? { ...prev, status: prevStatus } : null);
        setConversations(prev => prev.map(c => 
          c.id === convId ? { ...c, status: prevStatus } : c
        ));
        toast?.showToast(result.error, 'error');
        return;
      }
      toast?.showToast(`Status diubah ke ${status}`, 'success');
    } catch (err: any) {
      // Rollback jika error
      setSelectedConversation(prev => prev ? { ...prev, status: prevStatus } : null);
      setConversations(prev => prev.map(c => 
        c.id === convId ? { ...c, status: prevStatus } : c
      ));
      toast?.showToast(err.message || 'Gagal mengubah status', 'error');
    }
  }, [selectedConversation?.id, selectedConversation?.status, toast]);

  /** Handler tangani percakapan — optimistic UI, tanpa re-fetch */
  const handleAssignToSelf = useCallback(async () => {
    if (!selectedConversation?.id || !user?.id) return;
    const prevStatus = selectedConversation.status;
    const convId = selectedConversation.id;

    // Optimistic: update UI dulu agar instant
    setSelectedConversation(prev => prev ? { ...prev, status: 'assigned', assignedAdminId: user.id } : null);
    setConversations(prev => prev.map(c =>
      c.id === convId ? { ...c, status: 'assigned', assignedAdminId: user.id } : c
    ));
    toast?.showToast('Percakapan berhasil ditangani', 'success');

    try {
      const result = await adminAssignConversation(convId, user.id);
      if (result.error) {
        // Rollback jika gagal
        setSelectedConversation(prev => prev ? { ...prev, status: prevStatus, assignedAdminId: undefined } : null);
        setConversations(prev => prev.map(c =>
          c.id === convId ? { ...c, status: prevStatus, assignedAdminId: undefined } : c
        ));
        toast?.showToast(result.error, 'error');
        return;
      }
      // Refresh partisipan di background (non-blocking)
      loadActivityLogs(convId);
    } catch (err: any) {
      // Rollback jika error
      setSelectedConversation(prev => prev ? { ...prev, status: prevStatus, assignedAdminId: undefined } : null);
      setConversations(prev => prev.map(c =>
        c.id === convId ? { ...c, status: prevStatus, assignedAdminId: undefined } : c
      ));
      toast?.showToast(err.message || 'Gagal menangani percakapan', 'error');
    }
  }, [selectedConversation?.id, selectedConversation?.status, user?.id, toast, loadActivityLogs]);

  /** Handler keluar dari percakapan — optimistic UI */
  const handleLeaveConversation = useCallback(async () => {
    if (!selectedConversation?.id) return;
    const convId = selectedConversation.id;

    // Optimistic: update status ke 'open' karena admin keluar
    setSelectedConversation(prev => prev ? { ...prev, status: 'open', assignedAdminId: undefined } : null);
    setConversations(prev => prev.map(c =>
      c.id === convId ? { ...c, status: 'open', assignedAdminId: undefined } : c
    ));
    toast?.showToast('Berhasil keluar dari percakapan', 'success');

    try {
      const result = await adminLeaveConversation(convId);
      if (result.error) {
        toast?.showToast(result.error, 'error');
        // Jangan rollback karena backend state mungkin sudah berubah
        // Reload untuk sinkronisasi
        loadConversationDetails(convId);
        return;
      }
      // Refresh activity log
      loadActivityLogs(convId);
    } catch (err: any) {
      toast?.showToast(err.message || 'Gagal keluar', 'error');
      loadConversationDetails(convId);
    }
  }, [selectedConversation?.id, toast, loadConversationDetails, loadActivityLogs]);

  /** Handler muat pesan lebih lama — cursor-based pagination */
  const handleLoadOlderMessages = useCallback(async () => {
    if (!selectedConversation?.id || loadingMoreMessages || !hasMoreMessages) return;
    if (messages.length === 0) return;

    setLoadingMoreMessages(true);
    try {
      // Gunakan created_at pesan tertua sebagai cursor
      const oldestMessage = messages[0];
      const result = await adminGetMessages(selectedConversation.id, {
        limit: 50,
        before: oldestMessage.createdAt
      });
      if (result.messages.length > 0) {
        setMessages(prev => [...result.messages, ...prev]);
      }
      setHasMoreMessages(result.hasMore);
    } catch (err) {
      console.error('[AdminChat] Gagal memuat pesan lama:', err);
      toast?.showToast('Gagal memuat pesan sebelumnya', 'error');
    } finally {
      setLoadingMoreMessages(false);
    }
  }, [selectedConversation?.id, loadingMoreMessages, hasMoreMessages, messages, toast]);

  /** Handler pilih percakapan dari daftar — paralel fetch */
  const handleSelectConversation = useCallback((conv: ChatConversation) => {
    setSelectedConversation(conv);
    setSelectedFile(null); // Reset file saat pindah percakapan
    // Reset unread count di daftar percakapan karena akan di-markRead
    setConversations(prev => prev.map(c =>
      c.id === conv.id ? { ...c, unreadCount: 0 } : c
    ));
    // Paralel: fetch detail + activity logs bersamaan
    Promise.all([
      loadConversationDetails(conv.id),
      loadActivityLogs(conv.id)
    ]);
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
      hasMore={hasMoreMessages}
      loadingMore={loadingMoreMessages}
      onLoadMore={handleLoadOlderMessages}
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

/** Wrapped dengan ErrorBoundary untuk mencegah white screen */
const AdminChatPageWithBoundary: React.FC = () => (
  <ChatErrorBoundary fallbackMessage="Terjadi kesalahan pada halaman chat admin">
    <AdminChatPage />
  </ChatErrorBoundary>
);

export default AdminChatPageWithBoundary;
