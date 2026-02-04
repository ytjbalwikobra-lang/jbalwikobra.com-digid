import { useState, useCallback, useRef } from 'react';
import { uploadFiles, deletePublicUrls } from '../services/storageService';

/**
 * useImageGallery - Reusable hook for managing image galleries in modals
 * 
 * Eliminates duplicate image handling logic:
 * - ProductModal has 200+ lines of image upload/drag-drop/reorder logic
 * - BannerForm has similar but simpler image handling
 * - Reduces code duplication and provides consistent UX
 * 
 * Features:
 * - Multi-file upload with progress tracking
 * - Drag-and-drop reordering
 * - File validation (size, type)
 * - Automatic cleanup on remove
 * - Egress optimization: Only uploads on user action
 */

export interface ImageItem {
  id: string;
  url: string;
  isUploading?: boolean;
  error?: string;
}

export interface UseImageGalleryOptions {
  /** Maximum number of images allowed */
  maxImages?: number;
  /** Maximum file size in bytes (default: 5MB) */
  maxFileSize?: number;
  /** Allowed MIME types */
  allowedTypes?: string[];
  /** Storage bucket path */
  storagePath?: string;
  /** Initial images */
  initialImages?: string[];
  /** On error callback */
  onError?: (message: string) => void;
  /** On success callback */
  onSuccess?: (message: string) => void;
}

export interface UseImageGalleryResult {
  /** Current images */
  images: ImageItem[];
  /** Set images directly */
  setImages: React.Dispatch<React.SetStateAction<ImageItem[]>>;
  /** Upload progress */
  uploadProgress: { done: number; total: number };
  /** File input ref */
  fileInputRef: React.RefObject<HTMLInputElement>;
  /** Handle file selection */
  handleFileSelect: (files: FileList | null) => Promise<void>;
  /** Remove image by index */
  removeImage: (index: number) => Promise<void>;
  /** Drag handlers for reordering */
  dragHandlers: {
    onDragStart: (index: number) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, dropIndex: number) => void;
    draggedIndex: number | null;
  };
  /** Get all image URLs */
  getImageUrls: () => string[];
  /** Get primary image URL */
  getPrimaryImage: () => string | undefined;
  /** Check if uploading */
  isUploading: boolean;
}

export function useImageGallery(options: UseImageGalleryOptions = {}): UseImageGalleryResult {
  const {
    maxImages = 15,
    maxFileSize = 5 * 1024 * 1024, // 5MB
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    storagePath = 'products',
    initialImages = [],
    onError,
    onSuccess
  } = options;

  const [images, setImages] = useState<ImageItem[]>(() =>
    initialImages.map((url, index) => ({
      id: `initial-${index}`,
      url
    }))
  );
  
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if any image is uploading
  const isUploading = images.some(img => img.isUploading);

  // Handle file selection and upload
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || images.length >= maxImages) {
      if (images.length >= maxImages) {
        onError?.(`Maximum ${maxImages} images allowed`);
      }
      return;
    }

    const filesArray = Array.from(files);
    
    // Validate file sizes and types
    const invalidFiles = filesArray.filter(file => 
      file.size > maxFileSize || !allowedTypes.includes(file.type)
    );
    
    if (invalidFiles.length > 0) {
      const sizeErrors = invalidFiles.filter(f => f.size > maxFileSize);
      const typeErrors = invalidFiles.filter(f => !allowedTypes.includes(f.type));
      
      if (sizeErrors.length > 0) {
        onError?.(`${sizeErrors.length} file(s) exceed ${Math.round(maxFileSize / 1024 / 1024)}MB limit`);
      }
      if (typeErrors.length > 0) {
        const allowedExts = allowedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ');
        onError?.(`Only ${allowedExts} images are allowed`);
      }
      return;
    }

    const remainingSlots = maxImages - images.length;
    const filesToUpload = filesArray.slice(0, remainingSlots);

    if (filesToUpload.length === 0) {
      onError?.(`Maximum ${maxImages} images allowed`);
      return;
    }

    // Add uploading placeholders
    const newItems: ImageItem[] = filesToUpload.map((file, index) => ({
      id: `uploading-${Date.now()}-${index}`,
      url: URL.createObjectURL(file),
      isUploading: true
    }));

    setImages(prev => [...prev, ...newItems]);

    try {
      const results = await uploadFiles(
        filesToUpload,
        storagePath,
        (done, total) => setUploadProgress({ done, total })
      );

      // Update the items with actual URLs
      setImages(prev => 
        prev.map(item => {
          const uploadIndex = newItems.findIndex(newItem => newItem.id === item.id);
          if (uploadIndex !== -1 && results[uploadIndex]) {
            return {
              ...item,
              url: results[uploadIndex].url,
              isUploading: false
            };
          }
          return item;
        })
      );

      onSuccess?.(`Uploaded ${results.length} image(s) successfully!`);
    } catch (error: any) {
      // Remove failed uploads
      setImages(prev => 
        prev.filter(item => !newItems.some(newItem => newItem.id === item.id))
      );
      onError?.(`Failed to upload images: ${error.message}`);
    } finally {
      setUploadProgress({ done: 0, total: 0 });
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [images.length, maxImages, maxFileSize, allowedTypes, storagePath, onError, onSuccess]);

  // Remove image
  const removeImage = useCallback(async (index: number) => {
    const item = images[index];
    if (!item) return;

    // If it's an uploaded image (not from initial/existing), try to delete from storage
    if (item.id.startsWith('uploading-') && !item.isUploading) {
      try {
        await deletePublicUrls([item.url]);
      } catch (error) {
        console.warn('Failed to delete image from storage:', error);
      }
    }

    setImages(prev => prev.filter((_, i) => i !== index));
  }, [images]);

  // Drag handlers for reordering
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    setImages(prev => {
      const newItems = [...prev];
      const draggedItem = newItems[draggedIndex];
      newItems.splice(draggedIndex, 1);
      newItems.splice(dropIndex, 0, draggedItem);
      return newItems;
    });

    setDraggedIndex(null);
  }, [draggedIndex]);

  // Get all image URLs
  const getImageUrls = useCallback(() => {
    return images.filter(img => !img.isUploading).map(img => img.url);
  }, [images]);

  // Get primary image (first one)
  const getPrimaryImage = useCallback(() => {
    return images.find(img => !img.isUploading)?.url;
  }, [images]);

  return {
    images,
    setImages,
    uploadProgress,
    fileInputRef,
    handleFileSelect,
    removeImage,
    dragHandlers: {
      onDragStart: handleDragStart,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
      draggedIndex
    },
    getImageUrls,
    getPrimaryImage,
    isUploading
  };
}
