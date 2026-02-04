import React from 'react';
import { Clock } from 'lucide-react';
import { PNButton } from '../../../../components/ui/CyberDesignSystem';
import { formatCurrency } from '../../../../utils/helpers';
import type { RentalOption } from './types';

interface RentalOptionsFormProps {
  hasRental: boolean; // rental available toggle
  onHasRentalChange: (hasRental: boolean) => void;
  rentalOptions: RentalOption[];
  onRentalOptionsChange: (options: RentalOption[]) => void;
  isActive: boolean; // product active (passed for potential conditional styling)
  onIsActiveChange: (val: boolean) => void;
}

export const RentalOptionsForm: React.FC<RentalOptionsFormProps> = ({
  hasRental,
  onHasRentalChange,
  rentalOptions,
  onRentalOptionsChange,
  isActive: _isActive,
  onIsActiveChange: _onIsActiveChange,
}) => {
  const addRentalOption = () => {
    if (rentalOptions.length >= 5) {
      alert('Maximum 5 rental options allowed per product.');
      return;
    }

    const newOption: RentalOption = {
      id: Date.now().toString(),
      duration: '',
      price: 0,
    };
    onRentalOptionsChange([...rentalOptions, newOption]);
  };

  const updateRentalOption = (id: string, field: keyof RentalOption, value: any) => {
    const updated = rentalOptions.map((option) =>
      option.id === id ? { ...option, [field]: value } : option
    );
    onRentalOptionsChange(updated);
  };

  return (
    <div className="section-block stack-lg">
      <div className="section-title flex items-center gap-2">
        <Clock className="w-5 h-5 text-emerald-400" />
        Pililhan Rental
      </div>
      <div className="section-divider" />
      <div className="stack-md">
        <div className="flex items-center justify-between p-sm rounded-cyber-lg bg-[var(--cyber-bg-card)] border border-[var(--cyber-border)]">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white/90">Rental Tersedia</span>
            <span className="text-xs text-white/50">Aktifkan untuk menambah varian durasi & harga</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={hasRental}
            onClick={() => onHasRentalChange(!hasRental)}
            className={`toggle ${hasRental ? 'active' : ''}`}
          />
        </div>
        {hasRental && (
          <div className="stack-md">
            <div className="grid grid-cols-2 gap-4 typography-caption-1 text-secondary">
              <div>Duration</div>
              <div>Price</div>
            </div>
            {rentalOptions.map((option) => (
              <div key={option.id} className="grid grid-cols-2 gap-4 items-center">
                <input
                  type="text"
                  value={option.duration}
                  onChange={(e) => updateRentalOption(option.id, 'duration', e.target.value)}
                  className="form-control sm"
                  placeholder="e.g. 6 Hours"
                  disabled={!hasRental}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={option.price ? formatCurrency(option.price) : ''}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    const val = raw ? parseInt(raw, 10) : 0;
                    updateRentalOption(option.id, 'price', val);
                  }}
                  className="form-control sm"
                  placeholder="Rp 0"
                  disabled={!hasRental}
                />
              </div>
            ))}
            <PNButton onClick={addRentalOption} disabled={rentalOptions.length >= 5} className="w-full">
              Add Rental Option
            </PNButton>
          </div>
        )}
      </div>
    </div>
  );
};
