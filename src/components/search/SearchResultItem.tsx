/**
 * SearchResultItem - Individual product result in search dropdown
 * Compact card with image, name, price, and stock indicator
 */

import React from 'react';
import { formatCurrency } from '../../utils/helpers';
import type { Product } from '../../types';
import { Zap, Package } from 'lucide-react';

interface SearchResultItemProps {
  product: Product;
  query: string;
  isSelected?: boolean;
  onClick: () => void;
}

export const SearchResultItem = React.forwardRef<HTMLButtonElement, SearchResultItemProps>(({
  product,
  query,
  isSelected = false,
  onClick
}, ref) => {
  // Highlight matching text
  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-[var(--cyber-pink-muted)] text-white px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const isFlashSale = product.isFlashSale && product.flashSaleEndTime && new Date(product.flashSaleEndTime) > new Date();
  const isLowStock = product.stock > 0 && product.stock <= 5;
  const isOutOfStock = product.stock === 0;

  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-cyber-lg transition-colors text-left group ${
        isSelected 
          ? 'bg-[var(--cyber-pink-subtle)] ring-2 ring-[var(--cyber-pink-primary)]' 
          : 'hover:bg-[var(--cyber-bg-card)]'
      }`}
    >
      {/* Product Image */}
      <div className="relative flex-shrink-0">
        <img
          src={product.image}
          alt={product.name}
          className="w-16 h-16 object-cover rounded-cyber-lg ring-2 ring-[var(--cyber-border)] group-hover:ring-[var(--cyber-pink-subtle)] transition-all cyber-image"
        />
        
        {/* Flash Sale Badge */}
        {isFlashSale && (
          <div className="absolute -top-1 -right-1 bg-[var(--cyber-pink-primary)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
            <Zap size={10} className="fill-current" />
            SALE
          </div>
        )}
        
        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/70 rounded-cyber-lg flex items-center justify-center">
            <span className="text-xs text-white font-semibold">Habis</span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        {/* Name with highlighting */}
        <h4 className="text-sm font-medium text-white mb-1 truncate group-hover:text-[var(--cyber-pink-secondary)] transition-colors">
          {highlightText(product.name, query)}
        </h4>
        
        {/* Price */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[15px] font-mono font-bold text-[var(--cyber-pink-primary)]">
            {formatCurrency(product.price)}
          </span>
          
          {/* Original Price (if discounted) */}
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-xs text-[var(--cyber-text-muted)] line-through">
              {formatCurrency(product.originalPrice)}
            </span>
          )}
        </div>
        
        {/* Stock Indicator */}
        <div className="flex items-center gap-1.5 text-xs">
          <Package size={12} className={
            isOutOfStock ? 'text-[var(--cyber-error)]' : 
            isLowStock ? 'text-[var(--cyber-warning)]' : 
            'text-[var(--cyber-success)]'
          } />
          <span className={
            isOutOfStock ? 'text-[var(--cyber-error)]' : 
            isLowStock ? 'text-[var(--cyber-warning)]' : 
            'text-[var(--cyber-text-muted)]'
          }>
            {isOutOfStock ? 'Stok habis' : isLowStock ? `Sisa ${product.stock}` : 'Tersedia'}
          </span>
        </div>
      </div>

      {/* Arrow indicator */}
      <div className="flex-shrink-0 text-[var(--cyber-text-muted)] group-hover:text-[var(--cyber-pink-primary)] transition-colors">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </button>
  );
});

SearchResultItem.displayName = 'SearchResultItem';
