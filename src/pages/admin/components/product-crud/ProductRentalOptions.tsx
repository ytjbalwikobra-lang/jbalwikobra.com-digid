import React from 'react';
import { PNButton } from '../../../../components/ui/CyberDesignSystem';
import { Clock, X } from 'lucide-react';
import { formatNumberID, parseNumberID } from '../../../../utils/helpers';

export interface ProductRentalOptionRow {
  id: string;
  qty: string; // numeric string
  type: 'Hours' | 'Days' | 'Week' | 'Month' | '';
  price: string; // numeric string formatted optionally
}

interface ProductRentalOptionsProps {
  enabled: boolean;
  onEnabledChange: (val: boolean) => void;
  options: ProductRentalOptionRow[];
  onOptionsChange: (rows: ProductRentalOptionRow[]) => void;
  max?: number;
}

// Helper to format Rupiah with thousand separators and Rp prefix
const formatRupiahPrice = (value: string | number): string => {
  const numValue = typeof value === 'string' ? parseNumberID(value) : value;
  return numValue > 0 ? `Rp ${formatNumberID(numValue)}` : '';
};

export const ProductRentalOptions: React.FC<ProductRentalOptionsProps> = ({
  enabled,
  onEnabledChange,
  options,
  onOptionsChange,
  max = 6,
}) => {
  const addRow = () => {
    if (options.length >= max) return;
    onOptionsChange([
      ...options,
      { id: Date.now().toString(), qty: '', type: '', price: '' },
    ]);
  };

  const updateRow = (id: string, field: keyof ProductRentalOptionRow, value: string) => {
    onOptionsChange(options.map(r => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const removeRow = (id: string) => {
    onOptionsChange(options.filter(r => r.id !== id));
  };

  return (
  <div className="surface-glass-lg p-6 transition-soft hover:scale-[1.01] hover:ring-1 hover:ring-emerald-500/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-emerald-500/20 to-green-600/20 rounded-cyber-lg flex items-center justify-center border border-emerald-500/30">
            <Clock className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Rental Option</h3>
        </div>
    <button
          type="button"
            onClick={() => onEnabledChange(!enabled)}
            role="switch"
            aria-checked={enabled}
      aria-label={enabled ? 'Disable rental options' : 'Enable rental options'}
            className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 border ${
              enabled ? 'bg-gradient-to-r from-emerald-500 to-green-600 border-emerald-400' : 'bg-black/40 border-white/20'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-300 ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-white/70 mb-2">
        <div className="col-span-2">Qty</div>
        <div className="col-span-3">Type</div>
        <div className="col-span-5">Prices</div>
        <div className="col-span-2 text-right">Action</div>
      </div>

      <div className="space-y-3">
        {options.map(row => {
          const formattedPrice = formatRupiahPrice(row.price);
          return (
            <div key={row.id} className="grid grid-cols-12 gap-4 items-center group">
              <input
                type="text"
                inputMode="numeric"
                value={row.qty}
                onChange={e => {
                  const numValue = e.target.value.replace(/[^0-9]/g, '');
                  updateRow(row.id, 'qty', numValue);
                }}
                className="col-span-2 px-3 py-2 rounded-cyber-lg bg-black/40 backdrop-blur-sm border border-white/15 text-white placeholder-white/40 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 text-sm"
                placeholder="0"
              />
              <select
                value={row.type}
                onChange={e => updateRow(row.id, 'type', e.target.value)}
                className="col-span-3 px-3 py-2 rounded-cyber-lg bg-black/40 backdrop-blur-sm border border-white/15 text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 text-sm"
              >
                <option value="">Select</option>
                <option value="Hours">Hours</option>
                <option value="Days">Days</option>
                <option value="Week">Week</option>
                <option value="Month">Month</option>
              </select>
              <input
                type="text"
                inputMode="numeric"
                value={formattedPrice}
                onChange={e => {
                  const parsedValue = parseNumberID(e.target.value);
                  updateRow(row.id, 'price', parsedValue.toString());
                }}
                className="col-span-5 px-3 py-2 rounded-cyber-lg bg-black/40 backdrop-blur-sm border border-white/15 text-white placeholder-white/40 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 text-sm"
                placeholder="Rp 0"
              />
              <div className="col-span-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded-cyber-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-xs text-red-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <PNButton
          onClick={addRow}
          disabled={!enabled || options.length >= max}
          className={`w-full transition-all duration-300 ${
            !enabled || options.length >= max
              ? 'bg-[var(--cyber-bg-elevated)]/20 border-[var(--cyber-border)]/30 text-[var(--cyber-text-muted)] cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 border-emerald-500/30 hover:from-emerald-500/30 hover:to-green-500/30 text-emerald-200'
          }`}
        >
          Add Rental Option
        </PNButton>
      </div>
    </div>
  );
};
