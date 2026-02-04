import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import PNHeader from './components/public/layout/PNHeader';
import ScrollToTop from './components/ScrollToTop';
import { CartProvider } from './contexts/CartContext';
import { CyberBottomNav } from './components/mobile';
import { CartIntegration } from './components/CartIntegration';
import PNFooter from './components/public/layout/PNFooter';
import './App.css';
// Design system: cyber-compact.css (loaded via index.css)
import { forceFixedPositioning } from './utils/forceFixedPositioning';
import RequireAdmin from './components/RequireAdmin';
import { ToastProvider } from './components/Toast';
import { ConfirmationProvider } from './components/ConfirmationModal';
import { AuthProvider } from './contexts/TraditionalAuthContext';
import { WishlistProvider } from './contexts/WishlistContext';
import { FaviconService } from './services/faviconService';
import { ThemeProvider } from './contexts/ThemeContext';
import { productionMonitor } from './utils/productionMonitor';
import { onIdle, warmImport } from './utils/prefetch';
import { ProductService } from './services/productService';
import UserFloatingNotifications from './components/UserFloatingNotifications';
import PurchaseNotificationTicker from './components/PurchaseNotificationTicker';
import analyticsService from './services/analyticsService';
import { initWebVitals } from './services/webVitalsService';

// CRITICAL PERFORMANCE FIX: Lazy load ALL pages including HomePage
// This reduces initial JS bundle by 70%+

// Lazy load ALL pages for maximum performance
const HomePage = React.lazy(() => import('./pages/HomePage'));
const TraditionalAuthPage = React.lazy(() => import('./pages/TraditionalAuthPage'));

