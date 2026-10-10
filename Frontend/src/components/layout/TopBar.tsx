import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Menu, X, Shield, ArrowUpRight } from 'lucide-react';
import { MonoLabel } from '../ui/MonoLabel';

export interface TopBarProps {
  onShieldClick?: (shieldId: string) => void;
}

const navShields = [
  { id: 'voice', label: 'voice·shield', route: '/voice' },
  { id: 'job', label: 'job·shield', route: '/job' },
  { id: 'sim', label: 'sim·guard', route: '/sim' },
];

const menuLinks = [
  { title: 'Home', subtitle: 'Overview & Architecture', path: '/' },
  { title: 'Dashboard', subtitle: 'Unified Security Command', path: '/dashboard' },
  { title: 'Voice Shield', subtitle: 'Deepfake Audio & Speech Forensic', path: '/voice' },
  { title: 'Job Shield', subtitle: 'WhatsApp, PDF & URL Scams', path: '/job' },
  { title: 'SIM Guard', subtitle: 'SIM Swap & Carrier Telemetry', path: '/sim' },
  { title: 'Fusion Engine', subtitle: 'Cross-Vector Attack Synthesis', path: '/fusion' },
  { title: 'History', subtitle: 'Past Threat Audit Logs', path: '/history' },
];

export const TopBar: React.FC<TopBarProps> = React.memo(({ onShieldClick }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Lock scroll when menu open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const handleShieldNav = (shield: { id: string; route: string }) => {
    if (location.pathname === '/') {
      if (onShieldClick) {
        onShieldClick(shield.id);
      } else {
        const el = document.getElementById(shield.id);
        if (el) {
          const topBarHeight = 90;
          const bodyRect = document.body.getBoundingClientRect().top;
          const elementRect = el.getBoundingClientRect().top;
          const elementPosition = elementRect - bodyRect;
          const offsetPosition = elementPosition - topBarHeight;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth',
          });
        }
      }
    } else {
      navigate(shield.route);
    }
  };

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 w-full border-t border-b border-[#0A0A0A] bg-[#F0F0F0]/92 transition-colors duration-200"
        style={{ height: '80px', transform: 'translateZ(0)' }}
      >
        <div className="w-full max-w-[1400px] h-full mx-auto px-6 sm:px-10 md:px-14 flex items-center justify-between">
          {/* Left: Brand Wordmark */}
          <Link
            to="/"
            className="flex items-center gap-3 sm:gap-4 group outline-none focus-visible:ring-2 focus-visible:ring-[#0037FF] rounded-sm py-1"
          >
            <span className="font-['Inter_Tight'] font-bold text-2xl sm:text-3xl tracking-tighter text-[#0A0A0A] lowercase">
              meditrust
            </span>
            <span className="hidden sm:inline-block w-[1px] h-4 bg-[#0A0A0A]/30" />
            <MonoLabel color="muted" className="hidden sm:inline-flex text-[11px] font-medium">
              HEALTHCARE SAFETY
            </MonoLabel>
          </Link>

          {/* Center: Exactly Three Shield Wordmark Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 xl:gap-10">
            {navShields.map((shield) => (
              <button
                key={shield.id}
                type="button"
                onClick={() => handleShieldNav(shield)}
                className="group relative py-2 text-sm font-['Inter_Tight'] font-semibold tracking-tight text-[#0A0A0A] hover:text-[#0037FF] transition-colors duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#0037FF] rounded-sm bg-transparent border-none"
              >
                <span>{shield.label}</span>
                <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-[#0037FF] transition-all duration-300 ease-out group-hover:w-full" />
              </button>
            ))}
          </nav>

          {/* Right: Black Rounded 56x56 Action Buttons */}
          <div className="flex items-center gap-3">
            {/* History Button */}
            <Link
              to="/history"
              aria-label="View Analysis History"
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-[16px] bg-[#0A0A0A] text-white flex items-center justify-center hover:bg-[#1F1F1F] transition-all duration-200 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-[#0037FF] group"
            >
              <History className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-200 group-hover:rotate-[-20deg]" />
            </Link>

            {/* Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Close Menu' : 'Open Navigation Menu'}
              aria-expanded={menuOpen}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-[16px] bg-[#0A0A0A] text-white flex items-center justify-center hover:bg-[#1F1F1F] transition-all duration-200 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-[#0037FF] cursor-pointer"
            >
              {menuOpen ? (
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Full-screen Navigation Menu Overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 z-40 bg-[#F0F0F0]/98 flex flex-col justify-between pt-28 pb-12 px-6 sm:px-14 overflow-y-auto will-change-transform"
            style={{ transform: 'translateZ(0)' }}
          >
            {/* Top section info */}
            <div className="w-full max-w-[1400px] mx-auto flex justify-between items-center border-b border-[#0A0A0A] pb-6">
              <MonoLabel color="accent">NAVIGATION DIRECTORY</MonoLabel>
              <MonoLabel color="muted">MEDITRUST AI V2.0</MonoLabel>
            </div>

            {/* Main Links */}
            <div className="w-full max-w-[1400px] mx-auto py-10 sm:py-14 flex flex-col gap-5 sm:gap-7">
              {menuLinks.map((item, index) => (
                <Link
                  key={item.path + index}
                  to={item.path}
                  onClick={() => setMenuOpen(false)}
                  className="group flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-[#0A0A0A]/20 pb-3 hover:border-[#0037FF] transition-colors"
                >
                  <div className="flex items-baseline gap-4 sm:gap-8">
                    <span className="font-mono-label text-sm text-[#0A0A0A]/40 group-hover:text-[#0037FF] transition-colors">
                      0{index + 1}
                    </span>
                    <span className="font-['Inter_Tight'] font-light text-3xl sm:text-5xl md:text-6xl text-[#0A0A0A] group-hover:text-[#0037FF] group-hover:translate-x-2 transition-all duration-300">
                      {item.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 sm:mt-0">
                    <span className="font-mono-label text-xs text-[#6B6F76]">{item.subtitle}</span>
                    <ArrowUpRight className="w-5 h-5 text-[#0A0A0A]/40 group-hover:text-[#0037FF] group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>

            {/* Footer inside menu */}
            <div className="w-full max-w-[1400px] mx-auto pt-6 border-t border-[#0A0A0A] flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-[#0037FF]" />
                <MonoLabel color="ink">THREE SHIELDS · ONE FUSION ENGINE</MonoLabel>
              </div>
              <MonoLabel color="muted">CARRIER & AI TELEMETRY: READY</MonoLabel>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

TopBar.displayName = 'TopBar';
