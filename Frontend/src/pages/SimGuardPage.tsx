import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAnalysisStore } from '../store/useAnalysisStore';
import { api } from '../services/api';
import type {
  CarrierInfo,
  SimTelemetryEvent,
  SimRedFlag,
} from '../types/analysis';
import { MockTelemetrySource } from '../services/telemetry';
import { evaluateAnomaly } from '../services/simRules';
import { SimGuardHeader } from '../components/sim/SimGuardHeader';
import { SimRegisterSection } from '../components/sim/SimRegisterSection';
import { SimCarrierCard } from '../components/sim/SimCarrierCard';
import { SimTelemetryStream } from '../components/sim/SimTelemetryStream';
import { SimStatusPanel } from '../components/sim/SimStatusPanel';
import { SimSimulationLab } from '../components/sim/SimSimulationLab';
import { SimFreezeProtocolPanel } from '../components/sim/SimFreezeProtocolPanel';
import { SimResultSummary } from '../components/sim/SimResultSummary';
import { MonoLabel } from '../components/ui/MonoLabel';

export const SimGuardPage: React.FC = React.memo(() => {
  const [searchParams] = useSearchParams();
  const simNumber = useAnalysisStore((s) => s.simNumber);
  const simStatus = useAnalysisStore((s) => s.simStatus);
  const simScore = useAnalysisStore((s) => s.simScore);
  const carrier = useAnalysisStore((s) => s.carrier);
  const trustedContactAlerted = useAnalysisStore((s) => s.trustedContactAlerted);

  const setSimNumber = useAnalysisStore((s) => s.setSimNumber);
  const setSimStatus = useAnalysisStore((s) => s.setSimStatus);
  const setSimScore = useAnalysisStore((s) => s.setSimScore);
  const setCarrier = useAnalysisStore((s) => s.setCarrier);
  const setShieldResult = useAnalysisStore((s) => s.setShieldResult);
  const setShieldStatus = useAnalysisStore((s) => s.setShieldStatus);
  const setTrustedContactAlerted = useAnalysisStore((s) => s.setTrustedContactAlerted);
  const setBlobTone = useAnalysisStore((s) => s.setBlobTone);
  const resetSimGuard = useAnalysisStore((s) => s.resetSimGuard);

  // Guard to ensure demo auto-run executes only once per visit
  const hasAutoRunRef = useRef(false);

  // Local telemetry events & integrity history (prevent whole-page re-renders)
  const [events, setEvents] = useState<SimTelemetryEvent[]>([]);
  const [integrityHistory, setIntegrityHistory] = useState<number[]>([98, 98, 99, 97, 98]);
  const [currentIntegrity, setCurrentIntegrity] = useState<number>(98);
  const [redFlags, setRedFlags] = useState<SimRedFlag[]>([]);

  // Simulation Lab Attack Chain state
  const [isAutoRunning, setIsAutoRunning] = useState<boolean>(false);
  const [attackChainSteps, setAttackChainSteps] = useState({
    baseline: true,
    location: false,
    device: false,
    otp: false,
    freeze: false,
  });

  // Telemetry source instance & auto timeout chain ref
  const telemetrySourceRef = useRef<MockTelemetrySource | null>(null);
  const autoTimeoutsRef = useRef<number[]>([]);

  // Reset gradient blob on unmount
  useEffect(() => {
    return () => {
      setBlobTone('idle');
      autoTimeoutsRef.current.forEach((t) => clearTimeout(t));
      if (telemetrySourceRef.current) {
        telemetrySourceRef.current.disconnect();
      }
    };
  }, [setBlobTone]);

  // Synchronize GradientBlob tone with SIM status
  useEffect(() => {
    if (simStatus === 'confirmed') {
      setBlobTone('critical');
    } else if (simStatus === 'anomaly') {
      setBlobTone('high');
    } else if (simStatus === 'frozen') {
      setBlobTone('medium');
    } else {
      setBlobTone('idle');
    }
  }, [simStatus, setBlobTone]);

  // Handle incoming event from Telemetry Source
  const handleIncomingEvent = useCallback(
    (ev: SimTelemetryEvent) => {
      setEvents((prev) => {
        const next = [ev, ...prev].slice(0, 40);
        // Evaluate anomaly rules
        const evalRes = evaluateAnomaly(next, simStatus);

        setCurrentIntegrity(evalRes.integrity);
        setIntegrityHistory((h) => [...h.slice(-39), evalRes.integrity]);
        setRedFlags(evalRes.redFlags);
        setSimScore(evalRes.score);

        // Update status unless manually frozen
        if (simStatus !== 'frozen') {
          setSimStatus(evalRes.status);
        }

        if (evalRes.status === 'confirmed' || evalRes.status === 'anomaly' || simStatus === 'frozen') {
          setShieldStatus('sim', 'done');
        }

        setShieldResult('sim', evalRes.shieldResult);
        return next;
      });
    },
    [simStatus, setShieldResult, setShieldStatus, setSimScore, setSimStatus]
  );

  // Initialize Telemetry Source when number is registered
  useEffect(() => {
    if (simNumber && !telemetrySourceRef.current) {
      const source = new MockTelemetrySource();
      telemetrySourceRef.current = source;
      source.connect(handleIncomingEvent);
    } else if (!simNumber && telemetrySourceRef.current) {
      telemetrySourceRef.current.disconnect();
      telemetrySourceRef.current = null;
    }
  }, [simNumber, handleIncomingEvent]);

  // Registration handler
  const handleRegistered = useCallback(
    ({ maskedNumber, carrier: c }: { maskedNumber: string; carrier: CarrierInfo }) => {
      setSimNumber(maskedNumber);
      setCarrier(c);
      setSimStatus('normal');
      setSimScore(0);
      setAttackChainSteps({
        baseline: true,
        location: false,
        device: false,
        otp: false,
        freeze: false,
      });

      // Initial baseline OK event
      if (telemetrySourceRef.current) {
        telemetrySourceRef.current.emit(
          'BASELINE_OK',
          `Handset telemetry baseline linked to carrier node (${c.region})`,
          'low'
        );
      }
    },
    [setCarrier, setSimNumber, setSimScore, setSimStatus]
  );

  // Change Number / Reset Number
  const handleChangeNumber = useCallback(() => {
    autoTimeoutsRef.current.forEach((t) => clearTimeout(t));
    autoTimeoutsRef.current = [];
    setIsAutoRunning(false);

    if (telemetrySourceRef.current) {
      telemetrySourceRef.current.disconnect();
      telemetrySourceRef.current = null;
    }

    resetSimGuard();
    setEvents([]);
    setIntegrityHistory([98, 98, 99, 97, 98]);
    setCurrentIntegrity(98);
    setRedFlags([]);
  }, [resetSimGuard]);

  // Attack Trigger: Location Jump
  const handleTriggerLocationJump = useCallback(() => {
    if (telemetrySourceRef.current) {
      telemetrySourceRef.current.emit(
        'LOCATION_JUMP',
        'Login from Mumbai, 11 minutes after Ghaziabad session (900 km impossible travel)',
        'critical'
      );
      setAttackChainSteps((s) => ({ ...s, location: true }));
    }
  }, []);

  // Attack Trigger: Device Switch
  const handleTriggerDeviceSwitch = useCallback(() => {
    if (telemetrySourceRef.current) {
      telemetrySourceRef.current.emit(
        'DEVICE_SWITCH',
        'Handset hardware signature switched to unknown Android IMEI 3548920194821',
        'high'
      );
      setAttackChainSteps((s) => ({ ...s, device: true }));
    }
  }, []);

  // Attack Trigger: OTP Flood
  const handleTriggerOtpFlood = useCallback(() => {
    if (telemetrySourceRef.current) {
      telemetrySourceRef.current.emit(
        'OTP_FLOOD',
        '7 consecutive 2FA authentication SMS tokens requested in 40 seconds',
        'high'
      );
      setAttackChainSteps((s) => ({ ...s, otp: true }));
    }
  }, []);

  // Attack Trigger: AUTO ATTACK SEQUENCE (11s timeline)
  const handleTriggerAutoSequence = useCallback(() => {
    if (isAutoRunning) return;

    // Clear previous pending auto timeouts
    autoTimeoutsRef.current.forEach((t) => clearTimeout(t));
    autoTimeoutsRef.current = [];

    setIsAutoRunning(true);
    setAttackChainSteps({
      baseline: true,
      location: false,
      device: false,
      otp: false,
      freeze: false,
    });

    const source = telemetrySourceRef.current;
    if (!source) return;

    // t=0: BASELINE_OK
    source.emit('BASELINE_OK', 'Network integrity scan: Baseline profile verified', 'low');

    // t=2s: LOCATION_JUMP
    const t1 = window.setTimeout(() => {
      source.emit(
        'LOCATION_JUMP',
        'Login from Mumbai, 11 minutes after Ghaziabad session',
        'critical'
      );
      setAttackChainSteps((s) => ({ ...s, location: true }));
    }, 2000);
    autoTimeoutsRef.current.push(t1);

    // t=4s: DEVICE_SWITCH
    const t2 = window.setTimeout(() => {
      source.emit('DEVICE_SWITCH', 'Unknown handset IMEI mismatch detected', 'high');
      setAttackChainSteps((s) => ({ ...s, device: true }));
    }, 4000);
    autoTimeoutsRef.current.push(t2);

    // t=6s: OTP_FLOOD
    const t3 = window.setTimeout(() => {
      source.emit('OTP_FLOOD', '7 OTP requests in 40 seconds', 'high');
      setAttackChainSteps((s) => ({ ...s, otp: true }));
    }, 6000);
    autoTimeoutsRef.current.push(t3);

    // t=7.5s: ANOMALY_SPIKE
    const t4 = window.setTimeout(() => {
      source.emit(
        'ANOMALY_SPIKE',
        'Multi-vector anomaly spike exceeds fraud confidence threshold',
        'high'
      );
    }, 7500);
    autoTimeoutsRef.current.push(t4);

    // t=9s: SWAP_CONFIRMED
    const t5 = window.setTimeout(() => {
      source.emit(
        'SWAP_CONFIRMED',
        'IMSI allocation transfer confirmed by carrier network',
        'critical'
      );
    }, 9000);
    autoTimeoutsRef.current.push(t5);

    // t=10.5s: FREEZE_ENGAGED
    const t6 = window.setTimeout(() => {
      source.emit(
        'FREEZE_ENGAGED',
        'Automated Freeze Protocol engaged: Outgoing OTP blocked',
        'medium'
      );
      setSimStatus('frozen');
      setShieldStatus('sim', 'done');
      setAttackChainSteps((s) => ({ ...s, freeze: true }));
      setIsAutoRunning(false);
    }, 10500);
    autoTimeoutsRef.current.push(t6);
  }, [isAutoRunning, setSimStatus, setShieldStatus]);

  // Auto-run support for demo mode: registers demo number and triggers auto attack sequence
  useEffect(() => {
    if (searchParams.get('demo') === '1' && !hasAutoRunRef.current && !simNumber) {
      hasAutoRunRef.current = true;
      api
        .registerNumber('9820144210')
        .then((carrierInfo) => {
          handleRegistered({
            maskedNumber: '+91 98••• ••210',
            carrier: carrierInfo,
          });
          const t = window.setTimeout(() => {
            handleTriggerAutoSequence();
          }, 600);
          autoTimeoutsRef.current.push(t);
        })
        .catch((err) => {
          console.error('SIM demo register error', err);
        });
    }
  }, [searchParams, simNumber, handleRegistered, handleTriggerAutoSequence]);

  // Reset Simulation Lab
  const handleResetLab = useCallback(() => {
    autoTimeoutsRef.current.forEach((t) => clearTimeout(t));
    autoTimeoutsRef.current = [];
    setIsAutoRunning(false);

    setAttackChainSteps({
      baseline: true,
      location: false,
      device: false,
      otp: false,
      freeze: false,
    });

    setSimStatus('normal');
    setSimScore(0);
    setCurrentIntegrity(98);
    setIntegrityHistory([98, 98, 99, 97, 98]);
    setRedFlags([]);
    setBlobTone('idle');

    if (telemetrySourceRef.current) {
      telemetrySourceRef.current.emit(
        'BASELINE_OK',
        'Lab reset: Telemetry baseline re-calibrated to 98% integrity',
        'low'
      );
    }
  }, [setBlobTone, setSimScore, setSimStatus]);

  // Release Freeze Protocol
  const handleReleaseFreeze = useCallback(() => {
    if (telemetrySourceRef.current) {
      telemetrySourceRef.current.emit(
        'FREEZE_RELEASED',
        'Freeze protocol released by user verification; normal telemetry resumed',
        'low'
      );
    }
    setSimStatus('normal');
    setSimScore(0);
    setCurrentIntegrity(97);
    setBlobTone('idle');
  }, [setBlobTone, setSimScore, setSimStatus]);

  // Notify Trusted Contact
  const handleNotifyTrustedContact = useCallback(() => {
    setTrustedContactAlerted(true);
  }, [setTrustedContactAlerted]);

  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 md:px-14 py-10 sm:py-16 flex flex-col">
      {/* 1) Header */}
      <SimGuardHeader />

      {/* 2) Registration Section (Shown until number registered) */}
      {!simNumber && <SimRegisterSection onRegistered={handleRegistered} />}

      {/* When Number is Registered: Carrier Card, Telemetry & Lab */}
      {simNumber && carrier && (
        <div className="w-full space-y-8 animate-fade-in">
          {/* 3) Carrier Node Intelligence Card */}
          <SimCarrierCard
            maskedNumber={simNumber}
            carrier={carrier}
            simStatus={simStatus}
            anomalyScore={simScore}
            onChangeNumber={handleChangeNumber}
          />

          {/* 4) Live Telemetry Stream + Status Panel (Two Columns) */}
          <section
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch"
            aria-label="Live Telemetry and Network Integrity"
          >
            {/* Stream Left */}
            <div className="lg:col-span-7 xl:col-span-8 h-full">
              <SimTelemetryStream events={events} />
            </div>

            {/* Status Panel Right */}
            <div className="lg:col-span-5 xl:col-span-4 h-full">
              <SimStatusPanel
                status={simStatus}
                integrity={currentIntegrity}
                integrityHistory={integrityHistory}
              />
            </div>
          </section>

          {/* 5) Simulation Lab (Trigger Attacks Grid) */}
          <SimSimulationLab
            isAutoRunning={isAutoRunning}
            attackChainSteps={attackChainSteps}
            onTriggerLocationJump={handleTriggerLocationJump}
            onTriggerDeviceSwitch={handleTriggerDeviceSwitch}
            onTriggerOtpFlood={handleTriggerOtpFlood}
            onTriggerAutoSequence={handleTriggerAutoSequence}
            onResetLab={handleResetLab}
          />

          {/* 6) Freeze Protocol Panel (Appears when swap confirmed or frozen) */}
          {(simStatus === 'confirmed' || simStatus === 'frozen') && (
            <SimFreezeProtocolPanel
              trustedContactAlerted={trustedContactAlerted}
              onReleaseFreeze={handleReleaseFreeze}
              onNotifyTrustedContact={handleNotifyTrustedContact}
            />
          )}

          {/* 7) Result Summary (Appears once status is not normal or idle) */}
          {simStatus !== 'normal' && simStatus !== 'idle' && (
            <SimResultSummary
              score={simScore}
              status={simStatus}
              redFlags={redFlags}
              maskedNumber={simNumber}
            />
          )}
        </div>
      )}

      {/* Footer hairline */}
      <div className="border-t border-[#0A0A0A]/20 pt-8 mt-12 flex flex-col sm:flex-row justify-between items-center gap-4">
        <MonoLabel color="muted">
          SHIELD 03 // TELECOM IDENTITY MONITOR · CARRIER TELEMETRY
        </MonoLabel>
        <span className="font-mono text-xs text-[#6B6F76]">
          MEDITRUST AI HEALTHCARE SECURITY SUITE
        </span>
      </div>
    </div>
  );
});

SimGuardPage.displayName = 'SimGuardPage';
export default SimGuardPage;
