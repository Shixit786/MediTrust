// Performance guard utilities for detecting reduced motion, low-tier hardware, and touch devices

export function isReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function isLowTierHardware(): boolean {
  if (typeof navigator === 'undefined') return false;
  // Check CPU cores (mid/low-range laptops or budget mobile with <= 4 cores)
  const lowCores = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4;
  return lowCores;
}

export function isLowPowerMode(): boolean {
  return isReducedMotion() || isLowTierHardware();
}
