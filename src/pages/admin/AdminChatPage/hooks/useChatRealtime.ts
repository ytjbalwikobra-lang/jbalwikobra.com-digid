/**
 * useChatRealtime.ts
 * Hook untuk mengelola semua langganan realtime chat admin.
 * Menangani: subscribeToConversations, subscribeToAllMessages,
 * subscribeToMessages, subscribeToTypingIndicators, dan polling.
 */

import { useEffect, useRef } from 'react';
import {
  subscribeToMessages,
  subscribeToAllMessages,
  subscribeToConversations,
  subscribeToTypingIndicators,
} from '../../../../services/chatService';
import { POLL_CONVERSATIONS_INTERVAL_MS } from '../../../../constants/chatConstants';
import type {
  ChatConversation,
  ChatMessage,
  ChatTypingIndicator as TypingIndicatorType
} from '../../../../types/chat';

interface UseChatRealtimeParams {
  /** ID percakapan yang sedang dipilih */
  selectedConversationId: string | undefined;
  /** Callback untuk mainkan suara notifikasi */
  playNotificationSound: () => void;
  /** Setter state daftar percakapan */
  setConversations: React.Dispatch<React.SetStateAction<ChatConversation[]>>;
  /** Setter state pesan */
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  /** Setter state indikator mengetik */
  setTypingUsers: React.Dispatch<React.SetStateAction<TypingIndicatorType[]>>;
  /** Callback muat ulang daftar percakapan (untuk polling) */
  loadConversations: () => Promise<void>;
}

/**
 * Hook untuk mengelola semua langganan realtime chat.
 * Menangani 4 subscription channel + 1 polling interval.
 */
export function useChatRealtime({
  selectedConversationId,
  playNotificationSound,
  setConversations,
  setMessages,
  setTypingUsers,
  loadConversations,
}: UseChatRealtimeParams) {
  const unsubscribeMessagesRef = useRef<(() => void) | null>(null);
  const unsubscribeTypingRef = useRef<(() => void) | null>(null);
  // Ref untuk selectedConversationId — digunakan di callback allMessages tanpa trigger re-subscribe
  const selectedConvIdRef = useRef(selectedConversationId);
  selectedConvIdRef.current = selectedConversationId;

  /** Silent polling setiap 5 menit — safety net, realtime adalah mekanisme utama */
  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations();
    }, POLL_CONVERSATIONS_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadConversations]);

  /** Langganan pembaruan percakapan secara realtime */
  useEffect(() => {
    const { unsubscribe } = subscribeToConversations((conv: ChatConversation) => {
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
  }, [setConversations]);

  /** Langganan SEMUA pesan baru untuk update preview di daftar percakapan + notifikasi */
  useEffect(() => {
    const { unsubscribe } = subscribeToAllMessages((msg: ChatMessage) => {
      // Mainkan suara notifikasi untuk pesan dari customer
      if (msg.senderType === 'customer') {
        playNotificationSound();
      }
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === msg.conversationId);
        if (idx < 0) return prev;
        const updated = [...prev];
        // H3: Hanya increment unread jika BUKAN percakapan yang sedang dilihat
        const isViewingThis = msg.conversationId === selectedConvIdRef.current;
        updated[idx] = {
          ...updated[idx],
          lastMessage: msg,
          lastMessageAt: msg.createdAt,
          unreadCount: (msg.senderType !== 'admin' && !isViewingThis)
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
  }, [playNotificationSound, setConversations]);

  /** Langganan pesan untuk percakapan yang dipilih */
  useEffect(() => {
    if (selectedConversationId) {
      unsubscribeMessagesRef.current?.();
      const { unsubscribe } = subscribeToMessages(selectedConversationId, (msg: ChatMessage) => {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        
        setConversations(prev => prev.map(c => {
          if (c.id !== msg.conversationId) return c;
          return {
            ...c,
            lastMessage: msg,
            lastMessageAt: msg.createdAt
            // Tidak increment unread: user sedang melihat percakapan ini
          };
        }));
      });
      unsubscribeMessagesRef.current = unsubscribe;
      return () => { unsubscribe(); };
    }
  }, [selectedConversationId, setMessages, setConversations]);

  /** Langganan indikator mengetik untuk percakapan yang dipilih */
  useEffect(() => {
    if (selectedConversationId) {
      unsubscribeTypingRef.current?.();
      const { unsubscribe } = subscribeToTypingIndicators(selectedConversationId, (indicators: TypingIndicatorType[]) => {
        setTypingUsers(indicators.filter((i: TypingIndicatorType) => i.userType !== 'admin'));
      });
      unsubscribeTypingRef.current = unsubscribe;
      return () => { unsubscribe(); setTypingUsers([]); };
    }
  }, [selectedConversationId, setTypingUsers]);
}
