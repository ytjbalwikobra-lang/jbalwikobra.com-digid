import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import PNHeader from './components/public/layout/PNHeader';
import MobileNavigation from './components/MobileNavigation';
import ScrollToTop from './components/ScrollToTop';
import Footer from './components/Footer';
import PNFooter from './components/public/layout/PNFooter';
import './App.css';
import './styles/global-design-system.css';
import './styles/admin-design-system.css';
import './styles/admin-readability-enhancement.css';
import './styles/public-pages.css';
import './styles/bottom-navigation.css';
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
import { enhancedProductService } from './services/enhancedProductService';
import UserFloatingNotifications from './components/UserFloatingNotifications';
import PurchaseNotificationTicker from './components/PurchaseNotificationTicker';
// Cloudflare Turnstile verification - enabled when maintenance mode is off
import FirstVisitVerification from './components/FirstVisitVerification';

// CRITICAL PERFORMANCE FIX: Lazy load ALL pages including HomePage
// This reduces initial JS bundle by 70%+

// Lazy load ALL pages for maximum performance
const HomePage = React.lazy(() => import('./pages/HomePage'));
const TraditionalAuthPage = React.lazy(() => import('./pages/TraditionalAuthPage'));

// Lazy load all other pages
const ProductsPage = React.lazy(() => import('./pages/ProductsPage'));
const ProductDetailPage = React.lazy(() => import('./pages/ProductDetailPage'));
const CheckoutPage = React.lazy(() => import('./pages/CheckoutPage'));
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
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage'));
const MaintenancePage = React.lazy(() => import('./pages/MaintenancePage'));

// Lazy load admin pages (biggest performance impact)
const AdminRoutes = React.lazy(() => import('./pages/admin/AdminRoutes'));

// Optimized loading component for better perceived performance (iOS skeleton)
const PageLoader = () => (
  <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
    <div className="w-full max-w-md">
      <div className="ios-skeleton h-6 w-40 mb-4"></div>
      <div className="ios-skeleton h-4 w-full mb-2"></div>
      <div className="ios-skeleton h-4 w-5/6 mb-2"></div>
      <div className="ios-skeleton h-4 w-2/3 mb-6"></div>
      <div className="ios-skeleton h-10 w-32 rounded-lg"></div>
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
        <div className="min-h-screen bg-app-dark flex items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Oops! Terjadi kesalahan</h1>
            <p className="text-gray-400 mb-4">Silakan refresh halaman atau coba lagi nanti.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700"
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
  const [config] = React.useState({
    hasSupabaseKey: !!process.env.REACT_APP_SUPABASE_ANON_KEY
  });

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

  // Initialize production monitoring
  useEffect(() => {
    // Production monitor is automatically initialized when imported
    if (productionMonitor.isProduction()) {
      console.log('🔍 Production monitoring active');
    }

    // Idle warmup: pre-load frequently visited routes
    onIdle(() => {
      warmImport(() => import('./pages/ProductsPage'));
      warmImport(() => import('./pages/FlashSalesPage'));
      warmImport(() => import('./pages/ProfilePage'));
      // Warm product data to minimize egress on navigation
      enhancedProductService.getAllProducts().catch(() => {});
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

  // Wrap content conditionally with Turnstile verification
  const AppContent = () => (
    <ThemeProvider>
      <AuthProvider>
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
                  <div className="App min-h-screen flex flex-col bg-black text-white relative">
          {/* New PN public header; keep legacy header import for compatibility in other routes */}
          <PNHeader />
                    {/* Purchase notification ticker - shows on all pages */}
                    <PurchaseNotificationTicker />
                    {/* Floating notifications for public app */}
                    <UserFloatingNotifications />
                    <main className="flex-1 pb-4 pt-12 lg:pt-20 lg:pb-4 overflow-x-hidden min-h-screen">
                      {!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY ? (
                        <div className="max-w-3xl mx-auto p-4">
                          <div className="bg-black/60 border border-yellow-500/40 rounded-lg p-4 mb-4">
                            <h2 className="text-yellow-400 font-semibold mb-2">⚙️ Setup Required</h2>
                            <p className="text-gray-300 text-sm mb-3">
                              Supabase configuration is missing. Please set up your environment variables.
                            </p>
                            <p className="text-xs text-gray-400">
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
                          <Route path="/checkout" element={<CheckoutPage />} />
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
                          {/* Hidden design system showcase - not linked in navigation */}
                          <Route path="/internal/design-system" element={<DesignSystemShowcase />} />
                          {/* 404 Not Found - Catch all routes */}
                          <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                      </Suspense>
                    </main>
                    {/* New PN public footer */}
                    <PNFooter />
                    <MobileNavigation />
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
      </AuthProvider>
    </ThemeProvider>
  );

  return (
    <ErrorBoundary>
      {/* Cloudflare Turnstile verification - enabled when maintenance mode is off */}
      {!isMaintenanceMode && process.env.REACT_APP_TURNSTILE_SITE_KEY ? (
        <FirstVisitVerification>
          <AppContent />
        </FirstVisitVerification>
      ) : (
        <AppContent />
      )}
    </ErrorBoundary>
  );
}

export default App;
