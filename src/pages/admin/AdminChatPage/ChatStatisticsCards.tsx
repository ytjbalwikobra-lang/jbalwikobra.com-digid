/**
 * ChatStatisticsCards.tsx
 * Komponen kartu statistik untuk dashboard chat admin
 */

import React from 'react';
import { MessageSquare, Clock, Star, BarChart2 } from 'lucide-react';
import { AdminBentoMetricCard } from '../components/ui/AdminBentoCard';
import type { ChatStatistics } from '../../../types/chat';

interface ChatStatisticsCardsProps {
  /** Data statistik chat */
  statistics: ChatStatistics;
}

/** Menampilkan 4 kartu metrik statistik chat — dimemoize karena jarang berubah */
export const ChatStatisticsCards = React.memo<ChatStatisticsCardsProps>(({ statistics }) => {
  return (
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
  );
});

ChatStatisticsCards.displayName = 'ChatStatisticsCards';
