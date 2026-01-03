/**
 * CustomerInfoForm - Customer information form component
 * Handles name, email, and phone input with validation
 */

import React from 'react';
import { User, Mail, AlertCircle } from 'lucide-react';
import { PNText, PNCard, PNHeading } from '../ui/PinkNeonDesignSystem';
import PhoneInput from '../PhoneInput';

interface Customer {
  name: string;
  email: string;
  phone: string;
}

interface CustomerInfoFormProps {
  customer: Customer;
  setCustomer: (customer: Customer) => void;
  isPhoneValid: boolean;
  setIsPhoneValid: (valid: boolean) => void;
  errors?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export const CustomerInfoForm = React.memo(({
  customer,
  setCustomer,
  isPhoneValid,
  setIsPhoneValid,
  errors = {}
}: CustomerInfoFormProps) => {
  const inputBaseClass = "w-full px-3 py-2 pl-10 bg-white/5 border border-white/20 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-500/50 transition-all duration-200 backdrop-blur-sm";
  const errorInputClass = "border-red-500/50 focus:ring-red-500/40 focus:border-red-500/50";

  return (
    <PNCard className="space-y-3 p-3">
      <div className="flex items-center space-x-2 mb-2">
        <User className="text-pink-400" size={16} />
        <PNHeading level={3} className="!mb-0 text-sm">Informasi Customer</PNHeading>
      </div>

      {/* Name Field */}
      <div className="space-y-1">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <User className="text-gray-400" size={16} />
          </div>
          <input
            type="text"
            required
            value={customer.name}
            onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
            className={`${inputBaseClass} ${errors.name ? errorInputClass : ''}`}
            placeholder="Nama lengkap *"
          />
        </div>
        {errors.name && (
          <div className="flex items-center space-x-1 text-red-400 text-xs">
            <AlertCircle size={12} />
            <span>{errors.name}</span>
          </div>
        )}
      </div>

      {/* Email Field */}
      <div className="space-y-1">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail className="text-gray-400" size={16} />
          </div>
          <input
            type="email"
            required
            value={customer.email}
            onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
            className={`${inputBaseClass} ${errors.email ? errorInputClass : ''}`}
            placeholder="Email address *"
          />
        </div>
        {errors.email && (
          <div className="flex items-center space-x-1 text-red-400 text-xs">
            <AlertCircle size={12} />
            <span>{errors.email}</span>
          </div>
        )}
      </div>

      {/* Phone Field */}
      <div className="space-y-1">
        <PhoneInput
          value={customer.phone}
          onChange={(value) => setCustomer({ ...customer, phone: value })}
          onValidationChange={setIsPhoneValid}
          placeholder="No. WhatsApp *"
          required
          disableAutoDetection
          className={errors.phone ? errorInputClass : ''}
        />
        {errors.phone && (
          <div className="flex items-center space-x-1 text-red-400 text-sm">
            <AlertCircle size={14} />
            <span>{errors.phone}</span>
          </div>
        )}
        {!isPhoneValid && customer.phone && !errors.phone && (
          <div className="flex items-center space-x-1 text-yellow-400 text-sm">
            <AlertCircle size={14} />
            <span>Format nomor WhatsApp tidak valid</span>
          </div>
        )}
      </div>

      {/* Info Note */}
      <div className="mt-4 p-3 bg-pink-400/10 border border-pink-500/30 rounded-xl backdrop-blur-sm">
        <PNText className="text-sm text-blue-300">
          Detail akun akan dikirim ke WhatsApp setelah pembayaran berhasil
        </PNText>
      </div>
    </PNCard>
  );
});

CustomerInfoForm.displayName = 'CustomerInfoForm';
