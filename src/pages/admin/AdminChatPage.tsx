/**
 * AdminChatPage.tsx
 * 
 * Admin panel page for managing live chat conversations.
 * Features:
 * - List all conversations with status filters
 * - Real-time message updates
 * - Multi-admin participation
 * - Activity logging
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  MessageSquare,
  Search,
  RefreshCw,
  Send,
  UserPlus,
  UserMinus,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  BarChart2,
  Star,
  History,
  Zap
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useToast } from '../../components/Toast';
import { useDebounce } from '../../hooks/useDebounce';
import { AdminButton } from './components/ui/AdminButton';
import { AdminLoadingState } from './components/ui/AdminLoadingState';
import { AdminEmptyState } from './components/ui/AdminEmptyState';
import { AdminBentoMetricCard } from './components/ui/AdminBentoCard';
import { AdminHeroSection } from './components/ui/AdminHeroSection';
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
} from '../../services/chatService';
import type {
  ChatConversation,
  ChatMessage,
  ChatAdminParticipant,
  ChatActivityLog,
  ChatStatistics,
  ChatConversationStatus,
  ChatTypingIndicator,
  ChatCannedResponse
} from '../../types/chat';

type FilterStatus = 'all' | ChatConversationStatus;

const STATUS_OPTIONS: { value: FilterStatus; label: string; color: string }[] = [
  { value: 'all', label: 'Semua', color: 'var(--admin-text)' },
  { value: 'open', label: 'Baru', color: 'var(--admin-info)' },
  { value: 'assigned', label: 'Ditangani', color: 'var(--admin-warning)' },
  { value: 'resolved', label: 'Selesai', color: 'var(--admin-success)' },
  { value: 'closed', label: 'Ditutup', color: 'var(--admin-text-muted)' }
];

// Simple date formatter without date-fns
const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Helper function for activity labels
function getActivityLabel(action: string): string {
  const labels: Record<string, string> = {
    'conversation_started': 'memulai percakapan',
    'conversation_assigned': 'mengambil alih percakapan',
    'conversation_reassigned': 'mengalihkan percakapan',
    'conversation_resolved': 'menyelesaikan percakapan',
    'conversation_closed': 'menutup percakapan',
    'conversation_reopened': 'membuka kembali percakapan',
    'message_sent': 'mengirim pesan',
    'message_read': 'membaca pesan',
    'admin_joined': 'bergabung ke percakapan',
    'admin_left': 'keluar dari percakapan',
    'file_uploaded': 'mengunggah file',
    'rating_submitted': 'memberikan rating'
  };
  return labels[action] || action;
}

const AdminChatPage: React.FC = () => {
  const toast = useToast();
  
  // State
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<ChatAdminParticipant[]>([]);
  const [activityLogs, setActivityLogs] = useState<ChatActivityLog[]>([]);
  const [statistics, setStatistics] = useState<ChatStatistics | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  
  const [newMessage, setNewMessage] = useState('');
  const [showActivityLog, setShowActivityLog] = useState(false);
  
  // Typing indicators state
  const [typingUsers, setTypingUsers] = useState<ChatTypingIndicator[]>([]);
  
  // Canned responses state
  const [cannedResponses, setCannedResponses] = useState<ChatCannedResponse[]>([]);
  const [showCannedPicker, setShowCannedPicker] = useState(false);
  const [cannedFilter, setCannedFilter] = useState('');
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubscribeMessagesRef = useRef<(() => void) | null>(null);
  const unsubscribeTypingRef = useRef<(() => void) | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  // Load conversations
  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminListConversations({
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 100
      });
      setConversations(result.conversations);
    } catch (err) {
      console.error('Failed to load conversations:', err);
      toast?.showToast('Gagal memuat percakapan', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  // Load statistics
  const loadStatistics = useCallback(async () => {
    try {
      const stats = await adminGetChatStatistics();
      setStatistics(stats);
    } catch (err) {
      console.error('Failed to load statistics:', err);
    }
  }, []);

  // Load conversation details
  const loadConversationDetails = useCallback(async (convId: string) => {
    setMessageLoading(true);
    try {
      const conv = await adminGetConversation(convId);
      if (conv) {
        setSelectedConversation(conv);
        setMessages(conv.messages || []);
        setParticipants(conv.participants || []);
        
        // Mark as read
        await adminMarkRead(convId);
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
      toast?.showToast('Gagal memuat percakapan', 'error');
    } finally {
      setMessageLoading(false);
    }
  }, [toast]);

  // Load activity logs
  const loadActivityLogs = useCallback(async (convId: string) => {
    try {
      const logs = await adminGetActivityLogs(convId);
      setActivityLogs(logs);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadConversations();
    loadStatistics();
  }, [loadConversations, loadStatistics]);

  // Subscribe to conversation updates
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
    
    return () => {
      unsubscribe();
    };
  }, []);

  // Subscribe to messages for selected conversation
  useEffect(() => {
    if (selectedConversation?.id) {
      // Unsubscribe from previous
      unsubscribeMessagesRef.current?.();
      
      const { unsubscribe } = subscribeToMessages(selectedConversation.id, (msg) => {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      });
      
      unsubscribeMessagesRef.current = unsubscribe;
      
      return () => {
        unsubscribe();
      };
    }
  }, [selectedConversation?.id]);

  // Subscribe to typing indicators for selected conversation
  useEffect(() => {
    if (selectedConversation?.id) {
      unsubscribeTypingRef.current?.();
      
      const { unsubscribe } = subscribeToTypingIndicators(selectedConversation.id, (indicators) => {
        // Only show non-admin typing (customer typing)
        setTypingUsers(indicators.filter(i => i.userType !== 'admin'));
      });
      
      unsubscribeTypingRef.current = unsubscribe;
      
      return () => {
        unsubscribe();
        setTypingUsers([]);
      };
    }
  }, [selectedConversation?.id]);

  // Load canned responses on mount
  useEffect(() => {
    const loadCannedResponses = async () => {
      const { data } = await adminGetCannedResponses();
      if (data) setCannedResponses(data);
    };
    loadCannedResponses();
  }, []);

  // Handle admin typing indicator
  const handleMessageInputChange = useCallback((value: string) => {
    setNewMessage(value);
    
    // Check for canned response shortcut (starts with /)
    if (value.startsWith('/') && value.length > 1) {
      setCannedFilter(value.slice(1).toLowerCase());
      setShowCannedPicker(true);
    } else {
      setShowCannedPicker(false);
      setCannedFilter('');
    }
    
    // Send typing indicator
    if (selectedConversation?.id && value.trim()) {
      adminSetTyping(selectedConversation.id);
      
      // Auto-stop typing after 3 seconds of inactivity
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (selectedConversation?.id) {
          adminStopTyping(selectedConversation.id);
        }
      }, 3000);
    }
  }, [selectedConversation?.id]);

  // Insert canned response
  const handleSelectCannedResponse = useCallback((response: ChatCannedResponse) => {
    setNewMessage(response.message);
    setShowCannedPicker(false);
    setCannedFilter('');
    messageInputRef.current?.focus();
  }, []);

  // Filtered canned responses for picker
  const filteredCannedResponses = cannedResponses.filter(cr => {
    if (!cannedFilter) return cr.isActive;
    return cr.isActive && (
      cr.shortcut?.toLowerCase().includes(cannedFilter) ||
      cr.title.toLowerCase().includes(cannedFilter) ||
      cr.category?.toLowerCase().includes(cannedFilter)
    );
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Filter conversations
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

  // Handle send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation?.id) return;
    
    const messageText = newMessage.trim();
    setNewMessage('');
    setShowCannedPicker(false);
    setSendingMessage(true);
    
    // Stop typing indicator
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

  // Handle status change
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

  // Handle assign to self
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

  // Handle leave conversation
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

  // Get status badge
  const getStatusBadge = (status: ChatConversationStatus) => {
    const option = STATUS_OPTIONS.find(o => o.value === status);
    return (
      <span
        className="px-2 py-0.5 text-xs font-medium rounded-full"
        style={{
          backgroundColor: `color-mix(in srgb, ${option?.color || 'var(--admin-text)'} 15%, transparent)`,
          color: option?.color || 'var(--admin-text)'
        }}
      >
        {option?.label || status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--admin-bg-pure)]">
      {/* Hero Section */}
      <AdminHeroSection
        title="Live Chat"
        subtitle="Kelola percakapan dengan pelanggan"
        badge="REALTIME"
        badgeColor="pink"
      />

      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <AdminBentoMetricCard
              label="Total Chat"
              value={statistics.totalConversations}
              icon={<MessageSquare className="w-5 h-5 text-[var(--admin-accent)]" />}
            />
            <AdminBentoMetricCard
              label="Menunggu"
              value={statistics.openConversations}
              icon={<Clock className="w-5 h-5 text-[var(--admin-info)]" />}
            />
            <AdminBentoMetricCard
              label="Rating Rata-rata"
              value={statistics.averageRating?.toFixed(1) || '-'}
              icon={<Star className="w-5 h-5 text-[var(--admin-warning)]" />}
            />
            <AdminBentoMetricCard
              label="Total Rating"
              value={statistics.ratingsCount}
              icon={<BarChart2 className="w-5 h-5 text-[var(--admin-success)]" />}
            />
          </div>
        )}

        {/* Main Content - Split View */}
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-400px)] min-h-[600px]">
          {/* Conversation List */}
          <div className="col-span-12 md:col-span-4 bg-[var(--admin-bg-card)] rounded-xl border border-[var(--admin-border)] flex flex-col overflow-hidden">
            {/* List Header */}
            <div className="p-4 border-b border-[var(--admin-border)]">
              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--admin-text-muted)]" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari percakapan..."
                    className="w-full pl-9 pr-3 py-2 bg-[var(--admin-bg-surface)] border border-[var(--admin-border)] rounded-lg text-sm text-[var(--admin-text)] placeholder-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-accent)]"
                  />
                </div>
                <button
                  onClick={loadConversations}
                  className="p-2 rounded-lg bg-[var(--admin-bg-surface)] hover:bg-[var(--admin-bg-elevated)] text-[var(--admin-text-secondary)] transition-colors"
                  aria-label="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              
              {/* Status Filter */}
              <div className="flex gap-1 overflow-x-auto">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setStatusFilter(option.value)}
                    className={cn(
                      'px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors',
                      statusFilter === option.value
                        ? 'bg-[var(--admin-accent)] text-white'
                        : 'bg-[var(--admin-bg-surface)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-elevated)]'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <AdminLoadingState message="Memuat percakapan..." />
              ) : filteredConversations.length === 0 ? (
                <AdminEmptyState
                  icon={<MessageSquare className="w-12 h-12" />}
                  title="Tidak ada percakapan"
                  description="Belum ada percakapan yang sesuai filter"
                />
              ) : (
                <div className="divide-y divide-[var(--admin-border)]">
                  {filteredConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setSelectedConversation(conv);
                        loadConversationDetails(conv.id);
                        loadActivityLogs(conv.id);
                      }}
                      className={cn(
                        'w-full p-4 text-left hover:bg-[var(--admin-bg-surface)] transition-colors',
                        selectedConversation?.id === conv.id && 'bg-[var(--admin-bg-surface)]'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-medium text-[var(--admin-text)] truncate">
                          {conv.customerName || conv.customerEmail || 'Anonymous'}
                        </span>
                        {getStatusBadge(conv.status)}
                      </div>
                      {conv.subject && (
                        <p className="text-sm text-[var(--admin-text-secondary)] truncate mb-1">
                          {conv.subject}
                        </p>
                      )}
                      <p className="text-xs text-[var(--admin-text-muted)]">
                        {formatDate(conv.lastMessageAt || conv.createdAt)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chat Panel */}
          <div className="col-span-12 md:col-span-8 bg-[var(--admin-bg-card)] rounded-xl border border-[var(--admin-border)] flex flex-col overflow-hidden">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-[var(--admin-border)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-[var(--admin-text)]">
                        {selectedConversation.customerName || selectedConversation.customerEmail}
                      </h3>
                      <p className="text-sm text-[var(--admin-text-secondary)]">
                        {selectedConversation.customerEmail}
                        {selectedConversation.customerPhone && ` • ${selectedConversation.customerPhone}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Status Actions */}
                      {selectedConversation.status === 'open' && (
                        <AdminButton
                          variant="primary"
                          size="sm"
                          icon={<UserPlus className="w-4 h-4" />}
                          onClick={handleAssignToSelf}
                        >
                          Tangani
                        </AdminButton>
                      )}
                      {selectedConversation.status === 'assigned' && (
                        <>
                          <AdminButton
                            variant="success"
                            size="sm"
                            icon={<CheckCircle className="w-4 h-4" />}
                            onClick={() => handleStatusChange('resolved')}
                          >
                            Selesai
                          </AdminButton>
                          <AdminButton
                            variant="ghost"
                            size="sm"
                            icon={<UserMinus className="w-4 h-4" />}
                            onClick={handleLeaveConversation}
                          >
                            Keluar
                          </AdminButton>
                        </>
                      )}
                      {selectedConversation.status === 'resolved' && (
                        <AdminButton
                          variant="ghost"
                          size="sm"
                          icon={<XCircle className="w-4 h-4" />}
                          onClick={() => handleStatusChange('closed')}
                        >
                          Tutup
                        </AdminButton>
                      )}
                      
                      {/* Activity Log Toggle */}
                      <button
                        onClick={() => setShowActivityLog(!showActivityLog)}
                        className={cn(
                          'p-2 rounded-lg transition-colors',
                          showActivityLog
                            ? 'bg-[var(--admin-accent)] text-white'
                            : 'bg-[var(--admin-bg-surface)] text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-elevated)]'
                        )}
                        aria-label="Toggle activity log"
                      >
                        <History className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Participants */}
                  {participants.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <Users className="w-4 h-4 text-[var(--admin-text-muted)]" />
                      <span className="text-xs text-[var(--admin-text-muted)]">
                        {participants.map(p => p.admin?.name || p.admin?.email).filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-1 overflow-hidden">
                  {/* Messages */}
                  <div className={cn(
                    'flex-1 flex flex-col overflow-hidden',
                    showActivityLog && 'border-r border-[var(--admin-border)]'
                  )}>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {messageLoading ? (
                        <AdminLoadingState message="Memuat pesan..." />
                      ) : messages.length === 0 ? (
                        <p className="text-center text-[var(--admin-text-muted)] py-8">
                          Belum ada pesan
                        </p>
                      ) : (
                        messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={cn(
                              'flex',
                              msg.senderType === 'admin' ? 'justify-end' : 'justify-start'
                            )}
                          >
                            <div
                              className={cn(
                                'max-w-[70%] rounded-lg px-3 py-2',
                                msg.senderType === 'admin'
                                  ? 'bg-[var(--admin-accent)] text-white'
                                  : msg.senderType === 'system'
                                  ? 'bg-[var(--admin-bg-elevated)] text-[var(--admin-text-secondary)] text-sm italic'
                                  : 'bg-[var(--admin-bg-surface)] text-[var(--admin-text)]'
                              )}
                            >
                              {msg.senderType !== 'admin' && msg.senderType !== 'system' && (
                                <p className="text-xs font-medium text-[var(--admin-accent)] mb-1">
                                  {msg.senderName}
                                </p>
                              )}
                              {msg.senderType === 'admin' && (
                                <p className="text-xs font-medium text-white/80 mb-1">
                                  {msg.senderName}
                                </p>
                              )}
                              <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                              <p className={cn(
                                'text-xs mt-1',
                                msg.senderType === 'admin' ? 'text-white/70' : 'text-[var(--admin-text-muted)]'
                              )}>
                                {formatTime(msg.createdAt)}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Typing Indicator */}
                    {typingUsers.length > 0 && (
                      <div className="px-4 py-1.5 border-t border-[var(--admin-border)] bg-[var(--admin-bg-surface)]">
                        <p className="text-xs text-[var(--admin-text-secondary)] flex items-center gap-1.5">
                          <span className="flex gap-0.5">
                            <span className="w-1.5 h-1.5 bg-[var(--admin-accent)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-[var(--admin-accent)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-[var(--admin-accent)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </span>
                          {typingUsers.map(u => u.userName || 'Pelanggan').join(', ')} sedang mengetik...
                        </p>
                      </div>
                    )}

                    {/* Message Input */}
                    <div className="relative">
                      {/* Canned Response Picker */}
                      {showCannedPicker && filteredCannedResponses.length > 0 && (
                        <div className="absolute bottom-full left-0 right-0 mx-4 mb-1 bg-[var(--admin-bg-elevated)] border border-[var(--admin-border)] rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                          <div className="p-2 border-b border-[var(--admin-border)]">
                            <p className="text-xs text-[var(--admin-text-muted)] flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              Quick Responses - ketik / untuk filter
                            </p>
                          </div>
                          {filteredCannedResponses.slice(0, 8).map((cr) => (
                            <button
                              key={cr.id}
                              type="button"
                              onClick={() => handleSelectCannedResponse(cr)}
                              className="w-full text-left px-3 py-2 hover:bg-[var(--admin-bg-surface)] transition-colors border-b border-[var(--admin-border)] last:border-b-0"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-[var(--admin-accent)]">
                                      {cr.shortcut}
                                    </span>
                                    <span className="text-sm font-medium text-[var(--admin-text)] truncate">
                                      {cr.title}
                                    </span>
                                  </div>
                                  <p className="text-xs text-[var(--admin-text-muted)] truncate mt-0.5">
                                    {cr.message}
                                  </p>
                                </div>
                                {cr.category && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--admin-bg-surface)] text-[var(--admin-text-tertiary)] shrink-0">
                                    {cr.category}
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      <form onSubmit={handleSendMessage} className="p-4 border-t border-[var(--admin-border)]">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input
                              ref={messageInputRef}
                              type="text"
                              value={newMessage}
                              onChange={(e) => handleMessageInputChange(e.target.value)}
                              placeholder="Ketik pesan... (/ untuk template)"
                              disabled={sendingMessage || !['open', 'assigned'].includes(selectedConversation.status)}
                              className="w-full px-4 py-2 bg-[var(--admin-bg-surface)] border border-[var(--admin-border)] rounded-lg text-[var(--admin-text)] placeholder-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-accent)] disabled:opacity-50"
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setShowCannedPicker(false);
                                }
                              }}
                            />
                            {!showCannedPicker && cannedResponses.length > 0 && (
                              <button
                                type="button"
                                onClick={() => { setShowCannedPicker(!showCannedPicker); setCannedFilter(''); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--admin-text-muted)] hover:text-[var(--admin-accent)] transition-colors"
                                title="Template pesan cepat"
                              >
                                <Zap className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <AdminButton
                            type="submit"
                            variant="primary"
                            icon={<Send className="w-4 h-4" />}
                            disabled={sendingMessage || !newMessage.trim() || !['open', 'assigned'].includes(selectedConversation.status)}
                          >
                            Kirim
                          </AdminButton>
                        </div>
                      </form>
                    </div>
                  </div>

                  {/* Activity Log Sidebar */}
                  {showActivityLog && (
                    <div className="w-72 overflow-y-auto p-4">
                      <h4 className="font-medium text-[var(--admin-text)] mb-3 flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Log Aktivitas
                      </h4>
                      {activityLogs.length === 0 ? (
                        <p className="text-sm text-[var(--admin-text-muted)]">
                          Belum ada aktivitas
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {activityLogs.map((log) => (
                            <div key={log.id} className="text-sm">
                              <p className="text-[var(--admin-text)]">
                                <span className="font-medium">{log.actorName || log.actorType}</span>
                                {' '}{getActivityLabel(log.action)}
                              </p>
                              <p className="text-xs text-[var(--admin-text-muted)]">
                                {formatDate(log.createdAt)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <AdminEmptyState
                  icon={<MessageSquare className="w-16 h-16" />}
                  title="Pilih Percakapan"
                  description="Pilih percakapan dari daftar untuk mulai chat"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminChatPage;
