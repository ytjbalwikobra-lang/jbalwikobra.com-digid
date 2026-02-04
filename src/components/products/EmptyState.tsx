import React from 'react';
import { Search } from 'lucide-react';
import { PNCard, PNButton } from '../ui/CyberDesignSystem';

interface EmptyStateProps {
  title?: string;
  message?: string;
  onReset?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Tidak ada produk ditemukan',
  message = 'Coba ubah kata kunci pencarian atau filter Anda',
  onReset
}) => {
  return (
    <div role="status" aria-live="polite">
      <PNCard className="text-center p-8">
        <div className="w-16 h-16 bg-pink-500/10 rounded-2xl mx-auto mb-4 flex items-center justify-center">
          <Search className="text-pink-400" size={24} />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-[var(--cyber-text-secondary)] mb-6 text-sm">{message}</p>
        {onReset && (
          <PNButton variant="primary" size="md" onClick={onReset}>
            Reset Filter
          </PNButton>
        )}
      </PNCard>
    </div>
  );
};

export default EmptyState;
