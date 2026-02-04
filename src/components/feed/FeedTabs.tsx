import React from 'react';
import { MessageCircle, Megaphone, Star } from 'lucide-react';
import { PNSection, PNContainer } from '../ui/CyberDesignSystem';

type FeedFilter = 'semua' | 'pengumuman' | 'review';

interface FeedTabsProps {
  active: FeedFilter;
  onChange: (f: FeedFilter) => void;
}

export const FeedTabs: React.FC<FeedTabsProps> = ({ active, onChange }) => {
  const tabs = [
    {
      key: 'semua' as FeedFilter,
      label: 'Semua',
      icon: MessageCircle,
      iconColor: 'text-[var(--cyber-pink-primary)]'
    },
    {
      key: 'pengumuman' as FeedFilter,
      label: 'Pengumuman',
      icon: Megaphone,
      iconColor: 'text-[var(--cyber-pink-secondary)]'
    },
    {
      key: 'review' as FeedFilter,
      label: 'Review',
      icon: Star,
      iconColor: 'text-[var(--cyber-warning)]'
    }
  ];

  return (
    <PNSection padding="sm">
      <PNContainer>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {tabs.map((tab) => {
            const isActive = active === tab.key;
            const Icon = tab.icon;
            
            return (
              <button
                key={tab.key}
                onClick={() => onChange(tab.key)}
                className={`
                  flex items-center justify-center gap-3 px-6 py-4 rounded-cyber-2xl
                  font-semibold text-sm transition-all duration-300 min-h-[56px]
                  border border-[var(--cyber-border)] hover:border-[var(--cyber-pink-muted)]
                  ${isActive 
                    ? 'bg-gradient-to-r from-[var(--cyber-pink-primary)] to-[var(--cyber-pink-glow)] text-[var(--cyber-text-primary)] shadow-lg shadow-[var(--cyber-pink-muted)]'
                    : 'bg-[var(--cyber-bg-elevated)] text-[var(--cyber-text-secondary)] hover:bg-[var(--cyber-bg-card)] hover:text-[var(--cyber-text-primary)]'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : tab.iconColor}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </PNContainer>
    </PNSection>
  );
};

export default FeedTabs;
