import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MonoLabel } from '../ui/MonoLabel';
import { useAnalysisStore } from '../../store/useAnalysisStore';
import { UserCheck, MessageSquare, Copy, Check, Send, Trash2 } from 'lucide-react';
import type { RiskLevel } from '../../types/analysis';

interface PlaybookGuardianAlertProps {
  level: RiskLevel;
  pattern: string;
}

interface SavedContact {
  name: string;
  relationship: string;
  maskedPhone: string;
}

const STORAGE_KEY_CONTACT = 'meditrust.guardian.contact.v1';

function maskIndianPhone(digits: string): string {
  if (digits.length !== 10) return '+91 ' + digits;
  return `+91 ${digits.slice(0, 2)}••• ••${digits.slice(7)}`;
}

export const PlaybookGuardianAlert: React.FC<PlaybookGuardianAlertProps> = React.memo(
  ({ level }) => {
    const trustedContactAlerted = useAnalysisStore((s) => s.trustedContactAlerted);
    const setTrustedContactAlerted = useAnalysisStore((s) => s.setTrustedContactAlerted);

    // Form states
    const [name, setName] = useState<string>('');
    const [relationship, setRelationship] = useState<string>('Family');
    const [phoneInput, setPhoneInput] = useState<string>('');
    const [inputError, setInputError] = useState<string | null>(null);

    // Saved contact state (persisted securely in localStorage)
    const [savedContact, setSavedContact] = useState<SavedContact | null>(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY_CONTACT);
        if (raw) return JSON.parse(raw);
      } catch {
        // Fallback to null
      }
      return null;
    });

    // Alert dispatch simulation states
    const [sendProgress, setSendProgress] = useState<string | null>(null);
    const [alertSentTimestamp, setAlertSentTimestamp] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const timeoutsRef = useRef<number[]>([]);

    useEffect(() => {
      return () => {
        timeoutsRef.current.forEach((t) => clearTimeout(t));
        timeoutsRef.current = [];
      };
    }, []);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
      setPhoneInput(val);
      if (inputError) setInputError(null);
    };

    const handleSaveContact = (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) {
        setInputError('Please enter a contact name.');
        return;
      }
      if (phoneInput.length !== 10) {
        setInputError('Phone number must be exactly 10 digits.');
        return;
      }
      if (!['6', '7', '8', '9'].includes(phoneInput[0])) {
        setInputError('Indian mobile numbers must start with 6, 7, 8, or 9.');
        return;
      }

      const masked = maskIndianPhone(phoneInput);
      const contactObj: SavedContact = {
        name: name.trim(),
        relationship,
        maskedPhone: masked,
      };

      setSavedContact(contactObj);
      setPhoneInput('');
      setInputError(null);

      try {
        window.localStorage.setItem(STORAGE_KEY_CONTACT, JSON.stringify(contactObj));
      } catch {
        // Silent local storage fallback
      }
    };

    const handleRemoveContact = () => {
      setSavedContact(null);
      setName('');
      setPhoneInput('');
      try {
        window.localStorage.removeItem(STORAGE_KEY_CONTACT);
      } catch {
        // Silent fallback
      }
    };

    // Pre-formatted safe alert message text (strictly English only, zero raw text)
    const alertMessageText = useMemo(() => {
      return `I may be facing a suspected fraud attempt (level: ${level.toUpperCase()}). Please call me. I am not sharing any OTP or sending money. Helpline: 1930.`;
    }, [level]);

    const handleSendAlert = () => {
      if (!savedContact) return;

      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current = [];

      setSendProgress('PREPARING');

      const t1 = window.setTimeout(() => {
        setSendProgress('SENDING');
      }, 700);

      const t2 = window.setTimeout(() => {
        setSendProgress('DELIVERED (SIMULATED)');
        setTrustedContactAlerted(true);

        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0].slice(0, 5); // HH:MM
        setAlertSentTimestamp(timeStr);

        setToastMessage(`Simulated alert delivered to ${savedContact.name} (${savedContact.maskedPhone}).`);
        setTimeout(() => setToastMessage(null), 4000);
      }, 1800);

      const t3 = window.setTimeout(() => {
        setSendProgress(null);
      }, 3200);

      timeoutsRef.current.push(t1, t2, t3);
    };

    const handleCopyMessage = () => {
      navigator.clipboard.writeText(alertMessageText).then(() => {
        setToastMessage('Alert message copied to clipboard.');
        setTimeout(() => setToastMessage(null), 3500);
      }).catch(() => {
        setToastMessage('Copy failed, please select text manually.');
        setTimeout(() => setToastMessage(null), 3500);
      });
    };

    return (
      <div className="relative p-6 sm:p-10 rounded-[20px] bg-white border border-[#0A0A0A] flex flex-col gap-8">
        {/* Toast */}
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className="absolute top-4 right-4 z-20 bg-[#0A0A0A] text-white px-4 py-2.5 rounded-xl border border-[#0A0A0A] shadow-md flex items-center gap-2.5 text-xs font-['Inter_Tight'] font-semibold"
          >
            <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#0A0A0A]/10">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0037FF]" />
            <MonoLabel color="accent" className="text-xs font-semibold tracking-widest">
              GUARDIAN ALERT (SIMULATED)
            </MonoLabel>
          </div>

          <span className="font-mono-label text-xs text-[#6B6F76]">
            EMERGENCY SAFETY BROADCAST
          </span>
        </div>

        <div>
          <h2 className="text-3xl sm:text-4xl font-light font-['Inter_Tight'] text-[#0A0A0A] mb-2">
            Tell someone you trust
          </h2>
          <p className="font-['Inter_Tight'] text-sm sm:text-base text-[#6B6F76] font-normal max-w-xl">
            Designate a trusted family member, caregiver or friend. In high-pressure moments, a quick
            second opinion breaks psychological urgency traps.
          </p>
        </div>

        {/* Contact Configuration */}
        {!savedContact ? (
          <form
            onSubmit={handleSaveContact}
            className="p-6 rounded-[16px] bg-[#F0F0F0]/60 border border-[#0A0A0A]/10 flex flex-col gap-4 max-w-2xl"
          >
            <MonoLabel color="muted" className="text-[10px]">
              TRUSTED CONTACT SETUP
            </MonoLabel>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Name */}
              <div className="flex flex-col gap-1.5 sm:col-span-1">
                <label htmlFor="contact-name" className="font-mono-label text-[11px] text-[#0A0A0A]">
                  NAME
                </label>
                <input
                  id="contact-name"
                  type="text"
                  placeholder="e.g. Dr. Rajesh or Sister"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-white border border-[#0A0A0A]/20 text-[#0A0A0A] text-sm font-['Inter_Tight'] focus:outline-none focus:border-[#0037FF]"
                />
              </div>

              {/* Relationship */}
              <div className="flex flex-col gap-1.5 sm:col-span-1">
                <label htmlFor="contact-rel" className="font-mono-label text-[11px] text-[#0A0A0A]">
                  RELATIONSHIP
                </label>
                <select
                  id="contact-rel"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-white border border-[#0A0A0A]/20 text-[#0A0A0A] text-sm font-['Inter_Tight'] focus:outline-none focus:border-[#0037FF]"
                >
                  <option value="Family">Family</option>
                  <option value="Caregiver">Caregiver</option>
                  <option value="Friend">Friend</option>
                  <option value="Doctor">Doctor</option>
                </select>
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-1.5 sm:col-span-1">
                <label htmlFor="contact-phone" className="font-mono-label text-[11px] text-[#0A0A0A]">
                  PHONE NUMBER
                </label>
                <div className="flex items-center rounded-lg bg-white border border-[#0A0A0A]/20 overflow-hidden focus-within:border-[#0037FF]">
                  <span className="px-2.5 py-2 font-mono-label text-xs text-[#6B6F76] bg-[#F0F0F0] border-r border-[#0A0A0A]/10">
                    +91
                  </span>
                  <input
                    id="contact-phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="9876543210"
                    value={phoneInput}
                    onChange={handlePhoneChange}
                    className="w-full px-2.5 py-2 text-sm text-[#0A0A0A] font-mono-label focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {inputError && (
              <span className="font-mono-label text-xs text-[#E11D2E] font-medium">
                {inputError}
              </span>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#0A0A0A] hover:bg-[#222222] text-white font-mono-label text-xs font-semibold cursor-pointer transition-colors"
              >
                SAVE CONTACT
              </button>
            </div>
          </form>
        ) : (
          <div className="p-5 rounded-[16px] bg-[#F0F0F0]/70 border border-[#0A0A0A]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0037FF]/10 border border-[#0037FF]/30 flex items-center justify-center text-[#0037FF]">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="font-['Inter_Tight'] font-medium text-base text-[#0A0A0A] block">
                  {savedContact.name} ({savedContact.relationship})
                </span>
                <span className="font-mono-label text-xs text-[#6B6F76]">
                  {savedContact.maskedPhone} · STORED LOCALLY ONLY
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRemoveContact}
              className="font-mono-label text-xs text-[#6B6F76] hover:text-[#E11D2E] flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>REMOVE CONTACT</span>
            </button>
          </div>
        )}

        {/* ALERT PREVIEW: Plain message bubble card */}
        <div className="flex flex-col gap-3 max-w-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#0037FF]" />
              <MonoLabel color="ink" className="text-xs font-semibold">
                ALERT PREVIEW (PRE-COMPOSED TEXT)
              </MonoLabel>
            </div>
            <span className="font-mono-label text-[10px] text-[#6B6F76]">
              NO RAW DATA SHARED
            </span>
          </div>

          <div className="p-5 rounded-[16px] bg-[#F0F0F0]/90 border border-[#0A0A0A]/15 relative">
            <p className="font-['Inter_Tight'] text-sm sm:text-base text-[#0A0A0A] leading-relaxed">
              "{alertMessageText}"
            </p>
          </div>
        </div>

        {/* Action Controls & Dispatch Line */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div>
            {alertSentTimestamp ? (
              <span className="font-mono-label text-xs text-[#16A34A] font-semibold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>ALERT SENT AT {alertSentTimestamp} (SIMULATED)</span>
              </span>
            ) : sendProgress ? (
              <span className="font-mono-label text-xs text-[#0037FF] font-bold animate-pulse">
                STATUS: {sendProgress}...
              </span>
            ) : (
              <span className="font-mono-label text-xs text-[#6B6F76]">
                READY TO DISPATCH
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#F0F0F0] border border-[#0A0A0A] text-[#0A0A0A] font-mono-label text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>COPY MESSAGE</span>
            </button>

            <button
              type="button"
              disabled={!savedContact || !!sendProgress}
              onClick={handleSendAlert}
              className={`px-4 py-2.5 rounded-xl font-mono-label text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                !savedContact
                  ? 'bg-[#0A0A0A]/20 text-[#0A0A0A]/40 border border-transparent cursor-not-allowed'
                  : trustedContactAlerted
                  ? 'bg-[#16A34A] text-white border border-[#16A34A]'
                  : 'bg-[#0037FF] hover:bg-[#0030E0] text-white border border-[#0037FF]'
              }`}
            >
              {trustedContactAlerted ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>ALERT DELIVERED (SIMULATED)</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>SEND ALERT (SIMULATED)</span>
                </>
              )}
            </button>
          </div>
        </div>

        <p className="font-['Inter_Tight'] text-xs text-[#6B6F76] pt-1 border-t border-[#0A0A0A]/10">
          Demo only. No message is actually sent. A real version would use SMS or WhatsApp with
          explicit consent.
        </p>
      </div>
    );
  }
);

PlaybookGuardianAlert.displayName = 'PlaybookGuardianAlert';
