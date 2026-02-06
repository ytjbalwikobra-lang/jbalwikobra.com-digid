import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, X, RefreshCw, GripVertical, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { uploadFiles, UploadResult } from '../../../../services/storageService';
// Design system: cyber-compact.css (loaded via index.css)

export interface ImageItem {
  id: string;
  url: string;
  tempUrl?: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  file?: File;
}

export interface AdminImageUploadProps {
  /** Current list of image URLs (finalized) */
  images: string[];
  /** Callback when images change */
  onChange: (images: string[]) => void;
  /** Storage bucket name for uploads */
  bucket?: string;
  /** Maximum number of images allowed */
  maxImages?: number;
  /** Maximum file size in MB */
  maxSizeMB?: number;
  /** Accepted file types */
  accept?: string;
  /** Whether upload is disabled */
  disabled?: boolean;
  /** Callback when upload state changes */
  onUploadingChange?: (uploading: boolean) => void;
  /** Label for the uploader */
  label?: string;
  /** Help text below the uploader */
  helpText?: string;
  /** View-only mode (no upload, just display) */
  readOnly?: boolean;
  /** Show primary image badge on first image */
  showPrimaryBadge?: boolean;
  /** Size of image tiles: 'sm' (h-20 w-20), 'md' (h-24 w-24), 'lg' (h-32 w-32) */
  tileSize?: 'sm' | 'md' | 'lg';
}

/**
 * Compact Admin Image Upload Component - Shopee-Style Grid
 * - Horizontal scrollable grid of small squares
 * - First square is the "Add Photo" button
 * - Subsequent squares are uploaded images with remove/reorder
 * - Follows Cyber Compact design system
 */
