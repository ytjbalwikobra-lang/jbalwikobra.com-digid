import { Banner } from '../../../../services/adminService';

export interface BannerFormData {
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  cta_text: string;
  sort_order: number;
  is_active: boolean;
}

export interface BannerFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingBanner: Banner | null;
  onSubmit: (formData: BannerFormData) => void;
  submitting: boolean;
}

export interface ImagePreviewModalProps {
  imageUrl: string | null;
  onClose: () => void;
}
