# MediTrust AI — Unified Digital Security for Healthcare

MediTrust AI is an early-warning digital defense system designed specifically for hospitals, medical practitioners, and healthcare administration staff facing coordinated multi-vector fraud attacks.

Attackers rarely target medical professionals through a single channel. An incident often begins with a spoofed recruitment offer (Job Shield), escalates with a cloned voice of a medical director or chief medical officer (Voice Shield), and culminates in an unauthorized SIM swap to intercept two-factor bank or hospital login OTPs (SIM Guard). MediTrust connects these isolated signals into a single unified threat picture using the **Fusion Engine**.

---

## Architecture: Three Shields + One Fusion Engine

1. **Job Shield (`/job`)**
   - Scans WhatsApp messages, fake hospital recruitment notices, and PDF offer letters.
   - Cross-references 6 threat intel registries: Google Safe Browsing, VirusTotal (75+ engines), URLhaus, AbuseIPDB, SecurityTrails, and internal heuristics.
   - Flags upfront security fee demands, suspicious UPI handles, and unofficial recruitment domains.

2. **Voice Shield (`/voice`)**
   - Acoustic forensic engine analyzing high-risk emergency phone calls and voice notes.
   - Detects neural text-to-speech artifacts, synthetic spectral jitter, unnatural pitch variance, and zero-crossing irregularities.
   - Visualizes live audio waveforms and neural synapse feature activations on an interactive canvas.

3. **SIM Guard (`/sim`)**
   - Monitors carrier-side SIM telemetry (simulated).
   - Detects impossible travel (e.g. 900 km location jump within 11 minutes), unauthorized handset IMEI hardware swaps, and rapid OTP authentication floods.
   - Triggers simulated automated Freeze Protocols to contain active credential theft.

4. **Fusion Engine (`/fusion`)**
   - Correlates multi-vector alerts across voice, recruitment phishing, and telecom anomalies.
   - Computes weighted composite risk scores and reconstructs the sequential attack chain.
   - Directly links to the **Playbook (`/playbook`)** for step-by-step incident containment and emergency Guardian Alerts.

---

## How to Run

The frontend is built with React 18, Vite, TypeScript, Tailwind CSS, and Framer Motion.

```bash
# 1. Navigate to Frontend directory
cd Frontend

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev

# 4. Production build
npm run build

# 5. Preview production build
npm run preview
```

The app will be available locally at `http://localhost:5173` (or `http://localhost:4173` for preview).

---

## Demo Flow & Presenter Mode

MediTrust includes a built-in **Presenter Mode** for live jury demonstrations and evaluators:

- **Launch:** Press `Shift+D` anywhere in the app, or click **"START PRESENTER MODE ↗"** from the Dashboard or navigation menu.
- **Five Sequential Steps:**
  1. `01 JOB` (`/job?demo=1`): Auto-loads and scans a fraudulent hospital offer message.
  2. `02 VOICE` (`/voice?demo=1`): Auto-loads and runs forensic analysis on an AI voice clone sample.
  3. `03 SIM` (`/sim?demo=1`): Auto-registers the demo number and executes the multi-stage attack sequence.
  4. `04 FUSION` (`/fusion?demo=1`): Automatically correlates all three shield verdicts into the composite attack chain.
  5. `05 PLAYBOOK` (`/playbook?demo=1`): Displays active containment directives and pre-fills the emergency Guardian Alert preview.
- **Auto-Play:** Press `Space` or click **AUTO-PLAY** in the bottom conductor pill. After each stage completes, it automatically waits 3 seconds before advancing to the next step.
- **Keyboard Shortcuts:**
  - `Shift+D`: Toggle Presenter Mode
  - `ArrowRight`: Next step
  - `ArrowLeft`: Previous step
  - `Space`: Toggle Auto-Play / Pause
  - `Escape`: Exit Presenter Mode

---

## Audio Samples

Place local audio files in the `Frontend/public/samples/` directory:
- `Frontend/public/samples/ai_deepfake.mp3`: Synthetic AI voice clone sample
- `Frontend/public/samples/real_human.mp3`: Authentic human speech baseline sample

*Note: If the physical `.mp3` files are absent or unreadable, Voice Shield seamlessly falls back to synthetic waveform simulation and mock forensic analysis with a clear indicator.*

---

## Configuration & Flags

- **`USE_MOCK`**: Configured in `Frontend/src/services/api.ts`.
  - When `true` (default), MediTrust operates completely offline with deterministic mock forensic data and simulated carrier telemetry.
  - When `false`, the frontend connects to live backend verification APIs.

---

## Limitations & Honest Disclosure

- **Simulated Telecom Telemetry:** MediTrust AI does not possess direct SS7, Diameter, or carrier HLR/HSS infrastructure access. SIM swap events, location telemetry, and carrier registration lookups are simulated for security research and demonstration purposes.
- **Simulated Freeze Protocol:** Automated OTP and carrier freezing features are simulated demonstrations of what an enterprise telecom API integration would execute.
- **Early Warning, Not Definitive Proof:** All risk ratings, acoustic verdicts, and fusion correlation scores are probability-based early-warning signals designed to prompt verification, not definitive legal or judicial proof of criminality.
