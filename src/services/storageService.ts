import { supabase } from './supabase';

const BUCKET = process.env.REACT_APP_SUPABASE_STORAGE_BUCKET || 'product-images';

export interface UploadResult {
  path: string;
  url: string;
}

export async function uploadFile(file: File, folder = 'products'): Promise<UploadResult> {
  if (!supabase) {
    const error = new Error('Supabase not initialized');
    console.error('[StorageService] Supabase client not available:', error);
    throw error;
  }
  
  try {
    // Validate file before upload
    if (!file || !(file instanceof File)) {
      throw new Error('Invalid file provided');
    }
    
    if (file.size === 0) {
      throw new Error('File is empty');
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('File size too large (max 10MB)');
    }
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Invalid file type: ${file.type}. Allowed: ${allowedTypes.join(', ')}`);
    }
    
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2);
    const path = `${folder}/${timestamp}_${random}_${safeName}`;
    
    const isProduction = process.env.NODE_ENV === 'production';
    
    const { data: uploadData, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        upsert: false,
        cacheControl: '31536000', // 1 year - files are immutable (unique paths)
        contentType: file.type || `image/${ext}`
      });
    
    if (error) {
      console.error('[StorageService] Upload error:', {
        error,
        code: error.message,
        path,
        bucket: BUCKET,
        fileSize: file.size,
        fileType: file.type,
        isProduction
      });
      
      // Provide more specific error messages
      if (error.message?.includes('Bucket not found')) {
        throw new Error(`Storage bucket '${BUCKET}' not found. Please check Supabase storage configuration.`);
      }
      
      if (error.message?.includes('Insufficient permissions')) {
        throw new Error('Insufficient permissions to upload files. Please check storage policies.');
      }
      
      if (error.message?.includes('File already exists')) {
        throw new Error('File with this name already exists. Please try again.');
      }
      
      throw error;
    }
    
    if (!uploadData?.path) {
      throw new Error('Upload succeeded but no path returned');
    }
    
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(uploadData.path);
    
    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL for uploaded file');
    }
    
    return {
      path: uploadData.path,
      url: urlData.publicUrl
    };
  } catch (error) {
    console.error('[StorageService] Upload file error:', {
      error: error instanceof Error ? error.message : String(error),
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      folder,
      bucket: BUCKET,
      isProduction: process.env.NODE_ENV === 'production',
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

export async function uploadFiles(
  files: File[],
  folder = 'products',
  onProgress?: (done: number, total: number) => void,
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  const total = files.length;
  let done = 0;
  
  for (const file of files) {
    try {
      const result = await uploadFile(file, folder);
      results.push(result);
    } catch (error) {
      console.error('Failed to upload file:', file.name, error);
      // Continue with other files
    }
    
    done += 1;
    try { 
      onProgress?.(done, total); 
    } catch (cbErr) {
      // Intentionally ignore progress callback errors to avoid breaking uploads
      if (process.env.NODE_ENV === 'development') {
        console.debug('uploadFiles progress callback error (ignored):', cbErr);
      }
    }
  }
  
  return results;
}

function urlToPath(url: string): string | null {
  try {
    const u = new URL(url);
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    return u.pathname.substring(idx + marker.length) + (u.search || '');
  } catch (_e) {
    return null;
  }
}

export async function deletePublicUrls(urls: string[]): Promise<void> {
  if (!supabase || !urls.length) {
    console.log('[StorageService] deletePublicUrls: skipped (no supabase or empty urls)');
    return;
  }
  const paths = urls.map(urlToPath).filter(Boolean) as string[];
  if (!paths.length) {
    console.warn('[StorageService] deletePublicUrls: no valid paths extracted from URLs:', urls);
    return;
  }
  console.log('[StorageService] deletePublicUrls: removing paths from storage:', paths);
  const { error } = await (supabase as any).storage.from(BUCKET).remove(paths);
  if (error) {
    console.warn('[StorageService] Storage delete warning:', error);
  } else {
    console.log('[StorageService] Successfully deleted files from storage');
  }
}

// Game Logo Storage Functions
export class GameLogoStorage {
  private static readonly BUCKET = 'game-logos';
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

  /**
   * Upload game logo to Supabase Storage
   */
  static async uploadGameLogo(file: File, gameSlug: string): Promise<string> {
    try {
      // Validate file
      this.validateFile(file);

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${gameSlug}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      // Upload file to storage
      const { data, error } = await (supabase as any).storage
        .from(this.BUCKET)
        .upload(filePath, file, {
          cacheControl: '31536000', // 1 year - files are immutable (unique paths)
          upsert: false
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      return data.path;
    } catch (error) {
      console.error('Error uploading game logo:', error);
      throw error;
    }
  }

  /**
   * Update existing game logo
   */
  static async updateGameLogo(file: File, gameSlug: string, oldPath?: string): Promise<string> {
    try {
      // Delete old file if exists
      if (oldPath) {
        await this.deleteGameLogo(oldPath);
      }

      // Upload new file
      return await this.uploadGameLogo(file, gameSlug);
    } catch (error) {
      console.error('Error updating game logo:', error);
      throw error;
    }
  }

  /**
   * Delete game logo from storage
   */
  static async deleteGameLogo(filePath: string): Promise<void> {
    try {
      const { error } = await (supabase as any).storage
        .from(this.BUCKET)
        .remove([filePath]);

      if (error) {
        console.error('Error deleting file:', error);
        // Don't throw error for delete failures to avoid blocking updates
      }
    } catch (error) {
      console.error('Error deleting game logo:', error);
      // Don't throw error for delete failures
    }
  }

  /**
   * Get public URL for uploaded game logo
   */
  static getGameLogoUrl(filePath: string): string {
    const { data } = (supabase as any).storage
      .from(this.BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  /**
   * Validate uploaded file
   */
  private static validateFile(file: File): void {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File size too large. Maximum size is ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Check file type
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`Invalid file type. Allowed types: ${this.ALLOWED_TYPES.join(', ')}`);
    }
  }
}

// Export instance for easy use
export const gameLogoStorage = GameLogoStorage;
