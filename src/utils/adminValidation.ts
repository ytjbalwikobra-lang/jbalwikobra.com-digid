/**
 * Admin Form Validation Utilities
 * 
 * Purpose: Centralized validation logic with real-time feedback
 * - Eliminates duplicate validation code across modals
 * - Provides consistent, context-rich error messages
 * - ISO Standard: WCAG 2.1 AA compliant error messaging
 * 
 * Benefits:
 * - Single source of truth for validation rules
 * - Reusable validators with composability
 * - Improved UX with specific error messages
 */

// ============================================================================
// Validation Rule Types
// ============================================================================

export interface ValidationRule<T = any> {
  validate: (value: T, formData?: any) => boolean;
  message: string | ((value: T, formData?: any) => string);
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// ============================================================================
// Common Validators
// ============================================================================

export const validators = {
  // Required field
  required: (fieldName: string): ValidationRule<any> => ({
    validate: (value) => {
      if (typeof value === 'string') return value.trim().length > 0;
      if (typeof value === 'number') return !isNaN(value);
      if (Array.isArray(value)) return value.length > 0;
      return value != null && value !== '';
    },
    message: `${fieldName} harus diisi`
  }),

  // Minimum value (numbers)
  min: (min: number, fieldName: string = 'Nilai'): ValidationRule<number> => ({
    validate: (value) => value >= min,
    message: `${fieldName} harus minimal ${min.toLocaleString('id-ID')}`
  }),

  // Maximum value (numbers)
  max: (max: number, fieldName: string = 'Nilai'): ValidationRule<number> => ({
    validate: (value) => value <= max,
    message: `${fieldName} tidak boleh lebih dari ${max.toLocaleString('id-ID')}`
  }),

  // Positive number
  positive: (fieldName: string = 'Nilai'): ValidationRule<number> => ({
    validate: (value) => value > 0,
    message: `${fieldName} harus lebih dari 0`
  }),

  // Non-negative number
  nonNegative: (fieldName: string = 'Nilai'): ValidationRule<number> => ({
    validate: (value) => value >= 0,
    message: `${fieldName} tidak boleh negatif`
  }),

  // String length
  minLength: (min: number, fieldName: string = 'Teks'): ValidationRule<string> => ({
    validate: (value) => value.trim().length >= min,
    message: `${fieldName} minimal ${min} karakter`
  }),

  maxLength: (max: number, fieldName: string = 'Teks'): ValidationRule<string> => ({
    validate: (value) => value.trim().length <= max,
    message: `${fieldName} maksimal ${max} karakter`
  }),

  // Email format
  email: (): ValidationRule<string> => ({
    validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: 'Format email tidak valid'
  }),

  // Phone number (Indonesian format)
  phoneNumber: (): ValidationRule<string> => ({
    validate: (value) => /^(\+62|62|0)[0-9]{9,12}$/.test(value.replace(/\s/g, '')),
    message: 'Format nomor telepon tidak valid (contoh: 081234567890)'
  }),

  // URL format
  url: (): ValidationRule<string> => ({
    validate: (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message: 'Format URL tidak valid (contoh: https://example.com)'
  }),

  // Date range
  dateAfter: (compareDate: Date | string, fieldName: string = 'Tanggal'): ValidationRule<string | Date> => ({
    validate: (value) => new Date(value) > new Date(compareDate),
    message: `${fieldName} harus setelah ${new Date(compareDate).toLocaleDateString('id-ID')}`
  }),

  dateBefore: (compareDate: Date | string, fieldName: string = 'Tanggal'): ValidationRule<string | Date> => ({
    validate: (value) => new Date(value) < new Date(compareDate),
    message: `${fieldName} harus sebelum ${new Date(compareDate).toLocaleDateString('id-ID')}`
  }),

  // Compare two values
  lessThan: (otherField: string, otherFieldName: string): ValidationRule<number> => ({
    validate: (value, formData) => !formData || value < formData[otherField],
    message: (value, formData) => 
      `Nilai harus lebih kecil dari ${otherFieldName} (${formData?.[otherField]?.toLocaleString('id-ID') || ''})`
  }),

  greaterThan: (otherField: string, otherFieldName: string): ValidationRule<number> => ({
    validate: (value, formData) => !formData || value > formData[otherField],
    message: (value, formData) => 
      `Nilai harus lebih besar dari ${otherFieldName} (${formData?.[otherField]?.toLocaleString('id-ID') || ''})`
  }),

  // File validation
  fileSize: (maxSizeMB: number): ValidationRule<File> => ({
    validate: (file) => file.size <= maxSizeMB * 1024 * 1024,
    message: `Ukuran file maksimal ${maxSizeMB}MB`
  }),

  fileType: (allowedTypes: string[]): ValidationRule<File> => ({
    validate: (file) => allowedTypes.includes(file.type),
    message: `Tipe file harus: ${allowedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')}`
  })
};

// ============================================================================
// Validation Builder
// ============================================================================

export class FormValidator<T extends Record<string, any>> {
  private rules: Map<keyof T, ValidationRule[]> = new Map();

  field(fieldName: keyof T): FieldValidator<T> {
    return new FieldValidator(this, fieldName);
  }

  validate(formData: T): ValidationResult {
    const errors: Record<string, string> = {};

    for (const [field, fieldRules] of this.rules.entries()) {
      const value = formData[field];
      
      for (const rule of fieldRules) {
        if (!rule.validate(value, formData)) {
          const message = typeof rule.message === 'function' 
            ? rule.message(value, formData) 
            : rule.message;
          errors[field as string] = message;
          break; // Stop at first error for this field
        }
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  addRule(field: keyof T, rule: ValidationRule): this {
    if (!this.rules.has(field)) {
      this.rules.set(field, []);
    }
    this.rules.get(field)!.push(rule);
    return this;
  }
}

class FieldValidator<T extends Record<string, any>> {
  constructor(
    private validator: FormValidator<T>,
    private fieldName: keyof T
  ) {}

  rule(rule: ValidationRule): this {
    this.validator.addRule(this.fieldName, rule);
    return this;
  }

  required(message?: string): this {
    return this.rule(validators.required(message || String(this.fieldName)));
  }

  min(value: number, message?: string): this {
    return this.rule(validators.min(value, message || String(this.fieldName)));
  }

  max(value: number, message?: string): this {
    return this.rule(validators.max(value, message || String(this.fieldName)));
  }

  positive(message?: string): this {
    return this.rule(validators.positive(message || String(this.fieldName)));
  }

  end(): FormValidator<T> {
    return this.validator;
  }
}

// ============================================================================
// Pre-built Validators for Common Forms
// ============================================================================

export const productValidation = <T extends { name: string; price: number; image?: string; images?: string[] }>() => {
  return new FormValidator<T>()
    .field('name' as keyof T).required('Nama produk').rule(validators.minLength(3, 'Nama produk')).end()
    .field('price' as keyof T).required('Harga').positive('Harga').end();
};

export const flashSaleValidation = <T extends {
  productId: string;
  salePrice: number;
  originalPrice: number;
  startTime: string;
  endTime: string;
}>() => {
  return new FormValidator<T>()
    .field('productId').required('Produk').end()
    .field('salePrice').required('Harga sale').positive('Harga sale').end()
    .field('originalPrice').required('Harga asli').positive('Harga asli').end()
    .field('startTime').required('Waktu mulai').end()
    .field('endTime').required('Waktu selesai').end()
    .addRule('salePrice', {
      validate: (value, formData) => value < (formData?.originalPrice || Infinity),
      message: 'Harga sale harus lebih kecil dari harga asli'
    })
    .addRule('endTime', {
      validate: (value, formData) => !formData?.startTime || new Date(value) > new Date(formData.startTime),
      message: 'Waktu selesai harus setelah waktu mulai'
    });
};

export const bannerValidation = <T extends { title: string; image_url: string }>() => {
  return new FormValidator<T>()
    .field('title').required('Judul banner').rule(validators.minLength(3, 'Judul')).end()
    .field('image_url').required('URL gambar').rule(validators.url()).end();
};
