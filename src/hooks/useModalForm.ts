import { useState, useCallback, useEffect } from 'react';

/**
 * useModalForm - Reusable hook for managing modal form state
 * 
 * Eliminates duplicate form handling logic across modals:
 * - ProductModal, FlashSaleModal, BannerForm all had identical form state patterns
 * - Reduces ~30 lines of boilerplate per modal
 * - ISO 9241-110: Provides consistent form handling UX
 * 
 * @template T - Form data type
 * @param initialData - Default values for form
 * @param options - Configuration options
 */

export interface UseModalFormOptions<T> {
  /** Whether modal is open (triggers reset) */
  isOpen: boolean;
  /** Editing mode data (for edit vs create) */
  editData?: T | null;
  /** Reset form when modal closes */
  resetOnClose?: boolean;
  /** Validation function (optional) */
  validate?: (data: T) => string | null;
  /** Transform edit data before setting (optional) */
  transformEditData?: (data: T) => T;
}

export interface UseModalFormResult<T> {
  /** Current form data */
  formData: T;
  /** Set entire form data */
  setFormData: React.Dispatch<React.SetStateAction<T>>;
  /** Update single field */
  updateField: <K extends keyof T>(field: K, value: T[K]) => void;
  /** Update multiple fields at once */
  updateFields: (updates: Partial<T>) => void;
  /** Reset to initial or edit data */
  resetForm: () => void;
  /** Check if form has changes */
  isDirty: boolean;
  /** Validation error message (if any) */
  validationError: string | null;
  /** Validate form data */
  validate: () => boolean;
}

export function useModalForm<T extends Record<string, any>>(
  initialData: T,
  options: UseModalFormOptions<T>
): UseModalFormResult<T> {
  const {
    isOpen,
    editData,
    resetOnClose = true,
    validate: validateFn,
    transformEditData
  } = options;

  const [formData, setFormData] = useState<T>(initialData);
  const [originalData, setOriginalData] = useState<T>(initialData);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset form when modal opens with edit data or closes
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        const data = transformEditData ? transformEditData(editData) : editData;
        setFormData(data);
        setOriginalData(data);
      } else {
        setFormData(initialData);
        setOriginalData(initialData);
      }
      setValidationError(null);
    } else if (resetOnClose) {
      // Reset when modal closes
      setFormData(initialData);
      setOriginalData(initialData);
      setValidationError(null);
    }
  }, [isOpen, editData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update single field
  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationError(null); // Clear validation error on change
  }, []);

  // Update multiple fields
  const updateFields = useCallback((updates: Partial<T>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setValidationError(null);
  }, []);

  // Reset form
  const resetForm = useCallback(() => {
    const resetData = editData || initialData;
    setFormData(resetData);
    setOriginalData(resetData);
    setValidationError(null);
  }, [editData, initialData]);

  // Check if dirty (has changes)
  const isDirty = JSON.stringify(formData) !== JSON.stringify(originalData);

  // Validate form
  const validate = useCallback(() => {
    if (validateFn) {
      const error = validateFn(formData);
      setValidationError(error);
      return error === null;
    }
    return true;
  }, [formData, validateFn]);

  return {
    formData,
    setFormData,
    updateField,
    updateFields,
    resetForm,
    isDirty,
    validationError,
    validate
  };
}
