import type { SimTelemetryEvent, SimEventType, RiskLevel } from '../types/analysis';

export interface TelemetrySource {
  connect: (onEvent: (event: SimTelemetryEvent) => void) => void;
  disconnect: () => void;
  emit: (type: SimEventType, customMessage?: string, severity?: RiskLevel) => void;
}

const IDLE_MESSAGES = [
  'Network integrity scan: OK',
  'Baseline profile matches registered handset',
  'Cellular sector handshake verified: 4G/5G Carrier Aggregation',
  'IMSI routing normal across home subscriber server',
  'Radio access bearer latency: 14ms (Optimal)',
  'Zero unauthenticated signaling transfer requests',
];

export class MockTelemetrySource implements TelemetrySource {
  private listener: ((event: SimTelemetryEvent) => void) | null = null;
  private timerId: number | null = null;
  private isPaused = false;
  private idCounter = 1;

  connect(onEvent: (event: SimTelemetryEvent) => void): void {
    this.listener = onEvent;
    this.startIdleTicker();

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibility);
    }
  }

  disconnect(): void {
    this.listener = null;
    this.stopIdleTicker();

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibility);
    }
  }

  emit(type: SimEventType, customMessage?: string, severity: RiskLevel = 'low'): void {
    if (!this.listener) return;

    const event: SimTelemetryEvent = {
      id: `ev-${Date.now()}-${this.idCounter++}`,
      timestamp: this.getTimestamp(),
      type,
      message: customMessage || this.getDefaultMessage(type),
      severity: severity || this.getDefaultSeverity(type),
    };

    this.listener(event);
  }

  private handleVisibility = (): void => {
    if (document.hidden) {
      this.isPaused = true;
      this.stopIdleTicker();
    } else {
      this.isPaused = false;
      this.startIdleTicker();
    }
  };

  private startIdleTicker(): void {
    if (this.timerId !== null || this.isPaused) return;

    const scheduleNext = () => {
      // 3.5 to 5.0 seconds between idle ticks
      const delay = 3500 + Math.random() * 1500;
      this.timerId = window.setTimeout(() => {
        if (this.listener && !this.isPaused) {
          const msg = IDLE_MESSAGES[Math.floor(Math.random() * IDLE_MESSAGES.length)];
          this.emit('NETWORK_SCAN', msg, 'low');
        }
        this.timerId = null;
        if (!this.isPaused) scheduleNext();
      }, delay);
    };

    scheduleNext();
  }

  private stopIdleTicker(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private getTimestamp(): string {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  private getDefaultMessage(type: SimEventType): string {
    switch (type) {
      case 'BASELINE_OK':
        return 'Network integrity scan: Baseline profile matches';
      case 'LOCATION_JUMP':
        return 'Cell tower telemetry shifted 900 km within 11 minutes (Impossible travel)';
      case 'DEVICE_SWITCH':
        return 'MSISDN provisioned on unknown handset hardware IMEI mismatch';
      case 'OTP_FLOOD':
        return '7 consecutive 2FA authentication SMS tokens requested in 40s';
      case 'SIM_CHANGE':
        return 'Physical SIM card ICCID replacement reported by carrier network';
      case 'ANOMALY_SPIKE':
        return 'Multi-vector anomaly spike exceeds fraud confidence threshold';
      case 'SWAP_CONFIRMED':
        return 'Unauthorized SIM swap confirmed by simulated carrier telemetry';
      case 'FREEZE_ENGAGED':
        return 'Automated Freeze Protocol engaged: Outgoing OTP blocked';
      case 'FREEZE_RELEASED':
        return 'Freeze protocol released by user verification; normal telemetry resumed';
      case 'NETWORK_SCAN':
      default:
        return 'Network integrity scan: OK';
    }
  }

  private getDefaultSeverity(type: SimEventType): RiskLevel {
    switch (type) {
      case 'SWAP_CONFIRMED':
      case 'SIM_CHANGE':
      case 'LOCATION_JUMP':
        return 'critical';
      case 'DEVICE_SWITCH':
      case 'OTP_FLOOD':
      case 'ANOMALY_SPIKE':
        return 'high';
      case 'FREEZE_ENGAGED':
      case 'FREEZE_RELEASED':
        return 'medium';
      case 'BASELINE_OK':
      case 'NETWORK_SCAN':
      default:
        return 'low';
    }
  }
}
