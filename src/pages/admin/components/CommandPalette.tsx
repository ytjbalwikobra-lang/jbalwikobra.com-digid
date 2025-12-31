import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { X, Search } from 'lucide-react';
import { AdminTab } from './structure/adminTypes';
const cn = (...c: any[]) => c.filter(Boolean).join(' ');

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (tab: AdminTab) => void;
  onRefreshStats?: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  type: 'nav' | 'action';
  tab?: AdminTab;
  perform?: () => void;
  keywords?: string[];
}

// lightweight fuzzy scoring
function score(query: string, target: string) {
  if (!query) return 1;
  query = query.toLowerCase();
  target = target.toLowerCase();
  let ti = 0; let score = 0; let streak = 0;
  for (let qi = 0; qi < query.length; qi++) {
    const qChar = query[qi];
    let found = false;
    while (ti < target.length) {
      if (target[ti] === qChar) { found = true; score += 1 + streak * 0.5; streak++; ti++; break; } else { streak = 0; ti++; }
    }
    if (!found) return 0;
  }
  return score / target.length;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, onNavigate, onRefreshStats }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const items: CommandItem[] = useMemo(() => [
    { id: 'nav-dashboard', label: 'Go to Dashboard', type: 'nav', tab: 'dashboard', keywords: ['stats','metrics'] },
    { id: 'nav-orders', label: 'Go to Orders', type: 'nav', tab: 'orders', keywords: ['transactions','sales'] },
    { id: 'nav-users', label: 'Go to Users', type: 'nav', tab: 'users', keywords: ['customers','accounts'] },
    { id: 'nav-products', label: 'Go to Products', type: 'nav', tab: 'products', keywords: ['inventory','items'] },
    { id: 'nav-banners', label: 'Go to Banners', type: 'nav', tab: 'banners', keywords: ['promo','ads'] },
    { id: 'nav-flash', label: 'Go to Flash Sales', type: 'nav', tab: 'flash-sales', keywords: ['sale','discount'] },
    { id: 'nav-reviews', label: 'Go to Reviews', type: 'nav', tab: 'reviews', keywords: ['feedback','rating'] },
    { id: 'action-refresh-stats', label: 'Refresh Dashboard Stats', type: 'action', perform: () => onRefreshStats?.(), keywords: ['reload','refresh','metrics'] },
    { id: 'action-toggle-theme', label: 'Toggle Theme (Light/Dark)', type: 'action', perform: () => window.dispatchEvent(new CustomEvent('toggle-theme')), keywords: ['theme','dark','light','appearance'] },
    { id: 'action-new-product', label: 'Create New Product', type: 'action', perform: () => window.dispatchEvent(new CustomEvent('open-new-product-form')), keywords: ['add','product','inventory','create'] },
    { id: 'action-refresh-products', label: 'Refresh Products List', type: 'action', perform: () => window.dispatchEvent(new CustomEvent('refresh-products')), keywords: ['reload','inventory','products'] },
  ], [onRefreshStats]);

  const filtered = useMemo(() => {
    if (!query) return items.slice(0, 12);
    return items
      .map(i => ({ i, s: Math.max(
        score(query, i.label),
        ...(i.keywords || []).map(k => score(query, k))
      ) }))
      .filter(r => r.s > 0)
      .sort((a,b) => b.s - a.s)
      .slice(0, 20)
      .map(r => r.i);
  }, [items, query]);

  const execute = useCallback((item: CommandItem) => {
    if (item.type === 'nav' && item.tab) onNavigate(item.tab);
    if (item.type === 'action' && item.perform) item.perform();
    onClose();
  }, [onNavigate, onClose]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const metaK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (metaK) { e.preventDefault(); open ? onClose() : null; }
      if (!open) return;
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(filtered.length - 1, i + 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(0, i - 1)); }
      if (e.key === 'Enter') { e.preventDefault(); const item = filtered[activeIndex]; if (item) execute(item); }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, filtered, activeIndex, execute, onClose]);

  useEffect(() => { if (!open) { setQuery(''); setActiveIndex(0); } }, [open]);

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Command Palette" className="fixed inset-0 z-[999] flex items-start justify-center pt-24 px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl overflow-hidden ring-1 ring-white/10 bg-gradient-to-br from-[#151518] to-[#0a0a0b] shadow-2xl">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <Search className="w-4 h-4 text-pink-400" />
          <input
            autoFocus
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-gray-400"
            aria-label="Command query"
          />
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto py-2">
          {filtered.length === 0 && (
            <li className="px-5 py-8 text-center text-xs text-gray-500">No matches</li>
          )}
          {filtered.map((item, idx) => (
            <li key={item.id}>
              <button
                onClick={() => execute(item)}
                className={cn(
                  'w-full flex items-center justify-between px-5 py-3 text-left text-sm transition-colors',
                  idx === activeIndex ? 'bg-pink-500/15 text-white' : 'text-gray-300 hover:text-white hover:bg-white/5'
                )}
                aria-selected={idx === activeIndex}
                role="option"
              >
                <span className="flex-1 truncate font-medium">{item.label}</span>
                <span className="text-[10px] uppercase tracking-wide text-gray-500">{item.type}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="px-5 py-3 border-t border-white/10 flex justify-between items-center">
          <span className="text-[10px] text-gray-500">↑↓ Navigate • Enter Select • Esc Close</span>
          <span className="text-[10px] text-gray-500">Fuzzy match active</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;