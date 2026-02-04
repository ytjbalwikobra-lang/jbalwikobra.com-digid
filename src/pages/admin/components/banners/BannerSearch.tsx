import React from 'react';
import { Search } from 'lucide-react';
import { BannerSearchProps } from './types';

export const BannerSearch: React.FC<BannerSearchProps> = ({ 
  searchTerm, 
  onSearchChange 
}) => {
  return (
    <div className="group relative overflow-hidden bg-[var(--cyber-bg-pure)] border border-[var(--cyber-border)] rounded-cyber-2xl p-6 hover:border-[var(--cyber-pink-primary)]/30 transition-all duration-300">
      <div className="relative">
        <Search className="w-5 h-5 text-[var(--cyber-text-muted)] absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Search banners by title or description..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-[var(--cyber-bg-pure)] border border-[var(--cyber-border)] rounded-cyber-lg text-[var(--cyber-text-primary)] placeholder:text-[var(--cyber-text-muted)] focus:ring-2 focus:ring-[var(--cyber-pink-primary)] focus:border-[var(--cyber-pink-primary)] transition-all duration-200"
        />
      </div>
    </div>
  );
};
