import React from 'react';
import { MessageCircle, Megaphone, Star } from 'lucide-react';
import { PNSection, PNContainer } from '../ui/PinkNeonDesignSystem';

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
      iconColor: 'text-pink-500'
    },
    {
      key: 'pengumuman' as FeedFilter,
      label: 'Pengumuman',
      icon: Megaphone,
      iconColor: 'text-fuchsia-400'
    },
    {
      key: 'review' as FeedFilter,
      label: 'Review',
      icon: Star,
      iconColor: 'text-yellow-400'
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
                  flex items-center justify-center gap-3 px-6 py-4 rounded-2xl
                  font-semibold text-sm transition-all duration-300 min-h-[56px]
                  border border-white/10 hover:border-pink-500/30
                  ${isActive 
                    ? 'bg-gradient-to-r from-pink-500 to-fuchsia-600 text-white shadow-lg shadow-pink-500/25'
                    : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
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
