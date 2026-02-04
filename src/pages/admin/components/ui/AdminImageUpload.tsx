import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, X, RefreshCw, GripVertical, AlertCircle } from 'lucide-react';
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
  /** Grid columns for image display */
  gridCols?: number;
}

/**
 * Unified Admin Image Upload Component
 * - Follows admin design system v3
 * - Drag and drop support
 * - Multi-file upload with progress
 * - Reorder via drag
 * - Error handling with retry
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
  helpText = 'Drag & drop or click to upload. Max size per file: 5MB',
  readOnly = false,
  showPrimaryBadge = true,
  gridCols = 6,
}) => {
  const [localImages, setLocalImages] = useState<ImageItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragItemIndex = useRef<number | null>(null);

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

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      localImages.forEach((li) => {
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
      if (files.length > remaining) {
        errors.push(`Can only add ${remaining} more image(s)`);
        files = files.slice(0, remaining);
      }

      files.forEach((file) => {
        if (!acceptedTypes.some((t) => file.type === t || t === '*')) {
          errors.push(`${file.name}: Invalid file type`);
          return;
        }
        if (file.size > maxBytes) {
          errors.push(`${file.name}: Exceeds ${maxSizeMB}MB limit`);
          return;
        }
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

      // Update local items with results
      const successfulUrls: string[] = [];
      setLocalImages((prev) =>
        prev.map((li) => {
          if (li.file && li.status === 'uploading') {
            const idx = valid.indexOf(li.file);
            if (idx !== -1) {
              const result = results[idx];
              if (result?.url) {
                successfulUrls.push(result.url);
                return { ...li, url: result.url, status: 'success', progress: 100 };
              } else {
                return { ...li, status: 'error', progress: 0 };
              }
            }
          }
          return li;
        })
      );

      // Update parent with new URLs
      if (successfulUrls.length > 0) {
        onChange([...images, ...successfulUrls]);
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

    try {
      const [result] = await uploadFiles([item.file], bucket);
      if (result?.url) {
        setLocalImages((prev) =>
          prev.map((li) =>
            li.id === id ? { ...li, url: result.url, status: 'success', progress: 100 } : li
          )
        );
        onChange([...images, result.url]);
      } else {
        setLocalImages((prev) =>
          prev.map((li) => (li.id === id ? { ...li, status: 'error', progress: 0 } : li))
        );
      }
    } catch {
      setLocalImages((prev) =>
        prev.map((li) => (li.id === id ? { ...li, status: 'error', progress: 0 } : li))
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (id: string) => {
    const item = localImages.find((li) => li.id === id);
    if (!item) return;

    // Revoke blob URL if exists
    if (item.tempUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(item.tempUrl);
    }

    setLocalImages((prev) => prev.filter((li) => li.id !== id));

    // Remove from parent if it was successful
    if (item.status === 'success' && item.url) {
      onChange(images.filter((url) => url !== item.url));
    }
  };

  // Drag handlers for reordering
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragItemIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
    // Add drag image styling
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
    // Reset opacity
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  // File input handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleUpload(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  // Drop zone handlers
  const handleDropZoneDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleUpload(Array.from(e.dataTransfer.files));
    }
  };

  const successfulImages = localImages.filter((li) => li.status === 'success');
  const uploadingImages = localImages.filter((li) => li.status === 'uploading' || li.status === 'pending');
  const errorImages = localImages.filter((li) => li.status === 'error');

  // Dynamic grid columns class
  const gridColsClass = {
    3: 'grid-cols-3',
    4: 'grid-cols-3 sm:grid-cols-4',
    5: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5',
    6: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6',
  }[gridCols] || 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6';

  // View-only mode: just display images
  if (readOnly) {
    return (
      <div className="space-y-4">
        {label && <label className="admin-label">{label}</label>}
        
        {successfulImages.length === 0 ? (
          <p className="text-gray-400 text-sm">No images</p>
        ) : (
          <div className={`grid ${gridColsClass} gap-3`}>
            {successfulImages.map((item, index) => (
              <div
                key={item.id}
                className="relative aspect-square rounded-xl overflow-hidden bg-gray-800 border border-gray-700"
              >
                <img
                  src={item.url}
                  alt={`Image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {/* Primary badge */}
                {showPrimaryBadge && index === 0 && (
                  <div className="absolute top-1 left-1 bg-pink-500 text-white text-xs px-2 py-0.5 rounded">
                    Primary
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
    <div className="space-y-4">
      {label && <label className="admin-label">{label}</label>}

      {/* Drop Zone */}
      <div
        className={`
          border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer
          ${dragOver ? 'border-pink-500 bg-pink-500/10' : 'border-gray-600 bg-gray-800/50'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-pink-500/50 hover:bg-gray-800'}
        `}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDropZoneDrop}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-300 mb-2">
          {uploading ? 'Uploading...' : 'Drag & drop images here'}
        </p>
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          disabled={disabled || uploading}
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
        >
          Select Images
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled}
        />
        <p className="text-xs text-gray-400 mt-2">
          {helpText} ({images.length}/{maxImages})
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-xl">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Uploading items */}
      {uploadingImages.length > 0 && (
        <div className="space-y-2">
          {uploadingImages.map((item) => (
            <div key={item.id} className="flex items-center gap-3 bg-gray-800 p-3 rounded-xl">
              <div className="w-12 h-12 bg-gray-700 rounded overflow-hidden">
                {item.tempUrl && (
                  <img src={item.tempUrl} alt="Uploading" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-pink-500 transition-all duration-300"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Uploading... {item.progress}%</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error items */}
      {errorImages.length > 0 && (
        <div className="space-y-2">
          {errorImages.map((item) => (
            <div key={item.id} className="flex items-center gap-3 bg-red-500/10 p-3 rounded-xl border border-red-500/30">
              <div className="w-12 h-12 bg-gray-700 rounded overflow-hidden">
                {item.tempUrl && (
                  <img src={item.tempUrl} alt="Failed" className="w-full h-full object-cover opacity-50" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-red-400">Upload failed</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleRetry(item.id)}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-xl text-gray-300"
                  title="Retry"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  className="p-2 bg-gray-700 hover:bg-red-600 rounded-xl text-gray-300"
                  title="Remove"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Successful images grid */}
      {successfulImages.length > 0 && (
        <div className={`grid ${gridColsClass} gap-3`}>
          {successfulImages.map((item, index) => (
            <div
              key={item.id}
              className={`
                relative aspect-square rounded-xl overflow-hidden bg-gray-800 border group cursor-move transition-all
                ${dragOverIndex === index ? 'border-pink-500 border-2 scale-105' : 'border-gray-700'}
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
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <GripVertical className="h-5 w-5 text-white/70 absolute top-2 left-2" />
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  className="p-2 bg-red-600 hover:bg-red-700 rounded-xl text-white"
                  title="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {/* Primary badge */}
              {showPrimaryBadge && index === 0 && (
                <div className="absolute top-1 left-1 bg-pink-500 text-white text-xs px-2 py-0.5 rounded">
                  Primary
                </div>
              )}
              {/* Index badge */}
              <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminImageUpload;
