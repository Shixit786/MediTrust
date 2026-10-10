import React, { useEffect, useRef } from 'react';
import { isReducedMotion, isLowTierHardware } from '../../utils/perfGuard';

interface NeuralSynapseCanvasProps {
  compact?: boolean;
  activeFeatureIndex?: number; // 0..8 as staggered analysis progresses (-1 when idle or finished)
  featureStatuses?: ('normal' | 'suspicious' | 'anomalous')[];
}

const FEATURE_SHORT_NAMES = [
  'MFCC',
  'FLUX',
  'SILENCE',
  'HF FLAT',
  'HARMONIC',
  'ENERGY',
  'PITCH',
  'ZCR',
  'BREATH',
];

interface VisualNode {
  cluster: number; // 0..8 or -1 for core
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  phaseX: number;
  phaseY: number;
  speed: number;
}

interface Arc {
  active: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  ctrlX: number;
  ctrlY: number;
  startTime: number;
  color: string;
}

const MAX_ARCS = 12;

export const NeuralSynapseCanvas: React.FC<NeuralSynapseCanvasProps> = React.memo(
  ({ compact = false, activeFeatureIndex = -1, featureStatuses = [] }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Animation control refs
    const rafIdRef = useRef<number | null>(null);
    const isVisibleRef = useRef<boolean>(true);
    const isTabActiveRef = useRef<boolean>(true);
    const lastFrameTimeRef = useRef<number>(0);

    // Pre-allocated data structures to prevent per-frame garbage collection
    const nodesRef = useRef<VisualNode[]>([]);
    const arcsRef = useRef<Arc[]>(
      Array.from({ length: MAX_ARCS }, () => ({
        active: false,
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
        ctrlX: 0,
        ctrlY: 0,
        startTime: 0,
        color: '#EF4444',
      }))
    );
    const lastFiredFeatureRef = useRef<number>(-1);

    // Track feature activation and trigger lightning arcs
    useEffect(() => {
      if (activeFeatureIndex >= 0 && activeFeatureIndex !== lastFiredFeatureRef.current) {
        lastFiredFeatureRef.current = activeFeatureIndex;
        const status = featureStatuses[activeFeatureIndex] || 'normal';
        const isAnomalous = status === 'anomalous' || status === 'suspicious';

        if (isAnomalous) {
          // Find nodes of this cluster
          const clusterNodes = nodesRef.current.filter((n) => n.cluster === activeFeatureIndex);
          const coreNode = nodesRef.current.find((n) => n.cluster === -1);

          if (clusterNodes.length > 0 && coreNode) {
            const now = performance.now();
            const sourceNode = clusterNodes[0];

            // Allocate 1-2 arcs in the fixed pool
            let allocated = 0;
            for (const arc of arcsRef.current) {
              if (!arc.active) {
                arc.active = true;
                arc.startX = sourceNode.x;
                arc.startY = sourceNode.y;
                arc.endX = coreNode.x;
                arc.endY = coreNode.y;
                // Add jitter to control point
                const midX = (sourceNode.x + coreNode.x) / 2;
                const midY = (sourceNode.y + coreNode.y) / 2;
                const jitter = (Math.random() - 0.5) * 60;
                arc.ctrlX = midX + jitter;
                arc.ctrlY = midY + jitter;
                arc.startTime = now;
                arc.color = status === 'anomalous' ? '#EF4444' : '#F59E0B';
                allocated++;
                if (allocated >= 2) break;
              }
            }
          }
        }
      }
    }, [activeFeatureIndex, featureStatuses]);

    // Canvas setup & requestAnimationFrame loop
    useEffect(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) return;

      const reducedMotion = isReducedMotion();
      const lowPower = isLowTierHardware();
      const targetFps = lowPower ? 40 : 60;
      const frameInterval = 1000 / targetFps;

      // Layout nodes based on dimensions
      const initNodes = (width: number, height: number) => {
        const cx = width / 2;
        const cy = height / 2;
        const isMobile = width < 500;
        const nodesPerCluster = isMobile ? 2 : 4;
        const nodes: VisualNode[] = [];

        // 1 Core Node
        nodes.push({
          cluster: -1,
          baseX: cx,
          baseY: cy,
          x: cx,
          y: cy,
          phaseX: 0,
          phaseY: 0,
          speed: 0.0005,
        });

        // 9 Clusters around ring
        const ringRadius = Math.min(width, height) * (compact ? 0.35 : 0.38);
        const clusterRadius = isMobile ? 14 : 22;

        for (let c = 0; c < 9; c++) {
          const theta = c * ((2 * Math.PI) / 9) - Math.PI / 2;
          const clusterCenterX = cx + Math.cos(theta) * ringRadius;
          const clusterCenterY = cy + Math.sin(theta) * ringRadius;

          for (let i = 0; i < nodesPerCluster; i++) {
            const subTheta = i * ((2 * Math.PI) / nodesPerCluster);
            const bx = clusterCenterX + Math.cos(subTheta) * clusterRadius;
            const by = clusterCenterY + Math.sin(subTheta) * clusterRadius;

            nodes.push({
              cluster: c,
              baseX: bx,
              baseY: by,
              x: bx,
              y: by,
              phaseX: Math.random() * Math.PI * 2,
              phaseY: Math.random() * Math.PI * 2,
              speed: 0.0008 + Math.random() * 0.0006,
            });
          }
        }

        nodesRef.current = nodes;
      };

      // Resize handler with devicePixelRatio capped at 1.5
      const handleResize = () => {
        const rect = container.getBoundingClientRect();
        const width = Math.max(280, rect.width);
        const height = compact ? 220 : Math.max(300, rect.height || 360);
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        initNodes(width, height);

        if (reducedMotion || lowPower) {
          renderFrame(performance.now(), width, height);
        }
      };

      // Draw single frame (Zero object allocation in loop)
      const renderFrame = (now: number, width: number, height: number) => {
        ctx.clearRect(0, 0, width, height);

        const nodes = nodesRef.current;
        const count = nodes.length;
        if (count === 0) return;

        // 1. Update node drifting positions
        for (let i = 0; i < count; i++) {
          const node = nodes[i];
          if (!reducedMotion) {
            const time = now * node.speed;
            node.x = node.baseX + Math.sin(time + node.phaseX) * 4;
            node.y = node.baseY + Math.cos(time + node.phaseY) * 4;
          } else {
            node.x = node.baseX;
            node.y = node.baseY;
          }
        }

        const coreNode = nodes[0];

        // 2. Draw lines between nodes in same cluster and faint lines to core
        ctx.lineWidth = 1;

        for (let c = 0; c < 9; c++) {
          const isActivated = c <= activeFeatureIndex || activeFeatureIndex === -1;
          const status = featureStatuses[c] || 'normal';
          const isAnomalous = status === 'anomalous';
          const isSuspicious = status === 'suspicious';

          let lineColor = 'rgba(10, 10, 10, 0.08)';
          if (isActivated) {
            if (isAnomalous) lineColor = 'rgba(239, 68, 68, 0.4)';
            else if (isSuspicious) lineColor = 'rgba(245, 158, 11, 0.4)';
            else lineColor = 'rgba(59, 91, 255, 0.35)';
          }

          ctx.strokeStyle = lineColor;

          // Connect cluster nodes
          const cNodes = nodes.filter((n) => n.cluster === c);
          for (let i = 0; i < cNodes.length; i++) {
            const nextIdx = (i + 1) % cNodes.length;
            ctx.beginPath();
            ctx.moveTo(cNodes[i].x, cNodes[i].y);
            ctx.lineTo(cNodes[nextIdx].x, cNodes[nextIdx].y);
            ctx.stroke();
          }

          // Faint line to core from first node of cluster
          if (cNodes.length > 0 && coreNode) {
            ctx.strokeStyle = isActivated
              ? isAnomalous
                ? 'rgba(239, 68, 68, 0.2)'
                : 'rgba(59, 91, 255, 0.15)'
              : 'rgba(10, 10, 10, 0.04)';
            ctx.beginPath();
            ctx.moveTo(cNodes[0].x, cNodes[0].y);
            ctx.lineTo(coreNode.x, coreNode.y);
            ctx.stroke();
          }
        }

        // 3. Draw Lightning Arcs (fading over ~700ms)
        const arcs = arcsRef.current;
        for (let i = 0; i < MAX_ARCS; i++) {
          const arc = arcs[i];
          if (arc.active) {
            const elapsed = now - arc.startTime;
            if (elapsed > 700) {
              arc.active = false;
            } else {
              const alpha = Math.max(0, 1 - elapsed / 700);
              ctx.save();
              ctx.strokeStyle = arc.color;
              ctx.globalAlpha = alpha;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(arc.startX, arc.startY);
              ctx.quadraticCurveTo(arc.ctrlX, arc.ctrlY, arc.endX, arc.endY);
              ctx.stroke();
              ctx.restore();
            }
          }
        }

        // 4. Draw Nodes (Dots)
        for (let i = 0; i < count; i++) {
          const node = nodes[i];
          const isCore = node.cluster === -1;
          const isActivated = isCore || node.cluster <= activeFeatureIndex || activeFeatureIndex === -1;
          const status = !isCore ? featureStatuses[node.cluster] || 'normal' : 'normal';

          ctx.beginPath();
          if (isCore) {
            ctx.arc(node.x, node.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#0A0A0A';
          } else {
            ctx.arc(node.x, node.y, 2.5, 0, Math.PI * 2);
            if (isActivated) {
              if (status === 'anomalous') ctx.fillStyle = '#EF4444';
              else if (status === 'suspicious') ctx.fillStyle = '#F59E0B';
              else ctx.fillStyle = '#3B5BFF';
            } else {
              ctx.fillStyle = 'rgba(10, 10, 10, 0.25)';
            }
          }
          ctx.fill();
        }

        // 5. Draw Tiny Mono Labels near clusters when activated
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';

        for (let c = 0; c < 9; c++) {
          const isActivated = c <= activeFeatureIndex || activeFeatureIndex === -1;
          if (isActivated) {
            const cNodes = nodes.filter((n) => n.cluster === c);
            if (cNodes.length > 0) {
              const status = featureStatuses[c] || 'normal';
              let textColor = '#0A0A0A';
              if (status === 'anomalous') textColor = '#DC2626';
              else if (status === 'suspicious') textColor = '#D97706';
              else textColor = '#3B5BFF';

              ctx.fillStyle = textColor;
              ctx.fillText(FEATURE_SHORT_NAMES[c], cNodes[0].baseX, cNodes[0].baseY - 14);
            }
          }
        }
      };

      // Main Loop
      const loop = (now: number) => {
        if (!isVisibleRef.current || !isTabActiveRef.current) {
          rafIdRef.current = null;
          return;
        }

        if (now - lastFrameTimeRef.current >= frameInterval) {
          lastFrameTimeRef.current = now;
          const rect = container.getBoundingClientRect();
          renderFrame(now, rect.width, compact ? 220 : Math.max(300, rect.height || 360));
        }

        rafIdRef.current = requestAnimationFrame(loop);
      };

      // Set up ResizeObserver
      let resizeTimer: number | null = null;
      const ro = new ResizeObserver(() => {
        if (resizeTimer) window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(handleResize, 80);
      });
      ro.observe(container);
      handleResize();

      // IntersectionObserver: Pause when out of viewport
      const io = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          isVisibleRef.current = entry?.isIntersecting ?? false;

          if (isVisibleRef.current && isTabActiveRef.current && !rafIdRef.current && !reducedMotion && !lowPower) {
            lastFrameTimeRef.current = performance.now();
            rafIdRef.current = requestAnimationFrame(loop);
          } else if (!isVisibleRef.current && rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
          }
        },
        { threshold: 0.05 }
      );
      io.observe(container);

      // Visibilitychange: Pause when tab is hidden
      const handleVisibilityChange = () => {
        isTabActiveRef.current = !document.hidden;

        if (isTabActiveRef.current && isVisibleRef.current && !rafIdRef.current && !reducedMotion && !lowPower) {
          lastFrameTimeRef.current = performance.now();
          rafIdRef.current = requestAnimationFrame(loop);
        } else if (!isTabActiveRef.current && rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Start loop if allowed
      if (!reducedMotion && !lowPower) {
        rafIdRef.current = requestAnimationFrame(loop);
      }

      return () => {
        if (resizeTimer) window.clearTimeout(resizeTimer);
        ro.disconnect();
        io.disconnect();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
      };
    }, [compact, activeFeatureIndex, featureStatuses]);

    return (
      <div
        ref={containerRef}
        className={`w-full relative overflow-hidden flex items-center justify-center ${
          compact ? 'h-[220px]' : 'h-[360px]'
        }`}
        aria-label="Neural Synapse Acoustic Visualizer"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          style={{ willChange: 'transform' }}
        />
      </div>
    );
  }
);

NeuralSynapseCanvas.displayName = 'NeuralSynapseCanvas';
