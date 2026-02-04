import React from 'react';
import { X } from 'lucide-react';
import { ImagePreviewModalProps } from './types';

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  imageUrl,
  onClose
}) => {
  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative max-w-4xl max-h-4xl p-4">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-all duration-200 backdrop-blur-sm border border-[var(--cyber-border)] hover:border-[var(--cyber-border)]"
        >
          <X className="w-5 h-5" />
        </button>
        <img
          src={imageUrl}
          alt="Full size preview"
          className="max-w-full max-h-full object-contain rounded-cyber-2xl shadow-2xl border border-[var(--cyber-border)]"
          onClick={onClose}
        />
      </div>
    </div>
  );
};
