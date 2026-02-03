import React from 'react';
import { adminInputBase } from '../ui/InputStyles';
import { cn } from '../../../../utils/cn';
import { formatNumberID, parseNumberID } from '../../../../utils/helpers';

export interface BasicInfoValues {
  name: string; description: string; price: number; original_price: number; stock: number;
}
interface BasicInfoProps {
  values: BasicInfoValues;
  onChange: (patch: Partial<BasicInfoValues>) => void;
}
export const BasicInfoSection: React.FC<BasicInfoProps> = ({ values, onChange }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white border-b pb-2" style={{ borderColor: 'var(--admin-border)' }}>Basic Information</h3>
      <div>
        <label className="admin-label">Product Name *</label>
        <input
          type="text"
          value={values.name}
          onChange={e=>onChange({ name: e.target.value })}
          className={cn(adminInputBase, 'placeholder:text-white/50')}
          placeholder="Enter product name"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-white mb-2">Description *</label>
            <textarea
              value={values.description}
              onChange={e=>onChange({ description: e.target.value })}
              rows={4}
              className={cn(adminInputBase, 'placeholder:text-white/50 resize-none')}
              placeholder="Enter product description"
            />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-white mb-2">Price *</label>
            <input
              type="text"
              inputMode="numeric"
              value={values.price ? `Rp ${formatNumberID(values.price)}` : ''}
              onChange={e => onChange({ price: parseNumberID(e.target.value) })}
              className={cn(adminInputBase, 'placeholder:text-white/50')}
              placeholder="Rp 0"
            />
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-2">Original Price</label>
            <input
              type="text"
              inputMode="numeric"
              value={values.original_price ? `Rp ${formatNumberID(values.original_price)}` : ''}
              onChange={e => onChange({ original_price: parseNumberID(e.target.value) })}
              className={cn(adminInputBase, 'placeholder:text-white/50')}
              placeholder="Rp 0"
            />
        </div>
      </div>
      <div>
        <label className="admin-label">Stock Quantity *</label>
          <input type="number" value={values.stock} min={0} onChange={e=>onChange({ stock: Math.max(0, Number(e.target.value)) })}
            className={cn(adminInputBase, 'placeholder:text-white/50')} placeholder="1" />
      </div>
    </div>
  );
};
export default BasicInfoSection;
