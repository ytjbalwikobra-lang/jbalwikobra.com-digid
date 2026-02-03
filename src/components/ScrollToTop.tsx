import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../services/analyticsService';

const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    
    // Track page view for analytics
    trackPageView(pathname + search);
  }, [pathname, search]);

  return null;
};

export default ScrollToTop;
