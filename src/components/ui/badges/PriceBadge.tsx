import React from 'react';
import { formatCurrency } from '../../../utils/helpers';

interface Props { value: number; className?: string; }

const PriceBadge: React.FC<Props> = ({ value, className = '' }) => (
  <div className={`px-3 py-1 rounded-xl border border-subtle bg-black/40 text-secondary text-xs font-medium shadow-inner ${className}`}>
    {formatCurrency(value)}
  </div>
);

export default React.memo(PriceBadge);
