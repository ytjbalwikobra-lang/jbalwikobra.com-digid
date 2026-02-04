import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * PasswordInput - Consistent with CyberDesignSystem PNInput
 * 
 * Design Tokens:
 * - Min Height: 48px (touch target)
 * - Padding: 14px vertical, 16px horizontal
 * - Border Radius: 12px (rounded-xl)
 * - Colors: bg-white/5, border-white/10, focus:ring-pink-500/50
 */
interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  label?: string;
}

const PasswordInput: React.FC<PasswordInputProps> = ({
  value,
  onChange,
  placeholder = "Masukkan password",
  className = "",
  required = false,
  label = "Password"
}) => {
  const [showPassword, setShowPassword] = useState(false);

  // Consistent with PNInput from CyberDesignSystem
  const inputClassName = className || [
    'w-full px-4 py-3.5 pr-12 min-h-[48px]',
    'bg-white/5 border border-white/10 rounded-xl',
    'text-white placeholder:text-white/40',
    'focus:outline-none focus:ring-2 focus:ring-[var(--cyber-pink-muted)] focus:border-[var(--cyber-pink-muted)]',
    'transition-all duration-200'
  ].join(' ');

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-white/80">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClassName}
          placeholder={placeholder}
          required={required}
          autoComplete="current-password"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors p-1"
          tabIndex={-1}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <EyeOff size={20} />
          ) : (
            <Eye size={20} />
          )}
        </button>
      </div>
    </div>
  );
};

export default PasswordInput;
