/**
 * SearchDropdown - Instant search results dropdown
 * Shows top 5 products matching query with "View All" link
 */

import React, { useEffect, useRef, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { SearchResultItem } from './SearchResultItem';
import type { Product } from '../../types';

interface SearchDropdownProps {
  isOpen: boolean;
  results: Product[];
  totalResults: number;
  query: string;
  loading: boolean;
  onSelect: (product: Product) => void;
  onViewAll: () => void;
  onClose: () => void;
}

export const SearchDropdown: React.FC<SearchDropdownProps> = ({
  isOpen,
  results,
  totalResults,
  query,
  loading,
  onSelect,
  onViewAll,
  onClose
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [focusedItemRef, setFocusedItemRef] = useState<HTMLButtonElement | null>(null);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Arrow Down - move to next result
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => {
          const maxIndex = Math.min(results.length, 5) - 1;
          return prev < maxIndex ? prev + 1 : 0;
        });
      }

      // Arrow Up - move to previous result
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => {
          const maxIndex = Math.min(results.length, 5) - 1;
          return prev > 0 ? prev - 1 : maxIndex;
        });
      }

      // Enter - select current result
      if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < results.length) {
        e.preventDefault();
        const selectedProduct = results[selectedIndex];
        onSelect(selectedProduct);
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, selectedIndex, results, onSelect]);

  // Scroll selected item into view
  useEffect(() => {
    if (focusedItemRef && selectedIndex >= 0) {
      focusedItemRef.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedIndex, focusedItemRef]);

  if (!isOpen) return null;

  return (
    <div 
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-2 bg-[var(--cyber-bg-elevated)] border border-[var(--cyber-border)] rounded-cyber-2xl shadow-2xl shadow-black/40 backdrop-blur-xl overflow-hidden z-50 animate-fade-in"
    >
      {loading ? (
        <div className="p-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="cyber-skeleton w-16 h-16 rounded-cyber-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="cyber-skeleton h-4 w-3/4" />
                <div className="cyber-skeleton h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="p-8 text-center">
          <div className="text-[var(--cyber-text-muted)] mb-2">
            Tidak ada produk ditemukan untuk "{query}"
          </div>
          <p className="text-sm text-[var(--cyber-text-muted)]">
            Coba gunakan kata kunci yang berbeda
          </p>
        </div>
      ) : (
        <>
          {/* Results List */}
          <div className="max-h-96 overflow-y-auto cyber-scroll">
            <div className="p-2">
              {results.slice(0, 5).map((product, index) => (
                <SearchResultItem
                  key={product.id}
                  product={product}
                  query={query}
                  isSelected={selectedIndex === index}
                  ref={(el) => {
                    if (selectedIndex === index) {
                      setFocusedItemRef(el);
                    }
                  }}
                  onClick={() => {
                    onSelect(product);
                    onClose();
                  }}
                />
              ))}
            </div>
          </div>

          {/* View All Footer */}
          {totalResults > 5 && (
            <div className="border-t border-[var(--cyber-border)] p-3 bg-[var(--cyber-bg-card)]">
              <button
                onClick={() => {
                  onViewAll();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-cyber-lg text-sm font-medium text-[var(--cyber-pink-primary)] hover:bg-[var(--cyber-pink-subtle)] transition-colors"
              >
                <TrendingUp size={16} />
                Lihat Semua {totalResults} Hasil
              </button>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};
