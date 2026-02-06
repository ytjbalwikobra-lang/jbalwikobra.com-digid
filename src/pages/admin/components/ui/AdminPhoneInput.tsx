/**
 * AdminPhoneInput Component - Auto-formatting Phone Number Input
 * WCAG 2.1 AA Compliant
 * 
 * @description Automatically formats phone numbers to unified format as user types
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { normalizeAsianPhone, PHONE_PLACEHOLDER, PHONE_HELP_TEXT } from '../../../../utils/phoneUtils';

interface AdminPhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  icon?: React.ReactNode;
  required?: boolean;
  helpText?: string;
  placeholder?: string;
}

export const AdminPhoneInput: React.FC<AdminPhoneInputProps> = ({
  value,
  onChange,
  label,
  icon,
  required = false,
  helpText = PHONE_HELP_TEXT,
  placeholder = PHONE_PLACEHOLDER
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [country, setCountry] = useState<string>('');

  // Validate and format on mount and when value changes from parent
  useEffect(() => {
    if (value) {
      const result = normalizeAsianPhone(value);
      if (result.isValid) {
        setDisplayValue(result.displayFormat);
        setIsValid(true);
        setCountry(result.country);
      } else {
        setDisplayValue(value);
        setIsValid(value.trim() ? false : null);
        setCountry('');
      }
    } else {
      setDisplayValue('');
      setIsValid(null);
      setCountry('');
    }
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Allow empty input
    if (!input.trim()) {
      setDisplayValue('');
      setIsValid(null);
      setCountry('');
      onChange('');
      return;
    }

    // Normalize and format
    const result = normalizeAsianPhone(input);
    
    if (result.isValid) {
      // Store normalized format (without country name)
      const normalized = result.normalized.startsWith(result.countryCode) 
        ? result.normalized 
        : result.countryCode + result.normalized;
      
      setDisplayValue(result.displayFormat);
      setIsValid(true);
      setCountry(result.country);
      onChange(normalized); // Save normalized format
    } else {
      // Keep raw input while user is typing
      setDisplayValue(input);
      setIsValid(input.length > 3 ? false : null); // Only show error after some input
      setCountry('');
      onChange(input); // Save raw (will be normalized on blur)
    }
  }, [onChange]);

  const handleBlur = useCallback(() => {
    // Final normalization on blur
    if (displayValue.trim()) {
      const result = normalizeAsianPhone(displayValue);
      if (result.isValid) {
        const normalized = result.normalized.startsWith(result.countryCode) 
          ? result.normalized 
          : result.countryCode + result.normalized;
        
        setDisplayValue(result.displayFormat);
        setIsValid(true);
        setCountry(result.country);
        onChange(normalized);
      } else {
        setIsValid(false);
      }
    }
  }, [displayValue, onChange]);

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-[var(--admin-text-muted)]">
        {icon && <span className="inline-flex items-center gap-1">{icon} {label}</span>}
        {!icon && label}
        {required && <span className="text-[var(--admin-error)] ml-1">*</span>}
      </label>
      
      <div className="relative">
        <input
          type="tel"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className={`w-full px-3 py-2 pr-10 bg-[var(--admin-bg-surface)] border rounded-cyber-lg text-[var(--admin-text)] placeholder-[var(--admin-text-muted)] focus:ring-1 transition-colors ${
            isValid === true
              ? 'border-[var(--admin-success)] focus:border-[var(--admin-success)] focus:ring-[var(--admin-success)]'
              : isValid === false
              ? 'border-[var(--admin-error)] focus:border-[var(--admin-error)] focus:ring-[var(--admin-error)]'
              : 'border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:ring-[var(--admin-accent)]'
          }`}
          placeholder={placeholder}
        />
        
        {/* Validation icon */}
        {isValid !== null && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isValid ? (
              <Check size={16} className="text-[var(--admin-success)]" />
            ) : (
              <AlertCircle size={16} className="text-[var(--admin-error)]" />
            )}
          </div>
        )}
      </div>

      {/* Help text with country indicator */}
      <div className="flex items-center justify-between">
        <p className={`text-xs ${isValid === false ? 'text-[var(--admin-error)]' : 'text-[var(--admin-text-muted)]'}`}>
          {isValid === false ? 'Format nomor tidak valid. Coba format +62 XXX-XXX-XXX' : helpText}
        </p>
        {country && (
          <p className="text-xs text-[var(--admin-success)]">
            {country}
          </p>
        )}
      </div>
    </div>
  );
};
