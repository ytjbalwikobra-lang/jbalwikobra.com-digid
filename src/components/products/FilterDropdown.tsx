/**
 * FilterDropdown - Reusable dropdown component for filter selections
 * Used in ProductsHeroWithFilters for Game, Tier, and Sort selectors
 */

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  /** Dropdown label */
  label: string;
  /** Current selected value */
  value: string;
  /** Available options */
  options: DropdownOption[];
  /** Placeholder text when no value selected */
  placeholder?: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Unique identifier for accessibility */
  id: string;
}

export const FilterDropdown: React.FC<FilterDropdownProps> = ({
  label,
  value,
  options,
  placeholder = 'Pilih...',
  onChange,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Find selected option label
  const selectedLabel = options.find(opt => opt.value === value)?.label || placeholder;

  return (
    <div className="relative" ref={dropdownRef}>
      <label 
        htmlFor={id}
        className="block text-sm font-medium text-white mb-2"
      >
        {label}
      </label>
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm hover:bg-white/10 transition-colors"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown 
          className={`ml-2 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          size={16} 
        />
      </button>
      
      {isOpen && (
        <ul
          role="listbox"
          className="absolute top-full mt-1 w-full bg-black/90 border border-white/10 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
        >
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm transition-colors truncate ${
                  value === option.value 
                    ? 'bg-pink-500/20 text-pink-300' 
                    : 'text-white hover:bg-white/10'
                }`}
                role="option"
                aria-selected={value === option.value}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FilterDropdown;
