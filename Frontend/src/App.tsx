import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { PageShell } from './components/layout/PageShell';
import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';
import { VoiceShieldPage } from './pages/VoiceShieldPage';
import { JobShieldPage } from './pages/JobShieldPage';
import { SimGuardPage } from './pages/SimGuardPage';
import { FusionEnginePage } from './pages/FusionEnginePage';
import { HistoryPage } from './pages/HistoryPage';

// Scroll to top or anchor on route change
function ScrollManager() {
  const location = useLocation();

  React.useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          const topBarHeight = 90;
          const bodyRect = document.body.getBoundingClientRect().top;
          const elementRect = element.getBoundingClientRect().top;
          const elementPosition = elementRect - bodyRect;
          const offsetPosition = elementPosition - topBarHeight;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth',
          });
        }, 100);
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [location.pathname, location.hash]);

  return null;
}

export function App() {
  return (
    <BrowserRouter>
      <ScrollManager />
      <PageShell>
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
      </PageShell>
    </BrowserRouter>
  );
}

export default App;
