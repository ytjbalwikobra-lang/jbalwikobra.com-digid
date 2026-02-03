# Cyber-Compact Design System

## Native-App First Gaming E-commerce UI

**Target Audience:** Gen Z / Alpha Gamers (13-25 years old)  
**Philosophy:** Mobile-First, High Density, Neon Aesthetic

---

## 🎨 Color Palette

### Core Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--cyber-bg-pure` | `#000000` | Primary background |
| `--cyber-bg-surface` | `#0a0a0a` | Elevated surface |
| `--cyber-bg-elevated` | `#121212` | Cards, modals |
| `--cyber-bg-card` | `#1a1a1a` | Product cards |

### Neon Pink Spectrum

| Token | Value | Usage |
|-------|-------|-------|
| `--cyber-pink-glow` | `#ff2d92` | Glow effects, CTAs |
| `--cyber-pink-primary` | `#ec4899` | Primary accent |
| `--cyber-pink-secondary` | `#f472b6` | Secondary elements |
| `--cyber-pink-muted` | `rgba(236,72,153,0.3)` | Backgrounds |
| `--cyber-pink-subtle` | `rgba(236,72,153,0.15)` | Hover states |

### Text Hierarchy

| Token | Value | Usage |
|-------|-------|-------|
| `--cyber-text-primary` | `#ffffff` | Headings, prices |
| `--cyber-text-secondary` | `#a1a1aa` | Body text |
| `--cyber-text-muted` | `#71717a` | Captions, meta |
| `--cyber-text-disabled` | `#52525b` | Disabled states |

---

## 📐 Typography

**Font Stack:** Inter, -apple-system, BlinkMacSystemFont, sans-serif  
**Mono Font:** JetBrains Mono (for prices)

### Size Scale (Compact)

| Token | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `text-2xs` | 10px | 1.4 | Badges, labels |
| `text-xs` | 12px | 1.4 | Captions, meta |
| `text-sm` | 13px | 1.4 | Body small |
| `text-base` | 14px | 1.5 | Body default |
| `text-md` | 15px | 1.5 | Body emphasis |
| `text-lg` | 16px | 1.5 | Subheadings |
| `text-xl` | 18px | 1.5 | Headings |
| `text-2xl` | 20px | 1.4 | Titles |
| `text-3xl` | 24px | 1.3 | Hero text |

---

## 📦 Components

### 1. CyberBottomNav

Bottom navigation bar with 5 items: Home, Products, Search, Cart (with badge), Profile.

```tsx
import { CyberBottomNav } from '@/components/mobile';

<CyberBottomNav />
```

**Features:**
- 56px min height for touch accessibility
- Cart badge with item count
- Active state with neon glow indicator
- Safe area inset support for notched devices

### 2. BentoCatalog + BentoProductCard

High-density product grid with Quick Buy functionality.

```tsx
import { BentoCatalog, BentoProductProps } from '@/components/mobile';

const products: BentoProductProps[] = [
  {
    id: '1',
    name: 'Mobile Legends Diamond 86',
    slug: 'ml-diamond-86',
    imageUrl: '/images/ml-diamond.jpg',
    price: 19000,
    originalPrice: 25000,
    stock: 50,
    isFlashSale: true,
    flashSaleDiscount: 24,
  },
];

<BentoCatalog
  products={products}
  onQuickBuy={(id) => addToCart(id)}
/>
```

**Layout:**
- 2 columns on mobile (< 640px)
- 3 columns on tablet (640px - 1023px)
- 4 columns on desktop (>= 1024px)

**Features:**
- Lazy loading images
- Flash sale / New / Out of stock badges
- Quick Buy icon button
- Low stock warning (≤ 5 units)

### 3. CheckoutBottomSheet

Native-app style bottom sheet for cart review & checkout.

```tsx
import { CheckoutBottomSheet, CartItem } from '@/components/mobile';

const [isOpen, setIsOpen] = useState(false);

<CheckoutBottomSheet
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  items={cartItems}
  onUpdateQuantity={(id, qty) => updateCart(id, qty)}
  onRemoveItem={(id) => removeFromCart(id)}
  onCheckout={() => navigate('/checkout')}
/>
```

**Features:**
- Swipe-to-dismiss gesture
- Quantity adjustment controls
- Subtotal calculation
- Loading state for checkout button
- ESC key to close

---

## 🔍 GEO & AI SEO

### Schema Components

```tsx
import { 
  GEOProductSchema, 
  GEOCatalogSchema, 
  GEOOrganizationSchema,
  GEOAIHints 
} from '@/components/seo/GEOSchemas';

// Product page
<GEOProductSchema 
  product={product} 
  breadcrumbs={[
    { name: 'Home', url: '/' },
    { name: 'Mobile Legends', url: '/category/mobile-legends' },
    { name: product.name, url: `/product/${product.slug}` },
  ]} 
/>
<GEOAIHints 
  productName={product.name}
  price={product.price}
  category="Mobile Legends"
  inStock={product.stock > 0}
/>

// Homepage
<GEOOrganizationSchema />
```

### Agentic Commerce Protocol (ACP)

The `/api/acp/catalog` endpoint returns AI-friendly product data:

```json
{
  "protocol": "acp/1.0",
  "merchant": {
    "id": "jbalwikobra",
    "name": "JBAL Wikobra",
    "capabilities": ["product_listing", "checkout"]
  },
  "products": [...]
}
```

---

## 🎯 Design Principles

1. **High Data Density**  
   Pack more content in viewport without clutter. Use 12-14px base fonts.

2. **Haptic Visual Feedback**  
   Every tap should have visual response (scale, glow, color change).

3. **Dark Mode Default**  
   Pure black (#000000) background for OLED battery savings and gaming aesthetic.

4. **Thumb-Zone Optimized**  
   Primary actions at bottom of screen, within easy thumb reach.

5. **Instant Actions**  
   Quick Buy, swipe gestures, bottom sheets reduce friction.

---

## 📁 File Structure

```
src/
├── styles/
│   └── cyber-compact.css       # CSS variables & utility classes
├── components/
│   ├── mobile/
│   │   ├── index.ts            # Barrel exports
│   │   ├── CyberBottomNav.tsx  # Bottom navigation
│   │   ├── BentoProductCard.tsx # Product card
│   │   ├── BentoCatalog.tsx    # Product grid
│   │   └── CheckoutBottomSheet.tsx # Cart bottom sheet
│   └── seo/
│       └── GEOSchemas.tsx      # AI/SEO structured data
└── utils/
    └── geo-seo.ts              # Schema generators
```

---

## 🚀 Usage with Tailwind

All Cyber-Compact tokens are available in Tailwind:

```jsx
// Colors
<div className="bg-cyber-pure text-cyber-text">
  <button className="bg-cyber-pink hover:shadow-cyber-md">
    Buy Now
  </button>
</div>

// Typography
<h1 className="text-2xl font-mono">Rp 19.000</h1>
<p className="text-sm text-cyber-text-secondary">86 Diamonds</p>

// Transitions
<button className="transition-all ease-cyber duration-150">
  Click me
</button>
```
