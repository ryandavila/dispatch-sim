import { useEffect, useState } from 'react';

/** localStorage keys holding mid-shift state that must not survive a wipe. */
export const WIPE_STORAGE_KEYS = ['dispatch-sim-shift', 'dispatch-sim-reports'] as const;

const CONFIRM_TOKEN = 'WIPE';
const REBOOT_DELAY_MS = 1200;

interface WipeTerminalProps {
  /** Resets account-level progress (med kits, rank, shift history, ...). */
  resetProgress: () => void;
  /** Resets per-hero progress (level, XP, stats, injuries). */
  resetAgentProgress: () => void;
  /** Overridable for tests; defaults to a full page reload. */
  reboot?: () => void;
}

/**
 * Diegetic "new campaign" affordance: arm the wipe, then type WIPE to confirm.
 * Two deliberate steps so a stray click can't nuke a save.
 */
export function WipeTerminal({
  resetProgress,
  resetAgentProgress,
  reboot = () => window.location.reload(),
}: WipeTerminalProps) {
  const [armed, setArmed] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [wiped, setWiped] = useState(false);

  const canConfirm = confirmText.trim().toUpperCase() === CONFIRM_TOKEN;

  // App.tsx holds its own useUserProgress/useAgentProgress instances (plain
  // useState, no shared store), so its chrome keeps rendering pre-wipe values
  // until the page reloads. Reboot to guarantee no stale in-memory state.
  useEffect(() => {
    if (!wiped) return;
    const timer = window.setTimeout(reboot, REBOOT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [wiped, reboot]);

  const handleArm = () => {
    setArmed(true);
    setConfirmText('');
  };

  const handleCancel = () => {
    setArmed(false);
    setConfirmText('');
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    resetProgress();
    resetAgentProgress();
    for (const key of WIPE_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
    setArmed(false);
    setConfirmText('');
    setWiped(true);
  };

  if (wiped) {
    return (
      <div className="hs-wipe hs-wipe-done sdn-readout">
        » TERMINAL WIPED — campaign reset. Rebooting…
      </div>
    );
  }

  if (!armed) {
    return (
      <button type="button" className="sdn-btn sdn-btn-danger hs-wipe-arm" onClick={handleArm}>
        Wipe terminal
      </button>
    );
  }

  return (
    <div className="hs-wipe hs-wipe-armed sdn-window">
      <div className="sdn-window-title">CONFIRM WIPE</div>
      <div className="sdn-window-body">
        <p className="hs-wipe-warning">
          This erases every hero, rank tier, and stored item — a new campaign, from zero. Type{' '}
          <strong>WIPE</strong> to confirm.
        </p>
        <input
          type="text"
          className="hs-wipe-input"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="TYPE WIPE"
          aria-label="Type WIPE to confirm terminal wipe"
        />
        <div className="hs-wipe-actions">
          <button
            type="button"
            className="sdn-btn sdn-btn-danger"
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            Confirm wipe
          </button>
          <button type="button" className="sdn-btn sdn-btn-ghost" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
