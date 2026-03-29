import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import AppLayout from './components/AppLayout';
import ErrorBoundary from './components/ErrorBoundary';
import LandingPage from './pages/LandingPage';
import PaywallScreen from './components/PaywallScreen';
import { useAuth } from './lib/AuthContext';
import { trackPageView } from './lib/analytics';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ExplorePage = lazy(() => import('./pages/ExplorePage'));
const ComparePage = lazy(() => import('./pages/ComparePage'));
const PortfolioPage = lazy(() => import('./pages/PortfolioPage'));
const ScorecardPage = lazy(() => import('./pages/ScorecardPage'));
const SchemeDetailPage = lazy(() => import('./pages/SchemeDetailPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
const HelpContentPage = lazy(() => import('./pages/HelpContentPage'));
const LegalPage = lazy(() => import('./pages/LegalPage'));
const StockDashboardPage = lazy(() => import('./pages/stocks/StockDashboardPage'));
const StockExplorePage = lazy(() => import('./pages/stocks/StockExplorePage'));
const StockScorecardPage = lazy(() => import('./pages/stocks/StockScorecardPage'));
const StockComparePage = lazy(() => import('./pages/stocks/StockComparePage'));
const StockPortfolioPage = lazy(() => import('./pages/stocks/StockPortfolioPage'));

const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2, ease: 'easeOut' },
};

function AnimatedPage({ children }) {
  return <motion.div {...pageTransition}>{children}</motion.div>;
}

function PageFallback() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-48 bg-card rounded" />
      <div className="h-4 w-72 bg-card rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-card border border-border rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="h-[360px] bg-card border border-border rounded-lg" />
        <div className="h-[360px] bg-card border border-border rounded-lg" />
      </div>
    </div>
  );
}

function WrappedPage({ children, pageKey }) {
  return (
    <ErrorBoundary key={pageKey}>
      <Suspense fallback={<PageFallback />}>
        <AnimatedPage>{children}</AnimatedPage>
      </Suspense>
    </ErrorBoundary>
  );
}

function AdminGuard({ children }) {
  const { isAdmin, isDev } = useAuth();
  if (!isAdmin || !isDev) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <p className="text-lg font-mono font-bold text-foreground mb-2">Access Denied</p>
          <p className="text-sm text-muted">
            {!isDev
              ? 'Admin is only available on the dev environment.'
              : 'This page is restricted to administrators.'}
          </p>
        </div>
      </div>
    );
  }
  return children;
}

export default function App() {
  const location = useLocation();
  const { user, isLoading, launchMode } = useAuth();

  // GA4 route tracking
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-muted font-mono">Loading...</p>
        </div>
      </div>
    );
  }

  // Public pages accessible without login
  const isPublicRoute = location.pathname.startsWith('/legal/') ||
    location.pathname.startsWith('/scorecard') ||
    location.pathname.startsWith('/explore') ||
    location.pathname.startsWith('/help') ||
    location.pathname.startsWith('/compare') ||
    location.pathname === '/dashboard' ||
    location.pathname.startsWith('/stocks/dashboard') ||
    location.pathname.startsWith('/stocks/explore') ||
    location.pathname.startsWith('/stocks/scorecard') ||
    location.pathname.startsWith('/stocks/compare');

  if (location.pathname.startsWith('/legal/')) {
    return (
      <Routes>
        <Route path="legal/:page" element={
          <Suspense fallback={<PageFallback />}><LegalPage /></Suspense>
        } />
      </Routes>
    );
  }

  if (!user && !isPublicRoute) {
    return <LandingPage />;
  }

  // Free users (expired trial or legacy) must pay — admins exempt, launch mode exempt
  if (user && user.tier === 'free' && user.role !== 'admin' && !launchMode) {
    return <PaywallScreen />;
  }

  return (
    <Routes location={location}>
      {/* Standalone help content for popup windows (no AppLayout) */}
      <Route
        path="help-content"
        element={
          <Suspense fallback={<PageFallback />}>
            <HelpContentPage />
          </Suspense>
        }
      />

      <Route element={<AppLayout />}>
        <Route
          index
          element={
            <AnimatePresence mode="wait">
              <WrappedPage pageKey="dashboard">
                <DashboardPage />
              </WrappedPage>
            </AnimatePresence>
          }
        />
        <Route
          path="dashboard"
          element={
            <WrappedPage pageKey="dashboard">
              <DashboardPage />
            </WrappedPage>
          }
        />
        <Route
          path="explore"
          element={
            <WrappedPage pageKey="explore">
              <ExplorePage />
            </WrappedPage>
          }
        />
        <Route
          path="compare"
          element={
            <WrappedPage pageKey="compare">
              <ComparePage />
            </WrappedPage>
          }
        />
        {/* Portfolio/ECAS removed from public version — available in self-hosted edition only */}
        <Route
          path="scorecard/:code?"
          element={
            <WrappedPage pageKey="scorecard">
              <ScorecardPage />
            </WrappedPage>
          }
        />
        <Route
          path="scheme/:code"
          element={
            <WrappedPage pageKey="scheme-detail">
              <SchemeDetailPage />
            </WrappedPage>
          }
        />
        <Route
          path="stocks/dashboard"
          element={
            <WrappedPage pageKey="stock-dashboard">
              <StockDashboardPage />
            </WrappedPage>
          }
        />
        <Route
          path="stocks/explore"
          element={
            <WrappedPage pageKey="stock-explore">
              <StockExplorePage />
            </WrappedPage>
          }
        />
        <Route
          path="stocks/scorecard/:symbol?"
          element={
            <WrappedPage pageKey="stock-scorecard">
              <StockScorecardPage />
            </WrappedPage>
          }
        />
        <Route
          path="stocks/compare"
          element={
            <WrappedPage pageKey="stock-compare">
              <StockComparePage />
            </WrappedPage>
          }
        />
        <Route
          path="stocks/portfolio"
          element={
            <WrappedPage pageKey="stock-portfolio">
              <StockPortfolioPage />
            </WrappedPage>
          }
        />
        <Route
          path="help"
          element={
            <WrappedPage pageKey="help">
              <HelpPage />
            </WrappedPage>
          }
        />
        <Route
          path="admin"
          element={
            <WrappedPage pageKey="admin">
              <AdminGuard>
                <AdminPage />
              </AdminGuard>
            </WrappedPage>
          }
        />
      </Route>
    </Routes>
  );
}
