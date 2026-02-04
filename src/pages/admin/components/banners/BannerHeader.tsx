import React from 'react';
import { RefreshCw, Plus } from 'lucide-react';
import { BannerHeaderProps } from './types';

export const BannerHeader: React.FC<BannerHeaderProps> = ({ 
  loading, 
  onRefresh, 
  onCreateBanner 
}) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-pink-100 to-white bg-clip-text text-transparent">
          Banner Management
        </h1>
        <p className="text-[var(--cyber-text-muted)] mt-1">Manage homepage banners and promotional content</p>
      </div>
      <div className="flex items-center space-x-3">
        <button 
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-[var(--cyber-pink-subtle)] border border-[var(--cyber-pink-muted)] rounded-cyber-lg text-[var(--cyber-pink-primary)] hover:bg-[var(--cyber-pink-muted)] transition-all duration-200 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
        <button 
          type="button"
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[var(--cyber-pink-primary)] to-[var(--cyber-pink-glow)] text-white font-semibold rounded-cyber-lg hover:opacity-90 transition-all duration-200 shadow-lg hover:shadow-[var(--cyber-pink-muted)]"
          onClick={onCreateBanner}
        >
          <Plus className="w-4 h-4" />
          <span>Add Banner</span>
        </button>
      </div>
    </div>
  );
};
