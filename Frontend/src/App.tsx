import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { LazyMotion, domAnimation } from 'framer-motion';
import Lenis from 'lenis';
import { PageShell } from './components/layout/PageShell';
import { HomePage } from './pages/HomePage';
import { isTouchDevice, isReducedMotion, isLowTierHardware } from './utils/perfGuard';

// Lazy load non-home route pages to optimize initial bundle size & parse time
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const VoiceShieldPage = lazy(() => import('./pages/VoiceShieldPage').then(m => ({ default: m.VoiceShieldPage })));
const JobShieldPage = lazy(() => import('./pages/JobShieldPage').then(m => ({ default: m.JobShieldPage })));
const SimGuardPage = lazy(() => import('./pages/SimGuardPage').then(m => ({ default: m.SimGuardPage })));
const FusionEnginePage = lazy(() => import('./pages/FusionEnginePage').then(m => ({ default: m.FusionEnginePage })));
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

export function App() {
  return (
    <LazyMotion features={domAnimation} strict={false}>
      <BrowserRouter>
        <SmoothScrollSingleton />
        <ScrollManager />
        <PageShell>
          <Suspense fallback={<div className="min-h-[calc(100vh-220px)] w-full" />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/voice" element={<VoiceShieldPage />} />
              <Route path="/job" element={<JobShieldPage />} />
              <Route path="/sim" element={<SimGuardPage />} />
              <Route path="/fusion" element={<FusionEnginePage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="*" element={<HomePage />} />
            </Routes>
          </Suspense>
        </PageShell>
      </BrowserRouter>
    </LazyMotion>
  );
}

export default App;
