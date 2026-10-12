import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { LazyMotion, domAnimation, AnimatePresence, m } from 'framer-motion';
import Lenis from 'lenis';
import { PageShell } from './components/layout/PageShell';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { RouteLoadingFallback } from './components/common/RouteLoadingFallback';
import { isTouchDevice, isReducedMotion, isLowTierHardware } from './utils/perfGuard';

// Lazy load non-home route pages to optimize initial bundle size & parse time
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const VoiceShieldPage = lazy(() => import('./pages/VoiceShieldPage').then(m => ({ default: m.VoiceShieldPage })));
const JobShieldPage = lazy(() => import('./pages/JobShieldPage').then(m => ({ default: m.JobShieldPage })));
const SimGuardPage = lazy(() => import('./pages/SimGuardPage').then(m => ({ default: m.SimGuardPage })));
const FusionEnginePage = lazy(() => import('./pages/FusionEnginePage').then(m => ({ default: m.FusionEnginePage })));
const PlaybookPage = lazy(() => import('./pages/PlaybookPage').then(m => ({ default: m.PlaybookPage })));
const HistoryPage = lazy(() => import('./pages/HistoryPage').then(m => ({ default: m.HistoryPage })));

// Scroll to top or anchor on route change
function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        requestAnimationFrame(() => {
          const topBarHeight = 90;
          const bodyRect = document.body.getBoundingClientRect().top;
          const elementRect = element.getBoundingClientRect().top;
          const elementPosition = elementRect - bodyRect;
          const offsetPosition = elementPosition - topBarHeight;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth',
          });
        });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [location.pathname, location.hash]);

  return null;
}

// Single root Smooth Scroll Lenis instance
function SmoothScrollSingleton() {
  useEffect(() => {
    // Disable smooth scroll on touch devices, reduced motion, or low-tier hardware
    if (isTouchDevice() || isReducedMotion() || isLowTierHardware()) {
      return;
    }

    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.0,
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return null;
}

// Route manager with subtle <250ms page transition
function AnimatedRoutes() {
  const location = useLocation();
  const reducedMotion = isReducedMotion();

  return (
    <AnimatePresence mode="wait">
      <m.div
        key={location.pathname}
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="w-full flex-1 flex flex-col"
        style={{ willChange: 'opacity, transform' }}
      >
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/voice" element={<VoiceShieldPage />} />
            <Route path="/job" element={<JobShieldPage />} />
            <Route path="/sim" element={<SimGuardPage />} />
            <Route path="/fusion" element={<FusionEnginePage />} />
            <Route path="/playbook" element={<PlaybookPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </m.div>
    </AnimatePresence>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <LazyMotion features={domAnimation} strict={false}>
        <BrowserRouter>
          <SmoothScrollSingleton />
          <ScrollManager />
          <PageShell>
            <AnimatedRoutes />
          </PageShell>
        </BrowserRouter>
      </LazyMotion>
    </ErrorBoundary>
  );
}

export default App;
