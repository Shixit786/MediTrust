import React, { useState, useMemo } from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { HairlineRow } from '../ui/HairlineRow';
import { ExternalLink, CheckSquare, Square, ShieldAlert } from 'lucide-react';

interface PlaybookStepsProps {
  hasVoice: boolean;
  hasJob: boolean;
  hasSim: boolean;
}

interface StepItem {
  id: string;
  stage: 'A' | 'B' | 'C';
  text: string;
  highlight?: boolean;
}

export const PlaybookSteps: React.FC<PlaybookStepsProps> = React.memo(
  ({ hasVoice, hasJob, hasSim }) => {
    // Generate dynamic list of steps based on active threat vectors
    const steps: StepItem[] = useMemo(() => {
      const list: StepItem[] = [
        // Stage A: RIGHT NOW (FIRST 10 MINUTES)
        {
          id: 'step-a1',
          stage: 'A',
          text: 'Stop all contact with the suspected sender or caller immediately.',
        },
        {
          id: 'step-a2',
          stage: 'A',
          text: 'Do not click links in the message, email, or linked offer documents.',
        },
        {
          id: 'step-a3',
          stage: 'A',
          text: 'Do not share any OTP, PIN, password, or Aadhaar identity numbers.',
        },
        {
          id: 'step-a4',
          stage: 'A',
          text: 'Hang up and call the hospital, employer, or bank on their verified official number.',
        },
        {
          id: 'step-a5',
          stage: 'A',
          text: 'Take screenshots of messages, caller IDs, and call logs to preserve evidence.',
        },
      ];

      if (hasVoice) {
        list.push({
          id: 'step-a-voice',
          stage: 'A',
          text: "Ask someone else to verify the caller's voice and identity independently.",
          highlight: true,
        });
      }

      if (hasJob) {
        list.push({
          id: 'step-a-job',
          stage: 'A',
          text: 'Do not pay any registration, interview, equipment, or security deposit fee.',
          highlight: true,
        });
      }

      // Stage B: NEXT (WITHIN 1 HOUR)
      list.push(
        {
          id: 'step-b1',
          stage: 'B',
          text: 'Call your telecom carrier from another phone to verify SIM status and block unauthorized swaps.',
          highlight: hasSim,
        },
        {
          id: 'step-b2',
          stage: 'B',
          text: 'Inform your bank and freeze payment cards or UPI if financial details or OTP were exposed.',
          highlight: hasSim,
        },
        {
          id: 'step-b3',
          stage: 'B',
          text: 'Change primary account passwords and switch from SMS OTP to app-based 2FA authenticators.',
        },
        {
          id: 'step-b4',
          stage: 'B',
          text: 'Inform a family member or trusted colleague about the unfolding situation.',
        }
      );

      // Stage C: REPORT
      list.push(
        {
          id: 'step-c1',
          stage: 'C',
          text: 'Call the National Cyber Crime Helpline at 1930 immediately.',
        },
        {
          id: 'step-c2',
          stage: 'C',
          text: 'File an official report on the National Cyber Crime Portal at cybercrime.gov.in.',
        },
        {
          id: 'step-c3',
          stage: 'C',
          text: 'Report the impersonator profile to the actual hospital or organization being spoofed.',
        },
        {
          id: 'step-c4',
          stage: 'C',
          text: 'Store all preserved screenshots and transmission details in a secure offline folder.',
        }
      );

      return list;
    }, [hasVoice, hasJob, hasSim]);

    // Track checked state locally
    const [checkedState, setCheckedState] = useState<Record<string, boolean>>({});

    const toggleStep = (id: string) => {
      setCheckedState((prev) => ({
        ...prev,
        [id]: !prev[id],
      }));
    };

    const completedCount = steps.filter((s) => checkedState[s.id]).length;
    const totalCount = steps.length;
    const progressRatio = totalCount > 0 ? completedCount / totalCount : 0;

    const stageASteps = steps.filter((s) => s.stage === 'A');
    const stageBSteps = steps.filter((s) => s.stage === 'B');
    const stageCSteps = steps.filter((s) => s.stage === 'C');

    return (
      <div className="flex flex-col gap-10">
        {/* Header & Progress Bar */}
        <div className="flex flex-col gap-4 pb-4 border-b border-[#0A0A0A]/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <MonoLabel color="muted">INCIDENT CONTAINMENT // STEP-BY-STEP PROTOCOL</MonoLabel>
            <div className="flex items-center gap-2">
              <span className="font-mono-label text-xs font-bold text-[#0A0A0A]">
                {completedCount} OF {totalCount} COMPLETED
              </span>
            </div>
          </div>

          {/* Thin scaleX progress bar */}
          <div className="w-full h-1.5 bg-[#0A0A0A]/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0037FF] origin-left transition-transform duration-300 ease-out"
              style={{ transform: `scaleX(${progressRatio})` }}
            />
          </div>
        </div>

        {/* STAGE A */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#E11D2E]" />
            <MonoLabel color="ink" className="text-xs font-semibold">
              STAGE 01 // RIGHT NOW (FIRST 10 MINUTES)
            </MonoLabel>
          </div>

          <div className="flex flex-col bg-white rounded-[20px] border border-[#0A0A0A] overflow-hidden">
            {stageASteps.map((step, idx) => {
              const isChecked = !!checkedState[step.id];
              return (
                <HairlineRow
                  key={step.id}
                  borderTop={idx > 0}
                  borderBottom={false}
                  interactive={true}
                  onClick={() => toggleStep(step.id)}
                  className={`p-4 sm:p-5 transition-colors ${isChecked ? 'bg-[#F0F0F0]/50' : 'bg-white'
                    }`}
                >
                  <label
                    htmlFor={step.id}
                    className="w-full flex items-start gap-4 cursor-pointer select-none"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      id={step.id}
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleStep(step.id)}
                      className="sr-only"
                    />
                    <div className="mt-0.5 shrink-0 text-[#0037FF]">
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5" />
                      ) : (
                        <Square className="w-5 h-5 text-[#6B6F76]" />
                      )}
                    </div>
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span
                        className={`font-['Inter_Tight'] text-sm sm:text-base leading-relaxed ${isChecked ? 'line-through text-[#6B6F76]' : 'text-[#0A0A0A]'
                          }`}
                      >
                        {step.text}
                      </span>
                      {step.highlight && (
                        <span className="px-2 py-0.5 rounded bg-[#F5B800]/15 border border-[#F5B800]/40 text-[#B45309] font-mono-label text-[10px] font-bold self-start sm:self-auto shrink-0">
                          PRIORITY
                        </span>
                      )}
                    </div>
                  </label>
                </HairlineRow>
              );
            })}
          </div>
        </div>

        {/* STAGE B */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: hasSim ? '#FF4FA3' : '#F5B800' }}
            />
            <MonoLabel color="ink" className="text-xs font-semibold">
              STAGE 02 // NEXT (WITHIN 1 HOUR)
            </MonoLabel>
            {hasSim && (
              <span className="px-2 py-0.5 rounded bg-[#FF4FA3]/10 border border-[#FF4FA3]/30 text-[#FF4FA3] font-mono-label text-[10px] font-bold">
                SIM ANOMALY DETECTED
              </span>
            )}
          </div>

          <div
            className={`flex flex-col bg-white rounded-[20px] border overflow-hidden ${hasSim ? 'border-[#FF4FA3]/60 shadow-sm' : 'border-[#0A0A0A]'
              }`}
          >
            {stageBSteps.map((step, idx) => {
              const isChecked = !!checkedState[step.id];
              return (
                <HairlineRow
                  key={step.id}
                  borderTop={idx > 0}
                  borderBottom={false}
                  interactive={true}
                  onClick={() => toggleStep(step.id)}
                  className={`p-4 sm:p-5 transition-colors ${isChecked ? 'bg-[#F0F0F0]/50' : 'bg-white'
                    }`}
                >
                  <label
                    htmlFor={step.id}
                    className="w-full flex items-start gap-4 cursor-pointer select-none"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      id={step.id}
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleStep(step.id)}
                      className="sr-only"
                    />
                    <div className="mt-0.5 shrink-0 text-[#0037FF]">
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5" />
                      ) : (
                        <Square className="w-5 h-5 text-[#6B6F76]" />
                      )}
                    </div>
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span
                        className={`font-['Inter_Tight'] text-sm sm:text-base leading-relaxed ${isChecked ? 'line-through text-[#6B6F76]' : 'text-[#0A0A0A]'
                          }`}
                      >
                        {step.text}
                      </span>
                      {step.highlight && (
                        <span className="px-2 py-0.5 rounded bg-[#FF4FA3]/15 border border-[#FF4FA3]/30 text-[#FF4FA3] font-mono-label text-[10px] font-bold self-start sm:self-auto shrink-0">
                          CARRIER ACTION
                        </span>
                      )}
                    </div>
                  </label>
                </HairlineRow>
              );
            })}
          </div>
        </div>

        {/* STAGE C */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#0037FF]" />
            <MonoLabel color="ink" className="text-xs font-semibold">
              STAGE 03 // OFFICIAL REPORTING
            </MonoLabel>
          </div>

          <div className="flex flex-col bg-white rounded-[20px] border border-[#0A0A0A] overflow-hidden">
            {stageCSteps.map((step, idx) => {
              const isChecked = !!checkedState[step.id];
              return (
                <HairlineRow
                  key={step.id}
                  borderTop={idx > 0}
                  borderBottom={false}
                  interactive={true}
                  onClick={() => toggleStep(step.id)}
                  className={`p-4 sm:p-5 transition-colors ${isChecked ? 'bg-[#F0F0F0]/50' : 'bg-white'
                    }`}
                >
                  <label
                    htmlFor={step.id}
                    className="w-full flex items-start gap-4 cursor-pointer select-none"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      id={step.id}
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleStep(step.id)}
                      className="sr-only"
                    />
                    <div className="mt-0.5 shrink-0 text-[#0037FF]">
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5" />
                      ) : (
                        <Square className="w-5 h-5 text-[#6B6F76]" />
                      )}
                    </div>
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span
                        className={`font-['Inter_Tight'] text-sm sm:text-base leading-relaxed ${isChecked ? 'line-through text-[#6B6F76]' : 'text-[#0A0A0A]'
                          }`}
                      >
                        {step.text}
                      </span>
                    </div>
                  </label>
                </HairlineRow>
              );
            })}
          </div>
        </div>

        {/* Official Contacts Block */}
        <div className="p-6 sm:p-8 rounded-[20px] bg-[#0A0A0A] text-white border border-[#0A0A0A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-[#0037FF] shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-mono-label text-xs font-bold text-white tracking-wider">
                OFFICIAL HELPLINE & REPORTING PORTAL
              </span>
              <p className="font-['Inter_Tight'] text-sm text-white/70">
                CYBER CRIME HELPLINE: <strong className="text-white">1930</strong> (Toll Free, Govt of India)
              </p>
            </div>
          </div>

          <a
            href="https://cybercrime.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-mono-label text-xs font-semibold flex items-center gap-2 transition-colors shrink-0"
          >
            <span>CYBERCRIME.GOV.IN</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }
);

PlaybookSteps.displayName = 'PlaybookSteps';
