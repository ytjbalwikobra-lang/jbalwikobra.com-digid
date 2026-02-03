/**
 * usePageTracking Hook
 * 
 * Tracks page views and route changes for analytics
 * Should be used at the router level to capture all navigation
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../services/analyticsService';

/**
 * Hook to automatically track page views on route changes
 */
export function usePageTracking(): void {
  const location = useLocation();

  useEffect(() => {
    // Track page view on route change
    trackPageView(location.pathname + location.search);
  }, [location]);
}

export default usePageTracking;
