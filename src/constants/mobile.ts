/**
 * Mobile Constants - Shared constants for mobile-first design
 * 
 * Single source of truth for:
 * - Touch targets
 * - Safe areas
 * - Spacing
 * - Animation durations
 */

export const MOBILE_CONSTANTS = {
  // Touch targets (Apple HIG recommends 44pt minimum)
  MIN_TOUCH_TARGET: 44,
  RECOMMENDED_TOUCH_TARGET: 48,
  
  // Gallery
  GALLERY_PLACEHOLDER_COUNT: 5,
  MAX_GALLERY_IMAGES: 15,
  
  // Layout
  HEADER_HEIGHT: 64,
  BOTTOM_NAV_HEIGHT: 72,
  BOTTOM_SAFE_AREA: 140, // Account for bottom navigation + action buttons
  
  // Spacing
  CONTENT_PADDING: 16,
  CARD_PADDING: 20,
  SECTION_GAP: 24,
  ELEMENT_GAP: 16,
  
  // Animation
  SPRING_TENSION: 300,
  SPRING_FRICTION: 30,
  TRANSITION_DURATION: 200,
  
  // Checkout
  SUBMISSION_COOLDOWN: 3000, // 3 seconds between submissions
} as const;

export type MobileConstants = typeof MOBILE_CONSTANTS;

export default MOBILE_CONSTANTS;
