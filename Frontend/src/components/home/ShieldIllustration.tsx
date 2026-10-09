import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { ShieldId } from '../../types/analysis';

export interface ShieldIllustrationProps {
  shield: ShieldId;
  accentColor: string;
}

export const ShieldIllustration: React.FC<ShieldIllustrationProps> = ({
  shield,
  accentColor,
}) => {
  const prefersReduced = useReducedMotion();

  if (shield === 'voice') {
    const barHeights = [18, 42, 68, 88, 54, 96, 72, 34, 60, 84, 48, 22];
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <div
          className="absolute w-48 h-48 rounded-full opacity-20 blur-xl pointer-events-none"
          style={{ backgroundColor: accentColor }}
        />
        
        <svg
          viewBox="0 0 320 200"
          className="w-full max-w-[280px] h-[180px] overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <line
            x1="30"
            y1="100"
            x2="290"
            y2="100"
            stroke="#0A0A0A"
            strokeWidth="1"
            strokeOpacity="0.2"
            strokeDasharray="4 4"
          />

          {barHeights.map((h, i) => {
            const x = 50 + i * 19;
            return (
              <motion.g key={i}>
                <motion.line
                  x1={x}
                  y1={100 - h / 2}
                  x2={x}
                  y2={100 + h / 2}
                  stroke="#0A0A0A"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  animate={
                    prefersReduced
                      ? {}
                      : {
                          y1: [100 - h / 2, 100 - (h * 0.4) / 2, 100 - (h * 1.3) / 2, 100 - h / 2],
                          y2: [100 + h / 2, 100 + (h * 0.4) / 2, 100 + (h * 1.3) / 2, 100 + h / 2],
                        }
                  }
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    delay: i * 0.12,
                    ease: 'easeInOut',
                  }}
                />
                {(i === 3 || i === 5 || i === 9) && (
                  <motion.circle
                    cx={x}
                    cy={100 - h / 2 - 6}
                    r="2.5"
                    fill={accentColor}
                    animate={
                      prefersReduced
                        ? {}
                        : {
                            scale: [1, 1.4, 1],
                            opacity: [0.7, 1, 0.7],
                          }
                    }
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      delay: i * 0.12,
                    }}
                  />
                )}
              </motion.g>
            );
          })}
        </svg>
      </div>
    );
  }

  if (shield === 'job') {
    // PDF / Job Offer Sheet with scanning line, chat bubble and warning triangle
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <div
          className="absolute w-48 h-48 rounded-full opacity-20 blur-xl pointer-events-none"
          style={{ backgroundColor: accentColor }}
        />

        <svg
          viewBox="0 0 320 220"
          className="w-full max-w-[280px] h-[190px] overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Document Sheet */}
          <g>
            {/* Sheet shadow backdrop */}
            <rect x="75" y="35" width="115" height="150" rx="6" fill="#F0F0F0" stroke="#0A0A0A" strokeWidth="1.5" strokeOpacity="0.3" />
            {/* Main Sheet */}
            <rect x="65" y="25" width="120" height="155" rx="8" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2.5" />
            
            {/* Folded corner */}
            <path d="M160 25 L185 50 H160 V25 Z" fill="#F0F0F0" stroke="#0A0A0A" strokeWidth="2" strokeLinejoin="round" />

            {/* Document Header & Text lines */}
            <rect x="80" y="45" width="40" height="8" rx="2" fill={accentColor} fillOpacity="0.25" />
            <line x1="80" y1="70" x2="165" y2="70" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" />
            <line x1="80" y1="88" x2="155" y2="88" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4" />
            <line x1="80" y1="106" x2="170" y2="106" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4" />
            <line x1="80" y1="124" x2="140" y2="124" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4" />
            <line x1="80" y1="142" x2="160" y2="142" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4" />

            {/* Animated Laser Scanning Line moving down the document */}
            <motion.line
              x1="65"
              y1="40"
              x2="185"
              y2="40"
              stroke={accentColor}
              strokeWidth="2.5"
              animate={
                prefersReduced
                  ? {}
                  : {
                      y1: [35, 165, 35],
                      y2: [35, 165, 35],
                      opacity: [0.3, 1, 0.3],
                    }
              }
              transition={{
                duration: 3.2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </g>

          {/* Floating WhatsApp/Recruitment Chat Bubble with Warning Triangle */}
          <motion.g
            animate={
              prefersReduced
                ? {}
                : {
                    y: [0, -6, 0],
                  }
            }
            transition={{
              duration: 2.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {/* Chat bubble background */}
            <path
              d="M165 95 H245 C253 95 260 102 260 110 V165 C260 173 253 180 245 180 H185 L165 195 V180 H165 C157 180 150 173 150 165 V110 C150 102 157 95 165 95 Z"
              fill="#FFFFFF"
              stroke="#0A0A0A"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            
            {/* Chat text lines */}
            <line x1="170" y1="120" x2="205" y2="120" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" />
            <line x1="170" y1="135" x2="215" y2="135" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4" />

            {/* Warning Triangle inside badge */}
            <rect x="220" y="112" width="30" height="30" rx="8" fill={accentColor} fillOpacity="0.18" stroke={accentColor} strokeWidth="1.5" />
            <path
              d="M235 119 L244 135 H226 Z"
              fill="none"
              stroke={accentColor}
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <circle cx="235" cy="132" r="1.2" fill={accentColor} />
            <line x1="235" y1="124" x2="235" y2="128" stroke={accentColor} strokeWidth="1.8" strokeLinecap="round" />
          </motion.g>
        </svg>
      </div>
    );
  }

  // sim: phone outline with pulsing signal rings
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div
        className="absolute w-48 h-48 rounded-full opacity-20 blur-xl pointer-events-none"
        style={{ backgroundColor: accentColor }}
      />

      <svg
        viewBox="0 0 320 220"
        className="w-full max-w-[280px] h-[190px] overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {[1, 2, 3].map((ring) => (
          <motion.circle
            key={ring}
            cx="160"
            cy="110"
            r={50 + ring * 22}
            stroke={accentColor}
            strokeWidth="1.5"
            strokeOpacity="0.4"
            fill="none"
            strokeDasharray="4 4"
            animate={
              prefersReduced
                ? {}
                : {
                    scale: [0.95, 1.08, 0.95],
                    opacity: [0.2, 0.7, 0.2],
                  }
            }
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: ring * 0.4,
              ease: 'easeInOut',
            }}
            style={{ transformOrigin: '160px 110px' }}
          />
        ))}

        <rect
          x="125"
          y="45"
          width="70"
          height="130"
          rx="16"
          stroke="#0A0A0A"
          strokeWidth="2.5"
          fill="#FFFFFF"
        />

        <line x1="150" y1="58" x2="170" y2="58" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" />

        <rect x="140" y="80" width="40" height="48" rx="8" stroke={accentColor} strokeWidth="1.5" fill={accentColor} fillOpacity="0.1" />
        
        <rect x="148" y="112" width="3" height="6" fill="#0A0A0A" rx="1" />
        <rect x="154" y="108" width="3" height="10" fill="#0A0A0A" rx="1" />
        <rect x="160" y="102" width="3" height="16" fill="#0A0A0A" rx="1" />
        <rect x="166" y="96" width="3" height="22" fill={accentColor} rx="1" />

        <line x1="150" y1="164" x2="170" y2="164" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
};
