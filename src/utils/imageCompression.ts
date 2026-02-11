/**
 * Utilitas kompresi gambar sederhana memakai canvas.
 * Mengurangi dimensi & kualitas agar ukuran < ~3MB.
 */
export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const { maxWidth = 1280, maxHeight = 1280, quality = 0.82 } = options;

  // Lewati kompresi untuk GIF agar animasi aman
  if (file.type === 'image/gif') return file;

  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);

  let { width, height } = img;
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, width, height);

  const blob: Blob | null = await new Promise((resolve) => {
    canvas.toBlob(
      (result) => resolve(result),
      file.type === 'image/png' ? 'image/png' : 'image/jpeg',
      quality
    );
  });

  if (!blob) return file;

  // Jika hasil lebih besar, pakai file asli saja
  if (blob.size >= file.size) return file;

  const compressed = new File([blob], file.name.replace(/\.(\w+)$/, '.jpg'), {
    type: blob.type,
    lastModified: Date.now()
  });

  return compressed;
}
