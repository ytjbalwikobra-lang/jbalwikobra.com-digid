import React from 'react';
import { AdminImageUpload } from '../ui/AdminImageUpload';

interface ImagesSectionProps {
  images: string[];
  onChange: (images: string[]) => void;
  onUploadingChange?: (uploading: boolean) => void;
}

export const ImagesSection: React.FC<ImagesSectionProps> = ({ images, onChange, onUploadingChange }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white border-b pb-2" style={{ borderColor: 'var(--admin-border)' }}>
        Product Images
      </h3>
      <AdminImageUpload
        images={images}
        onChange={onChange}
        bucket="products"
        maxImages={15}
        onUploadingChange={onUploadingChange}
        helpText="Drag & drop or click to upload. Max 5MB per file, up to 15 images."
      />
    </div>
  );
};

export default ImagesSection;
