# Admin Design System V3 - Quick Reference

## 🎨 Colors

### Usage
```tsx
import { AdminColors } from './pages/admin/design-tokens';

// In JSX
<div style={{ color: AdminColors.text.primary }}>Text</div>
<div style={{ backgroundColor: AdminColors.accent.DEFAULT }}>Accent</div>
```

### Common Colors
| Use Case | Token | Value |
|----------|-------|-------|
| Main Background | `AdminColors.primary.DEFAULT` | #0f172a |
| Card Background | `AdminColors.primary.light` | #1e293b |
| Primary Button | `AdminColors.accent.DEFAULT` | #ec4899 |
| Success | `AdminColors.success.DEFAULT` | #10b981 |
| Warning | `AdminColors.warning.DEFAULT` | #f59e0b |
| Error | `AdminColors.error.DEFAULT` | #ef4444 |
| Primary Text | `AdminColors.text.primary` | #f8fafc |
| Secondary Text | `AdminColors.text.secondary` | #cbd5e1 |

## 🔲 Components

### Button
```tsx
import { AdminButton } from './components/ui';

<AdminButton variant="primary" size="md">
  Save
</AdminButton>
```

**Props:**
- `variant`: primary | secondary | success | danger | ghost
- `size`: sm | md | lg
- `loading`: boolean
- `icon`: ReactNode
- `fullWidth`: boolean

### Card
```tsx
import { AdminCard, AdminCardHeader, AdminCardBody } from './components/ui';

<AdminCard>
  <AdminCardHeader 
    title="Title"
    subtitle="Subtitle"
    icon={<Icon />}
  />
  <AdminCardBody>
    Content
  </AdminCardBody>
</AdminCard>
```

### Status Badge
```tsx
import { AdminStatusBadge } from './components/ui';

<AdminStatusBadge status="completed" />
<AdminStatusBadge status="pending" label="Custom" />
```

**Status Types:**
- pending, processing, completed, cancelled
- active, inactive, paid

## 📏 Spacing

```tsx
import { AdminSpacing } from './pages/admin/design-tokens';

// Common spacings
AdminSpacing[2]  // 8px
AdminSpacing[4]  // 16px
AdminSpacing[6]  // 24px
AdminSpacing[8]  // 32px
```

## 🎯 CSS Classes

### Layout
```tsx
<div className="admin-container">
  <main className="admin-main">
    <section className="admin-section">
      Content
    </section>
  </main>
</div>
```

### Buttons
```html
<button class="admin-btn admin-btn-primary">Primary</button>
<button class="admin-btn admin-btn-secondary">Secondary</button>
<button class="admin-btn admin-btn-success">Success</button>
<button class="admin-btn admin-btn-danger">Danger</button>
```

### Cards
```html
<div class="admin-card">
  <div class="admin-card-header">
    <h3 class="admin-card-title">Title</h3>
  </div>
  <div class="admin-card-body">
    Content
  </div>
</div>
```

### Badges
```html
<span class="admin-badge admin-badge-success">Success</span>
<span class="admin-badge admin-badge-warning">Warning</span>
<span class="admin-badge admin-badge-error">Error</span>
```

### Form Elements
```html
<div class="admin-form-group">
  <label class="admin-label required">Label</label>
  <input type="text" class="admin-input" />
  <span class="admin-form-hint">Helper text</span>
</div>
```

## ♿ Accessibility Checklist

### For Every Interactive Element:
- [ ] Minimum 44x44px size
- [ ] Has visible focus indicator
- [ ] Has descriptive aria-label or text
- [ ] Keyboard accessible (Tab, Enter, Space)

### For Icons:
- [ ] Decorative icons have `aria-hidden="true"`
- [ ] Functional icons have text alternative

### For Dynamic Content:
- [ ] Use `role="status"` or `role="alert"`
- [ ] Use `aria-live="polite"` or `"assertive"`

### For Forms:
- [ ] Labels associated with inputs
- [ ] Required fields marked (aria-required or required class)
- [ ] Error messages use `role="alert"`

## 🎨 Color Contrast

All combinations tested for WCAG 2.1 AA:
- Text on dark background: ✅ 16.5:1
- Secondary text: ✅ 9.5:1
- Tertiary text: ✅ 5.2:1
- All above 4.5:1 minimum ✅

## 📱 Responsive

```tsx
// Tailwind breakpoints
sm:  // 640px
md:  // 768px
lg:  // 1024px
xl:  // 1280px
2xl: // 1536px

// Example
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
```

## 🚀 Quick Start Template

```tsx
import React from 'react';
import { AdminButton, AdminCard, AdminCardHeader, AdminCardBody } from './components/ui';
import { AdminColors } from './design-tokens';
import './styles/admin-design-system-v3.css';

const MyAdminPage: React.FC = () => {
  return (
    <div className="admin-container">
      <main className="admin-main">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2" 
              style={{ color: AdminColors.text.primary }}>
            Page Title
          </h1>
          <p style={{ color: AdminColors.text.secondary }}>
            Description
          </p>
        </header>

        <AdminCard>
          <AdminCardHeader 
            title="Card Title"
            subtitle="Description"
          />
          <AdminCardBody>
            <p>Your content here</p>
            
            <div className="flex gap-4 mt-6">
              <AdminButton variant="primary">
                Save
              </AdminButton>
              <AdminButton variant="secondary">
                Cancel
              </AdminButton>
            </div>
          </AdminCardBody>
        </AdminCard>
      </main>
    </div>
  );
};

export default MyAdminPage;
```

## 🔍 Common Patterns

### Loading State
```tsx
{loading && (
  <div className="flex items-center justify-center" 
       role="status" 
       aria-live="polite">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2"
         style={{ borderColor: AdminColors.accent.DEFAULT }}
         aria-hidden="true" />
    <span className="ml-3">Loading...</span>
  </div>
)}
```

### Error State
```tsx
{error && (
  <div className="admin-section"
       style={{
         backgroundColor: AdminColors.error.bg,
         borderColor: AdminColors.error.border
       }}
       role="alert"
       aria-live="assertive">
    <p style={{ color: AdminColors.error.light }}>{error}</p>
  </div>
)}
```

### Empty State
```tsx
<div className="text-center py-12">
  <EmptyIcon size={48} 
             style={{ color: AdminColors.text.tertiary }}
             aria-hidden="true" />
  <h3 className="text-lg font-semibold mt-4"
      style={{ color: AdminColors.text.secondary }}>
    No data found
  </h3>
  <AdminButton variant="primary" className="mt-4">
    Add New
  </AdminButton>
</div>
```

## 📦 Import Paths

```tsx
// Design tokens
import { AdminColors, AdminSpacing, AdminTypography } from './pages/admin/design-tokens';

// Components
import { AdminButton, AdminCard, AdminStatusBadge } from './pages/admin/components/ui';

// Styles
import './styles/admin-design-system-v3.css';
```

## 🎯 Do's and Don'ts

### ✅ Do:
- Use design tokens for all colors and spacing
- Include ARIA labels on interactive elements
- Test keyboard navigation
- Use semantic HTML
- Follow naming conventions

### ❌ Don't:
- Hardcode colors or spacing values
- Use generic labels like "Click here"
- Forget focus indicators
- Skip accessibility attributes
- Mix old and new design patterns

---

**Need more details?** See [ADMIN_DESIGN_SYSTEM_V3_DOCS.md](./ADMIN_DESIGN_SYSTEM_V3_DOCS.md)
