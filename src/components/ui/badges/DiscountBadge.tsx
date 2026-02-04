import React from 'react';

interface Props { percent: number; className?: string; }

const DiscountBadge: React.FC<Props> = ({ percent, className = '' }) => {
  if (percent <= 0) return null;
  return (
    <div className={`px-2 py-1 rounded-xl bg-gradient-to-br from-pink-600 to-fuchsia-600 text-white text-[11px] font-semibold shadow-sm tracking-wide border border-pink-500/40 ${className}`}>
      {percent}%
    </div>
  );
};

export default React.memo(DiscountBadge);