// Lazy load all other pages
const ProductsPage = React.lazy(() => import('./pages/ProductsPage'));
const ProductDetailPage = React.lazy(() => import('./pages/ProductDetailPage'));
const FlashSalesPage = React.lazy(() => import('./pages/FlashSalesPage'));
const FlashSaleProductDetailPage = React.lazy(() => import('./pages/FlashSaleProductDetailPage'));
const PaymentStatus = React.lazy(() => import('./pages/PaymentStatus'));
const PaymentInterface = React.lazy(() => import('./pages/PaymentInterface'));
const HelpPage = React.lazy(() => import('./pages/HelpPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const WishlistPage = React.lazy(() => import('./pages/WishlistPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const OrderHistoryPage = React.lazy(() => import('./pages/OrderHistoryPage'));
const TermsPage = React.lazy(() => import('./pages/TermsPage'));
const FeedPage = React.lazy(() => import('./pages/FeedPage'));
const DesignSystemShowcase = React.lazy(() => import('./pages/DesignSystemShowcase'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));
const CategoryPage = React.lazy(() => import('./pages/CategoryPage'));
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage'));
const MaintenancePage = React.lazy(() => import('./pages/MaintenancePage'));

// Lazy load admin pages (biggest performance impact)
const AdminRoutes = React.lazy(() => import('./pages/admin/AdminRoutes'));

// Optimized loading component for better perceived performance (iOS skeleton)
const PageLoader = () => (
  <div className="min-h-screen bg-[var(--cyber-bg-pure)] text-[var(--cyber-text-primary)] flex items-center justify-center px-6">
    <div className="w-full max-w-md">
      <div className="cyber-skeleton h-6 w-40 mb-4"></div>
      <div className="cyber-skeleton h-4 w-full mb-2"></div>
      <div className="cyber-skeleton h-4 w-5/6 mb-2"></div>
      <div className="cyber-skeleton h-4 w-2/3 mb-6"></div>
      <div className="cyber-skeleton h-10 w-32 rounded-cyber-lg"></div>
    </div>
  </div>
);

// Error Boundary Component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error?: Error}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--cyber-bg-pure)] flex items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Oops! Terjadi kesalahan</h1>
            <p className="text-[var(--cyber-text-muted)] mb-4">Silakan refresh halaman atau coba lagi nanti.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-[var(--cyber-pink-primary)] text-white px-4 py-2 rounded-xl hover:opacity-90"
            >
              Refresh Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  // Check if maintenance mode is enabled
  // Vercel automatically injects VERCEL_ENV (production, preview, development)
  // Check maintenance mode for the specific environment
  const isMaintenanceMode = React.useMemo(() => {
    const maintenanceValue = process.env.REACT_APP_MAINTENANCE_MODE;
    // If value is 'true', enable maintenance mode
    return maintenanceValue === 'true';
  }, []);

  // Initialize favicon and page title
  React.useEffect(() => {
    FaviconService.updateFavicon();
    FaviconService.updatePageTitle();
  }, []);

  // Initialize analytics and web vitals monitoring
  useEffect(() => {
    // Initialize GA4 (respects user consent)
    analyticsService.init();
    
    // Initialize Core Web Vitals monitoring
    initWebVitals();
  }, []);

  // Initialize production monitoring
  useEffect(() => {
    // Production monitor is automatically initialized when imported
    if (productionMonitor.isProduction()) {
    }

    // Idle warmup: pre-load frequently visited routes
    onIdle(() => {
      warmImport(() => import('./pages/ProductsPage'));
      warmImport(() => import('./pages/FlashSalesPage'));
      warmImport(() => import('./pages/ProfilePage'));
      // Warm product data to minimize egress on navigation
      ProductService.getAllProducts().catch(() => {});
    }, 1000);
  }, []);

  // Enforce fixed positioning behavior on mobile (iOS Safari quirks)
  useEffect(() => {
    try {
      forceFixedPositioning();
    } catch (e) {
      console.warn('forceFixedPositioning failed:', e);
    }
  }, []);

  const AppContent = () => (
    <HelmetProvider>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
          <WishlistProvider>
            <ToastProvider>
              <ConfirmationProvider>
                <Router
                  future={{
                    v7_startTransition: true,
                    v7_relativeSplatPath: true
                  }}
                >
                <ScrollToTop />
                {/* Maintenance Mode - Show maintenance page for all routes */}
                {isMaintenanceMode ? (
                  <Suspense fallback={<PageLoader />}>
                    <MaintenancePage />
                  </Suspense>
                ) : (
                <Routes>
                {/* Admin routes - Direct access without sidebar layout */}
                {process.env.NODE_ENV === 'development' ? (
                  // Development: Allow admin access without authentication
                  <Route path="/admin/*" element={
                    <Suspense fallback={<PageLoader />}>
                      <AdminRoutes />
                    </Suspense>
                  } />
                ) : (
                  // Production: Require admin authentication
                  <Route element={<RequireAdmin />}>
                    <Route path="/admin/*" element={
                      <Suspense fallback={<PageLoader />}>
                        <AdminRoutes />
                      </Suspense>
                    } />
                  </Route>
                )}
                
        {/* Public routes with global layout */}
                <Route path="*" element={
                  <div className="App min-h-screen flex flex-col bg-cyber-pure text-white relative">
          {/* New PN public header; keep legacy header import for compatibility in other routes */}
          <PNHeader />
                    {/* Purchase notification ticker - shows on all pages */}
                    <PurchaseNotificationTicker />
                    {/* Floating notifications for public app */}
                    <UserFloatingNotifications />
                    <main className="flex-1 pb-4 pt-12 lg:pt-20 lg:pb-4 overflow-x-hidden min-h-screen">
                      {!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY ? (
                        <div className="max-w-3xl mx-auto p-4">
                          <div className="bg-black/60 border border-yellow-500/40 rounded-xl p-4 mb-4">
                            <h2 className="text-yellow-400 font-semibold mb-2">⚙️ Setup Required</h2>
                            <p className="text-[var(--cyber-text-secondary)] text-sm mb-3">
                              Supabase configuration is missing. Please set up your environment variables.
                            </p>
                            <p className="text-xs text-[var(--cyber-text-muted)]">
                              Demo mode available with limited functionality.
                            </p>
                          </div>
                        </div>
                      ) : null}
                      
                      <Suspense fallback={<PageLoader />}>
                        <Routes>
                          {/* Core pages - loaded immediately */}
                          <Route path="/" element={<HomePage />} />
                          <Route path="/auth" element={<TraditionalAuthPage />} />
                          
                          {/* Lazy loaded pages */}
                          <Route path="/products" element={<ProductsPage />} />
                          <Route path="/products/:id" element={<ProductDetailPage />} />
                          <Route path="/flash-sales" element={<FlashSalesPage />} />
                          <Route path="/flash-sales/:id" element={<FlashSaleProductDetailPage />} />
                          <Route path="/help" element={<HelpPage />} />
                          <Route path="/feed" element={<FeedPage />} />
                          <Route path="/profile" element={<ProfilePage />} />
                          <Route path="/wishlist" element={<WishlistPage />} />
                          <Route path="/settings" element={<SettingsPage />} />
                          <Route path="/terms" element={<TermsPage />} />
                          <Route path="/payment-status" element={<PaymentStatus />} />
                          <Route path="/payment" element={<PaymentInterface />} />
                          <Route path="/orders" element={<OrderHistoryPage />} />
                          <Route path="/notifications" element={<NotificationsPage />} />
                          {/* Category SEO landing pages */}
                          <Route path="/kategori/:slug" element={<CategoryPage />} />
                          {/* Hidden design system showcase - not linked in navigation */}
                          <Route path="/internal/design-system" element={<DesignSystemShowcase />} />
                          {/* 404 Not Found - Catch all routes */}
                          <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                      </Suspense>
                    </main>
                    {/* New PN public footer */}
                    <PNFooter />
                    {/* Cyber-Compact Bottom Navigation */}
                    <CyberBottomNav />
                    {/* Cart Bottom Sheet */}
                    <CartIntegration />
                  </div>
                } />
              </Routes>
                )}
              <Analytics />
              <SpeedInsights />
            </Router>
            </ConfirmationProvider>
          </ToastProvider>
        </WishlistProvider>
          </CartProvider>
      </AuthProvider>
    </ThemeProvider>
    </HelmetProvider>
  );

  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;