export const AdminImageUpload: React.FC<AdminImageUploadProps> = ({
  images,
  onChange,
  bucket = 'products',
  maxImages = 15,
  maxSizeMB = 5,
  accept = 'image/jpeg,image/png,image/webp',
  disabled = false,
  onUploadingChange,
  label,
  helpText,
  readOnly = false,
  showPrimaryBadge = true,
  tileSize = 'md',
}) => {
  const [localImages, setLocalImages] = useState<ImageItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragItemIndex = useRef<number | null>(null);

  // CRITICAL: Use ref to track latest images prop to avoid stale closure issues
  const imagesRef = useRef<string[]>(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  // Tile size classes
  const tileSizeClass = {
    sm: 'h-20 w-20',
    md: 'h-24 w-24',
    lg: 'h-32 w-32',
  }[tileSize];

  // Generate unique ID
  const generateId = () => `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Sync external images to local state - preserve order from prop
  useEffect(() => {
    setLocalImages((prev) => {
      // Get currently uploading/pending/error items (keep these as-is)
      const inProgressItems = prev.filter((li) => 
        li.status === 'uploading' || li.status === 'pending' || li.status === 'error'
      );
      
      // Build a map of existing URL -> ImageItem for reuse
      const existingByUrl = new Map(
        prev.filter((li) => li.status === 'success').map((li) => [li.url, li])
      );
      
      // Create items in the ORDER of the images prop
      const orderedSuccessItems: ImageItem[] = images.map((url) => {
        const existing = existingByUrl.get(url);
        if (existing) {
          return existing;
        }
        // New image, create item
        return {
          id: generateId(),
          url,
          status: 'success' as const,
          progress: 100,
        };
      });

      return [...orderedSuccessItems, ...inProgressItems];
    });
  }, [images]);

  // Propagate uploading state
  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  // Use ref to track localImages for cleanup to avoid stale closure
  const localImagesRef = useRef<ImageItem[]>(localImages);
  useEffect(() => {
    localImagesRef.current = localImages;
  }, [localImages]);

  // Cleanup blob URLs on unmount - using ref to get current value
  useEffect(() => {
    return () => {
      localImagesRef.current.forEach((li) => {
        if (li.tempUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(li.tempUrl);
        }
      });
    };
  }, []);

  const validateFiles = useCallback(
    (files: File[]): { valid: File[]; errors: string[] } => {
      const valid: File[] = [];
      const errors: string[] = [];
      const maxBytes = maxSizeMB * 1024 * 1024;
      const acceptedTypes = accept.split(',').map((t) => t.trim());

      const remaining = maxImages - images.length;
      console.log('[AdminImageUpload] validateFiles - remaining slots:', remaining, 'files to validate:', files.length);

      if (files.length > remaining) {
        errors.push(`Can only add ${remaining} more image(s)`);
        files = files.slice(0, remaining);
      }

      files.forEach((file) => {
        console.log('[AdminImageUpload] Validating file:', file.name, 'type:', file.type, 'size:', file.size);

        // Normalize MIME type - browsers can report different types for same format
        const normalizedType = file.type.toLowerCase();
        const isValidType = acceptedTypes.some((t) => {
          const acceptType = t.toLowerCase();
          if (normalizedType === acceptType) return true;
          if (acceptType === 'image/jpeg' && (normalizedType === 'image/jpg' || normalizedType === 'image/pjpeg')) return true;
          if (acceptType === '*' || acceptType === 'image/*') return true;
          const ext = file.name.split('.').pop()?.toLowerCase();
          if (ext && acceptType.includes(ext)) return true;
          return false;
        });

        if (!isValidType) {
          console.warn('[AdminImageUpload] File rejected - invalid type:', file.name, file.type);
          errors.push(`${file.name}: Invalid file type`);
          return;
        }
        if (file.size > maxBytes) {
          console.warn('[AdminImageUpload] File rejected - too large:', file.name, file.size);
          errors.push(`${file.name}: Exceeds ${maxSizeMB}MB limit`);
          return;
        }
        console.log('[AdminImageUpload] File accepted:', file.name);
        valid.push(file);
      });

      return { valid, errors };
    },
    [accept, maxImages, maxSizeMB, images.length]
  );

  const handleUpload = async (files: File[]) => {
    if (files.length === 0) return;

    const { valid, errors } = validateFiles(files);

    if (errors.length > 0) {
      setError(errors.join('. '));
      setTimeout(() => setError(null), 5000);
    }
    if (valid.length === 0) return;

    setUploading(true);
    setError(null);

    // Create local items with temp URLs
    const newItems: ImageItem[] = valid.map((file) => ({
      id: generateId(),
      url: '',
      tempUrl: URL.createObjectURL(file),
      status: 'uploading' as const,
      progress: 0,
      file,
    }));

    setLocalImages((prev) => [...prev, ...newItems]);

    try {
      const results: UploadResult[] = await uploadFiles(
        valid,
        bucket,
        (done, total) => {
          const progress = Math.round((done / total) * 100);
          setLocalImages((prev) =>
            prev.map((li) => {
              if (li.status === 'uploading') {
                return { ...li, progress: Math.min(progress, 99) };
              }
              return li;
            })
          );
        }
      );

      const successfulUrls: string[] = [];
      const uploadErrors: string[] = [];

      results.forEach((result, idx) => {
        const file = valid[idx];
        if (result?.success && result?.url) {
          successfulUrls.push(result.url);
        } else if (result?.error) {
          uploadErrors.push(`${file?.name || 'Unknown'}: ${result.error}`);
        }
      });

      setLocalImages((prev) =>
        prev.map((li) => {
          if (li.file && li.status === 'uploading') {
            const idx = valid.indexOf(li.file);
            if (idx !== -1) {
              const result = results[idx];
              if (result?.success && result?.url) {
                return { ...li, url: result.url, status: 'success', progress: 100 };
              } else {
                return { ...li, status: 'error', progress: 0 };
              }
            }
          }
          return li;
        })
      );

      if (uploadErrors.length > 0) {
        setError(uploadErrors.join('. '));
        setTimeout(() => setError(null), 10000);
      }

      if (successfulUrls.length > 0) {
        const currentImages = imagesRef.current;
        onChange([...currentImages, ...successfulUrls]);
      }
    } catch (err) {
      console.error('[AdminImageUpload] Upload failed:', err);
      setLocalImages((prev) =>
        prev.map((li) => (li.status === 'uploading' ? { ...li, status: 'error', progress: 0 } : li))
      );
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRetry = async (id: string) => {
    const item = localImages.find((li) => li.id === id);
    if (!item?.file) return;

    setLocalImages((prev) =>
      prev.map((li) => (li.id === id ? { ...li, status: 'uploading', progress: 0 } : li))
    );
    setUploading(true);
    setError(null);

    try {
      const [result] = await uploadFiles([item.file], bucket);
      if (result?.success && result?.url) {
        setLocalImages((prev) =>
          prev.map((li) =>
            li.id === id ? { ...li, url: result.url, status: 'success', progress: 100 } : li
          )
        );
        const currentImages = imagesRef.current;
        onChange([...currentImages, result.url]);
      } else {
        setLocalImages((prev) =>
          prev.map((li) => (li.id === id ? { ...li, status: 'error', progress: 0 } : li))
        );
        setError(result?.error || 'Upload failed.');
        setTimeout(() => setError(null), 10000);
      }
    } catch {
      setLocalImages((prev) =>
        prev.map((li) => (li.id === id ? { ...li, status: 'error', progress: 0 } : li))
      );
      setError('Upload failed.');
      setTimeout(() => setError(null), 10000);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (id: string) => {
    const item = localImages.find((li) => li.id === id);
    if (!item) return;

    if (item.tempUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(item.tempUrl);
    }

    setLocalImages((prev) => prev.filter((li) => li.id !== id));

    if (item.status === 'success' && item.url) {
      onChange(images.filter((url) => url !== item.url));
    }
  };

  // Drag handlers for reordering
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragItemIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragItemIndex.current !== null && dragItemIndex.current !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeaveImage = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    if (dragItemIndex.current === null || dragItemIndex.current === dropIndex) {
      return;
    }

    const successItems = localImages.filter((li) => li.status === 'success');
    const reordered = [...successItems];
    const [moved] = reordered.splice(dragItemIndex.current, 1);
    reordered.splice(dropIndex, 0, moved);

    const newUrls = reordered.map((li) => li.url);
    onChange(newUrls);
    dragItemIndex.current = null;
  };

  const handleDragEnd = (e: React.DragEvent) => {
    dragItemIndex.current = null;
    setDragOverIndex(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleUpload(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const successfulImages = localImages.filter((li) => li.status === 'success');
  const uploadingImages = localImages.filter((li) => li.status === 'uploading' || li.status === 'pending');
  const errorImages = localImages.filter((li) => li.status === 'error');
  const canAddMore = images.length < maxImages && !disabled;

  // View-only mode: just display images in a compact grid
  if (readOnly) {
    return (
      <div className="space-y-2">
        {label && <label className="admin-label text-sm">{label}</label>}
        
        {successfulImages.length === 0 ? (
          <div className="flex items-center gap-2 text-[var(--admin-text-muted)] text-sm">
            <ImageIcon size={16} />
            <span>No images</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {successfulImages.map((item, index) => (
              <div
                key={item.id}
                className={`relative ${tileSizeClass} rounded-lg overflow-hidden bg-[var(--admin-bg-elevated)] border border-[var(--admin-border)] flex-shrink-0`}
              >
                <img
                  src={item.url}
                  alt={`Image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {showPrimaryBadge && index === 0 && (
                  <div className="absolute top-1 left-1 bg-[var(--admin-accent)] text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                    Main
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && <label className="admin-label text-sm">{label}</label>}

      {/* Compact Horizontal Grid - Shopee Style */}
      <div className="flex flex-wrap gap-2">
        {/* Add Photo Button - First Tile */}
        {canAddMore && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            className={`
              ${tileSizeClass} flex-shrink-0
              flex flex-col items-center justify-center gap-1
              border-2 border-dashed rounded-lg
              transition-all duration-200 cursor-pointer
              ${uploading
                ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)]/10 cursor-wait'
                : 'border-[var(--admin-border-light)] hover:border-[var(--admin-accent)] hover:bg-[var(--admin-accent)]/5'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <Plus 
              size={24} 
              className={`${uploading ? 'text-[var(--admin-accent)] animate-pulse' : 'text-[var(--admin-text-muted)]'}`} 
            />
            <span className="text-[10px] text-[var(--admin-text-muted)] font-medium">
              {uploading ? 'Uploading...' : `Add (${images.length}/${maxImages})`}
            </span>
          </button>
        )}

        {/* Successful Images */}
        {successfulImages.map((item, index) => (
          <div
            key={item.id}
            className={`
              relative ${tileSizeClass} flex-shrink-0 rounded-lg overflow-hidden
              bg-[var(--admin-bg-elevated)] border group cursor-move transition-all duration-150
              ${dragOverIndex === index ? 'border-[var(--admin-accent)] border-2 scale-105 shadow-lg' : 'border-[var(--admin-border)]'}
              ${dragItemIndex.current === index ? 'opacity-50' : ''}
            `}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeaveImage}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
          >
            <img
              src={item.url}
              alt={`Image ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <GripVertical className="absolute top-1 left-1 h-4 w-4 text-white/70" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(item.id);
                }}
                className="p-1.5 bg-gradient-to-br from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 rounded shadow-lg transition-all duration-200 hover:scale-110 text-white flex items-center justify-center"
                title="Remove"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Primary badge */}
            {showPrimaryBadge && index === 0 && (
              <div className="absolute top-1 left-1 bg-[var(--admin-accent)] text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                Main
              </div>
            )}
            {/* Index badge */}
            <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1 py-0.5 rounded">
              {index + 1}
            </div>
          </div>
        ))}

        {/* Uploading Tiles */}
        {uploadingImages.map((item) => (
          <div
            key={item.id}
            className={`relative ${tileSizeClass} flex-shrink-0 rounded-lg overflow-hidden bg-[var(--admin-bg-elevated)] border border-[var(--admin-border)]`}
          >
            {item.tempUrl && (
              <img src={item.tempUrl} alt="Uploading" className="w-full h-full object-cover opacity-50" />
            )}
            {/* Progress Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
              <div className="w-3/4 h-1.5 bg-[var(--admin-bg-card)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--admin-accent)] transition-all duration-300"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              <span className="text-[10px] text-white mt-1">{item.progress}%</span>
            </div>
          </div>
        ))}

        {/* Error Tiles */}
        {errorImages.map((item) => (
          <div
            key={item.id}
            className={`relative ${tileSizeClass} flex-shrink-0 rounded-lg overflow-hidden bg-[var(--admin-error)]/10 border border-[var(--admin-error)]/30`}
          >
            {item.tempUrl && (
              <img src={item.tempUrl} alt="Failed" className="w-full h-full object-cover opacity-30" />
            )}
            {/* Error Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              <AlertCircle className="h-5 w-5 text-[var(--admin-error)]" />
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handleRetry(item.id)}
                  className="p-1 bg-[var(--admin-bg-card)] hover:bg-[var(--admin-bg-elevated)] rounded text-[var(--admin-text-secondary)] flex items-center justify-center"
                  title="Retry"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  className="p-1 bg-[var(--admin-bg-card)] hover:bg-[var(--admin-error)] rounded text-[var(--admin-text-secondary)] flex items-center justify-center"
                  title="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Hidden File Input */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-[var(--admin-error)] text-xs bg-[var(--admin-error)]/10 px-3 py-2 rounded-lg">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Help Text */}
      {helpText && (
        <p className="text-[10px] text-[var(--admin-text-muted)]">
          {helpText}
        </p>
      )}
    </div>
  );
};

export default AdminImageUpload;
