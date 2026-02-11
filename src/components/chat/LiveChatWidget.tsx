/**
 * Customer Live Chat Widget
 * 
 * Floating chat widget for customers to communicate with support.
 * Features:
 * - Start new conversations
 * - Send/receive messages in real-time
 * - Submit ratings after conversation
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  startConversation,
  sendCustomerMessage,
  getCustomerMessages,
  submitRating,
  subscribeToMessages,
  subscribeToTypingIndicators,
  customerSetTyping,
  customerStopTyping
} from '../../services/chatService';
import type { ChatConversation, ChatMessage } from '../../types/chat';

// Icons
const ChatIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
    />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SendIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
    />
  </svg>
);

const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg className={`w-8 h-8 ${filled ? 'text-yellow-400' : 'text-gray-300'}`} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" 
    />
  </svg>
);

interface ChatWidgetProps {
  position?: 'bottom-right' | 'bottom-left';
  defaultOpen?: boolean;
  onConversationStart?: (conversation: ChatConversation) => void;
}

type ViewState = 'start' | 'chat' | 'rating' | 'closed';

const LiveChatWidget: React.FC<ChatWidgetProps> = ({
  position = 'bottom-right',
  defaultOpen = false,
  onConversationStart
}) => {
  // State
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [viewState, setViewState] = useState<ViewState>('start');
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Start form state
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  
  // Rating state
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  
  // Typing indicator state
  const [adminTyping, setAdminTyping] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const unsubscribeTypingRef = useRef<(() => void) | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Position classes
  const positionClasses = position === 'bottom-right'
    ? 'right-4 bottom-4'
    : 'left-4 bottom-4';

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load conversation from localStorage
  useEffect(() => {
    const savedConvId = localStorage.getItem('chat_conversation_id');
    const savedEmail = localStorage.getItem('chat_customer_email');
    const savedName = localStorage.getItem('chat_customer_name');
    
    if (savedConvId && savedEmail) {
      // Restore previous conversation
      setConversation({ id: savedConvId } as ChatConversation);
      setCustomerEmail(savedEmail);
      setCustomerName(savedName || '');
      setViewState('chat');
      loadMessages(savedConvId);
    }
  }, []);

  // Subscribe to realtime messages
  useEffect(() => {
    if (conversation?.id) {
      const { unsubscribe } = subscribeToMessages(conversation.id, (msg) => {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      });
      unsubscribeRef.current = unsubscribe;
      
      return () => {
        unsubscribe();
      };
    }
  }, [conversation?.id]);

  // Subscribe to typing indicators
  useEffect(() => {
    if (conversation?.id) {
      unsubscribeTypingRef.current?.();
      
      const { unsubscribe } = subscribeToTypingIndicators(conversation.id, (indicators) => {
        // Show if any admin is typing
        const hasAdminTyping = indicators.some(i => i.userType === 'admin');
        setAdminTyping(hasAdminTyping);
      });
      
      unsubscribeTypingRef.current = unsubscribe;
      
      return () => {
        unsubscribe();
        setAdminTyping(false);
      };
    }
  }, [conversation?.id]);

  // Load messages
  const loadMessages = async (convId: string) => {
    setIsLoading(true);
    try {
      const result = await getCustomerMessages(convId, { limit: 50 });
      setMessages(result.messages);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Start conversation
  const handleStartConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await startConversation({
        customerName,
        customerEmail,
        subject,
        initialMessage
      });

      if (result.error || !result.conversation) {
        setError(result.error || 'Failed to start conversation');
        return;
      }

      // Save to localStorage
      localStorage.setItem('chat_conversation_id', result.conversation.id);
      localStorage.setItem('chat_customer_email', customerEmail);
      localStorage.setItem('chat_customer_name', customerName);

      setConversation(result.conversation);
      setViewState('chat');
      onConversationStart?.(result.conversation);

      // Load initial message if we sent one
      if (initialMessage) {
        await loadMessages(result.conversation.id);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle customer message input change (with typing indicator)
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

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversation?.id) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setIsLoading(true);
    
    // Stop typing indicator
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
        setNewMessage(messageText); // Restore message
        return;
      }

      // Message will be added via realtime subscription
      // But add optimistically just in case
      if (result.message) {
        setMessages(prev => {
          if (prev.some(m => m.id === result.message!.id)) return prev;
          return [...prev, result.message!];
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      setNewMessage(messageText);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // Submit rating
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
      
      // Clear localStorage
      localStorage.removeItem('chat_conversation_id');
      localStorage.removeItem('chat_customer_email');
      localStorage.removeItem('chat_customer_name');
      
      // Show thank you, then reset
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
      setError(err.message || 'Failed to submit rating');
    } finally {
      setIsLoading(false);
    }
  };

  // End chat
  const handleEndChat = () => {
    setViewState('rating');
  };

  // Close widget
  const handleClose = () => {
    setIsOpen(false);
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  // Render start form
  const renderStartForm = () => (
    <form onSubmit={handleStartConversation} className="p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--cyber-text-secondary)] mb-1">
          Nama
        </label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="w-full px-3 py-2 bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] rounded-lg text-[var(--cyber-text)] placeholder-[var(--cyber-text-muted)] focus:outline-none focus:border-[var(--cyber-accent)]"
          placeholder="Nama Anda"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--cyber-text-secondary)] mb-1">
          Email
        </label>
        <input
          type="email"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
          className="w-full px-3 py-2 bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] rounded-lg text-[var(--cyber-text)] placeholder-[var(--cyber-text-muted)] focus:outline-none focus:border-[var(--cyber-accent)]"
          placeholder="email@example.com"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--cyber-text-secondary)] mb-1">
          Subjek
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full px-3 py-2 bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] rounded-lg text-[var(--cyber-text)] placeholder-[var(--cyber-text-muted)] focus:outline-none focus:border-[var(--cyber-accent)]"
          placeholder="Bagaimana kami bisa membantu?"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--cyber-text-secondary)] mb-1">
          Pesan
        </label>
        <textarea
          value={initialMessage}
          onChange={(e) => setInitialMessage(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] rounded-lg text-[var(--cyber-text)] placeholder-[var(--cyber-text-muted)] focus:outline-none focus:border-[var(--cyber-accent)] resize-none"
          placeholder="Tulis pesan Anda..."
          required
        />
      </div>
      {error && (
        <p className="text-sm text-[var(--cyber-error)]">{error}</p>
      )}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2.5 bg-[var(--cyber-accent)] text-white font-medium rounded-lg hover:bg-[var(--cyber-accent)]/90 transition-colors disabled:opacity-50"
      >
        {isLoading ? 'Memulai...' : 'Mulai Chat'}
      </button>
    </form>
  );

  // Render chat view
  const renderChatView = () => (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !isLoading && (
          <p className="text-center text-[var(--cyber-text-muted)] text-sm py-8">
            Belum ada pesan
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.senderType === 'customer' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 ${
                msg.senderType === 'customer'
                  ? 'bg-[var(--cyber-accent)] text-white'
                  : msg.senderType === 'system'
                  ? 'bg-[var(--cyber-bg-elevated)] text-[var(--cyber-text-secondary)] text-sm italic'
                  : 'bg-[var(--cyber-bg-surface)] text-[var(--cyber-text)]'
              }`}
            >
              {msg.senderType === 'admin' && (
                <p className="text-xs font-medium text-[var(--cyber-accent)] mb-1">
                  {msg.senderName}
                </p>
              )}
              <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
              <p className={`text-xs mt-1 ${
                msg.senderType === 'customer' ? 'text-white/70' : 'text-[var(--cyber-text-muted)]'
              }`}>
                {formatTime(msg.createdAt)}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Admin Typing Indicator */}
      {adminTyping && (
        <div className="px-4 py-1.5 border-t border-[var(--cyber-border)]">
          <p className="text-xs text-[var(--cyber-text-secondary)] flex items-center gap-1.5">
            <span className="flex gap-0.5">
              <span className="w-1 h-1 bg-[var(--cyber-accent)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 bg-[var(--cyber-accent)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 bg-[var(--cyber-accent)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            Admin sedang mengetik...
          </p>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-[var(--cyber-border)]">
        {error && (
          <p className="text-xs text-[var(--cyber-error)] mb-2">{error}</p>
        )}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => handleInputChange(e.target.value)}
            className="flex-1 px-3 py-2 bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] rounded-lg text-[var(--cyber-text)] placeholder-[var(--cyber-text-muted)] focus:outline-none focus:border-[var(--cyber-accent)] text-sm"
            placeholder="Ketik pesan..."
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !newMessage.trim()}
            className="px-3 py-2 bg-[var(--cyber-accent)] text-white rounded-lg hover:bg-[var(--cyber-accent)]/90 transition-colors disabled:opacity-50"
          >
            <SendIcon />
          </button>
        </div>
        <button
          type="button"
          onClick={handleEndChat}
          className="w-full mt-2 text-xs text-[var(--cyber-text-muted)] hover:text-[var(--cyber-text)] transition-colors"
        >
          Selesaikan Chat
        </button>
      </form>
    </div>
  );

  // Render rating view
  const renderRatingView = () => (
    <div className="p-6 text-center">
      {ratingSubmitted ? (
        <div>
          <div className="w-16 h-16 bg-[var(--cyber-success)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[var(--cyber-success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[var(--cyber-text)] mb-2">
            Terima Kasih!
          </h3>
          <p className="text-sm text-[var(--cyber-text-secondary)]">
            Feedback Anda sangat berarti bagi kami.
          </p>
        </div>
      ) : (
        <>
          <h3 className="text-lg font-semibold text-[var(--cyber-text)] mb-2">
            Beri Rating
          </h3>
          <p className="text-sm text-[var(--cyber-text-secondary)] mb-4">
            Bagaimana pengalaman chat Anda?
          </p>
          
          {/* Stars */}
          <div className="flex justify-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110"
              >
                <StarIcon filled={star <= rating} />
              </button>
            ))}
          </div>

          {/* Feedback */}
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-[var(--cyber-bg-surface)] border border-[var(--cyber-border)] rounded-lg text-[var(--cyber-text)] placeholder-[var(--cyber-text-muted)] focus:outline-none focus:border-[var(--cyber-accent)] resize-none text-sm mb-4"
            placeholder="Tulis feedback (opsional)..."
          />

          {error && (
            <p className="text-sm text-[var(--cyber-error)] mb-4">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setViewState('chat')}
              className="flex-1 py-2 border border-[var(--cyber-border)] text-[var(--cyber-text)] rounded-lg hover:bg-[var(--cyber-bg-surface)] transition-colors"
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={handleSubmitRating}
              disabled={rating === 0 || isLoading}
              className="flex-1 py-2 bg-[var(--cyber-accent)] text-white rounded-lg hover:bg-[var(--cyber-accent)]/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Mengirim...' : 'Kirim'}
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className={`fixed ${positionClasses} z-50`}>
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[350px] h-[500px] bg-[var(--cyber-bg-card)] border border-[var(--cyber-border)] rounded-xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[var(--cyber-accent)] text-white">
            <div>
              <h3 className="font-semibold">Live Chat</h3>
              <p className="text-xs text-white/80">
                {viewState === 'start' ? 'Mulai percakapan' : 
                 viewState === 'rating' ? 'Berikan penilaian' : 'Kami siap membantu'}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {viewState === 'start' && renderStartForm()}
            {viewState === 'chat' && renderChatView()}
            {viewState === 'rating' && renderRatingView()}
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-[var(--cyber-accent)] text-white rounded-full shadow-lg hover:bg-[var(--cyber-accent)]/90 transition-all hover:scale-105 flex items-center justify-center"
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? <CloseIcon /> : <ChatIcon />}
      </button>
    </div>
  );
};

export default LiveChatWidget;
