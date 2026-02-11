/** Halaman admin untuk mengelola percakapan live chat dengan fitur realtime */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useToast } from '../../../components/Toast';
import { useDebounce } from '../../../hooks/useDebounce';
import { AdminHeroSection } from '../components/ui/AdminHeroSection';
import {
  adminListConversations,
  adminGetConversation,
  adminSendMessage,
  adminUpdateStatus,
  adminJoinConversation,
  adminLeaveConversation,
  adminGetActivityLogs,
  adminGetChatStatistics,
  adminMarkRead,
  adminSetTyping,
  adminStopTyping,
  adminGetCannedResponses,
  subscribeToMessages,
  subscribeToConversations,
  subscribeToTypingIndicators
} from '../../../services/chatService';
import type {
  ChatConversation,
  ChatMessage,
  ChatAdminParticipant,
  ChatActivityLog as ActivityLogType,
  ChatStatistics,
  ChatConversationStatus,
  ChatTypingIndicator as TypingIndicatorType,
  ChatCannedResponse
} from '../../../types/chat';

// Komponen sub-modules
import { type FilterStatus } from './chatHelpers';
import { ChatStatisticsCards } from './ChatStatisticsCards';
import { ChatConversationList } from './ChatConversationList';
import { ChatPanel } from './ChatPanel';

const AdminChatPage: React.FC = () => {
  const toast = useToast();
  
  // State percakapan
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<ChatAdminParticipant[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogType[]>([]);
  const [statistics, setStatistics] = useState<ChatStatistics | null>(null);
  
  // State loading
  const [loading, setLoading] = useState(true);
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
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubscribeMessagesRef = useRef<(() => void) | null>(null);
  const unsubscribeTypingRef = useRef<(() => void) | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  /** Muat daftar percakapan dari server */
  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminListConversations({
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 100
      });
      setConversations(result.conversations);
    } catch (err) {
      console.error('[AdminChat] Gagal memuat percakapan:', err);
      toast?.showToast('Gagal memuat percakapan', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);
  /** Muat statistik chat */
  const loadStatistics = useCallback(async () => {
    try {
      const stats = await adminGetChatStatistics();
      setStatistics(stats);
    } catch (err) {
      console.error('[AdminChat] Gagal memuat statistik:', err);
    }
  }, []);
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
    loadStatistics();
  }, [loadConversations, loadStatistics]);

  /** Langganan pembaruan percakapan secara realtime */
  useEffect(() => {
    const { unsubscribe } = subscribeToConversations((conv) => {
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === conv.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...conv };
          return updated;
        }
        return [conv, ...prev];
      });
    });
    return () => { unsubscribe(); };
  }, []);

  /** Langganan pesan untuk percakapan yang dipilih */
  useEffect(() => {
    if (selectedConversation?.id) {
      unsubscribeMessagesRef.current?.();
      const { unsubscribe } = subscribeToMessages(selectedConversation.id, (msg) => {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
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
      const { data } = await adminGetCannedResponses();
      if (data) setCannedResponses(data);
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

  /** Filter template respon cepat berdasarkan pencarian */
  const filteredCannedResponses = cannedResponses.filter(cr => {
    if (!cannedFilter) return cr.isActive;
    return cr.isActive && (
      cr.shortcut?.toLowerCase().includes(cannedFilter) ||
      cr.title.toLowerCase().includes(cannedFilter) ||
      cr.category?.toLowerCase().includes(cannedFilter)
    );
  });

  /** Filter percakapan berdasarkan pencarian */
  const filteredConversations = conversations.filter(conv => {
    if (debouncedSearch) {
      const search = debouncedSearch.toLowerCase();
      const matchName = conv.customerName?.toLowerCase().includes(search);
      const matchEmail = conv.customerEmail?.toLowerCase().includes(search);
      const matchSubject = conv.subject?.toLowerCase().includes(search);
      if (!matchName && !matchEmail && !matchSubject) return false;
    }
    return true;
  });

  /** Handler kirim pesan */
  const handleSendMessage = async (e: React.FormEvent) => {
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
        setMessages(prev => [...prev, result.message!]);
      }
    } catch (err: any) {
      toast?.showToast(err.message || 'Gagal mengirim pesan', 'error');
      setNewMessage(messageText);
    } finally {
      setSendingMessage(false);
    }
  };

  /** Handler ubah status percakapan */
  const handleStatusChange = async (status: ChatConversationStatus) => {
    if (!selectedConversation?.id) return;
    try {
      const result = await adminUpdateStatus(selectedConversation.id, status);
      if (result.error) {
        toast?.showToast(result.error, 'error');
        return;
      }
      setSelectedConversation(prev => prev ? { ...prev, status } : null);
      toast?.showToast(`Status diubah ke ${status}`, 'success');
      loadConversations();
    } catch (err: any) {
      toast?.showToast(err.message || 'Gagal mengubah status', 'error');
    }
  };

  /** Handler bergabung ke percakapan */
  const handleAssignToSelf = async () => {
    if (!selectedConversation?.id) return;
    try {
      const result = await adminJoinConversation(selectedConversation.id, 'participant');
      if (result.error) {
        toast?.showToast(result.error, 'error');
        return;
      }
      toast?.showToast('Berhasil bergabung ke percakapan', 'success');
      loadConversationDetails(selectedConversation.id);
    } catch (err: any) {
      toast?.showToast(err.message || 'Gagal bergabung', 'error');
    }
  };

  /** Handler keluar dari percakapan */
  const handleLeaveConversation = async () => {
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
  };

  /** Handler pilih percakapan dari daftar */
  const handleSelectConversation = useCallback((conv: ChatConversation) => {
    setSelectedConversation(conv);
    loadConversationDetails(conv.id);
    loadActivityLogs(conv.id);
  }, [loadConversationDetails, loadActivityLogs]);

  return (
    <div className="min-h-screen bg-[var(--admin-bg-pure)]">
      {/* Bagian Hero */}
      <AdminHeroSection
        title="Live Chat"
        subtitle="Kelola percakapan dengan pelanggan"
        badge="REALTIME"
        badgeColor="pink"
      />

      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Kartu Statistik */}
        {statistics && <ChatStatisticsCards statistics={statistics} />}

        {/* Konten Utama - Split View */}
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-400px)] min-h-[600px]">
          {/* Daftar Percakapan */}
          <ChatConversationList
            conversations={filteredConversations}
            selectedConversation={selectedConversation}
            loading={loading}
            statusFilter={statusFilter}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onStatusFilterChange={setStatusFilter}
            onSelectConversation={handleSelectConversation}
            onRefresh={loadConversations}
          />

          {/* Panel Chat */}
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
            onToggleCannedPicker={() => { setShowCannedPicker(!showCannedPicker); setCannedFilter(''); }}
            onCloseCannedPicker={() => setShowCannedPicker(false)}
            onStatusChange={handleStatusChange}
            onAssignToSelf={handleAssignToSelf}
            onLeaveConversation={handleLeaveConversation}
            onToggleActivityLog={() => setShowActivityLog(!showActivityLog)}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminChatPage;
