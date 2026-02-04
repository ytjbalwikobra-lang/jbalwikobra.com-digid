import React, { 
  memo, 
  useCallback, 
  useEffect, 
  useRef, 
  useState 
} from 'react';
import { X, Minus, Plus, Trash2, ShoppingBag, CreditCard } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatCurrency } from '../../utils/helpers';

/**
 * Cyber-Compact Checkout Bottom Sheet
 * 
 * Native-App First checkout experience:
 * - Swipe-to-dismiss gesture
 * - Compact cart item display
 * - Quick quantity adjustment
 * - Instant checkout action
 * - Smooth spring animations
 */

export interface CartItem {
  id: string;
  name: string;
  imageUrl?: string;
  price: number;
  quantity: number;
  maxQuantity?: number;
}

interface CheckoutBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onCheckout: () => void;
  loading?: boolean;
}

const CheckoutBottomSheet: React.FC<CheckoutBottomSheetProps> = memo(({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  loading = false,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const startY = useRef(0);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Handle drag gestures for swipe-to-dismiss
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    if (diff > 0) {
      setDragY(diff);
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    if (dragY > 100) {
      onClose();
    }
    setDragY(0);
  }, [dragY, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleQuantityChange = useCallback((itemId: string, delta: number, currentQty: number, maxQty?: number) => {
    const newQty = currentQty + delta;
    if (newQty < 1) {
      onRemoveItem(itemId);
    } else if (!maxQty || newQty <= maxQty) {
      onUpdateQuantity(itemId, newQty);
    }
  }, [onUpdateQuantity, onRemoveItem]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/60 backdrop-blur-sm z-[99]',
          'transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          'cyber-bottom-sheet',
          isOpen && 'open'
        )}
        style={{
          transform: isOpen 
            ? `translateY(${dragY}px)` 
            : 'translateY(100%)',
          transition: isDragging ? 'none' : undefined,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Checkout"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing">
          <div className="cyber-bottom-sheet-handle" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--cyber-border)]">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-[var(--cyber-pink-primary)]" />
            <h2 className="text-[var(--cyber-text-primary)] font-semibold text-base">
              Keranjang
            </h2>
            {totalItems > 0 && (
              <span className="cyber-badge bg-[var(--cyber-pink-muted)] text-[var(--cyber-pink-primary)]">
                {totalItems}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-xl text-[var(--cyber-text-muted)] hover:text-[var(--cyber-text-primary)] hover:bg-[var(--cyber-bg-card)] transition-colors"
            aria-label="Close cart"
          >
            <X size={20} />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto cyber-scrollbar px-4 py-3 max-h-[50vh]">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingBag size={48} className="text-[var(--cyber-text-muted)] mb-3" strokeWidth={1.5} />
              <p className="text-[var(--cyber-text-muted)] text-sm">
                Keranjang kosong
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 p-2 rounded-xl bg-[var(--cyber-bg-card)] border border-[var(--cyber-border)]"
                >
                  {/* Product Image */}
                  <div className="w-16 h-16 rounded-md overflow-hidden bg-[var(--cyber-bg-surface)] flex-shrink-0">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag size={20} className="text-[var(--cyber-text-muted)]" />
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[var(--cyber-text-primary)] text-[13px] font-medium line-clamp-2 mb-1">
                      {item.name}
                    </h3>
                    <p className="cyber-price text-sm">
                      {formatCurrency(item.price)}
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1.5 text-[var(--cyber-text-muted)] hover:text-[var(--cyber-red)] transition-colors"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleQuantityChange(item.id, -1, item.quantity)}
                        className="w-7 h-7 rounded-md bg-[var(--cyber-bg-elevated)] border border-[var(--cyber-border)] flex items-center justify-center text-[var(--cyber-text-secondary)] hover:border-[var(--cyber-pink-primary)] transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-6 text-center text-[var(--cyber-text-primary)] text-xs font-medium font-mono">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(item.id, 1, item.quantity, item.maxQuantity)}
                        className="w-7 h-7 rounded-md bg-[var(--cyber-bg-elevated)] border border-[var(--cyber-border)] flex items-center justify-center text-[var(--cyber-text-secondary)] hover:border-[var(--cyber-pink-primary)] transition-colors"
                        aria-label="Increase quantity"
                        disabled={item.maxQuantity !== undefined && item.quantity >= item.maxQuantity}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Total & Checkout */}
        {items.length > 0 && (
          <div className="border-t border-[var(--cyber-border)] p-4 space-y-3 bg-[var(--cyber-bg-surface)]">
            {/* Subtotal */}
            <div className="flex items-center justify-between">
              <span className="text-[var(--cyber-text-secondary)] text-sm">
                Subtotal ({totalItems} item{totalItems > 1 ? 's' : ''})
              </span>
              <span className="cyber-price text-base">
                {formatCurrency(subtotal)}
              </span>
            </div>

            {/* Checkout Button */}
            <button
              onClick={onCheckout}
              disabled={loading}
              className={cn(
                'cyber-btn-primary w-full py-3 flex items-center justify-center gap-2',
                loading && 'opacity-70 cursor-not-allowed'
              )}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CreditCard size={18} />
                  <span>Checkout</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
});

CheckoutBottomSheet.displayName = 'CheckoutBottomSheet';

export default CheckoutBottomSheet;
