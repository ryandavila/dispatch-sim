import type { Mission } from '../types/mission';
import type { ShiftCall } from '../types/shift';
import { getDifficultyColor } from '../utils/colors';

interface ShiftCallCardProps {
  call: ShiftCall;
  mission: Mission | undefined;
  /** Current virtual shift time (ms). */
  now: number;
  callTimerMs: number;
  onRespond: (callId: string) => void;
}

/** An open call on the live board: mission summary + countdown to auto-fail. */
export function ShiftCallCard({ call, mission, now, callTimerMs, onRespond }: ShiftCallCardProps) {
  const remainingMs = Math.max(0, call.expiresAt - now);
  const fraction = Math.max(0, Math.min(1, remainingMs / callTimerMs));
  const urgent = fraction < 0.3;

  return (
    <div className={`shift-call-card ${urgent ? 'urgent' : ''}`}>
      <div className="shift-call-header">
        <h4>{mission?.name ?? 'Unknown Call'}</h4>
        {mission && (
          <span
            className="shift-call-difficulty"
            style={{ color: getDifficultyColor(mission.difficulty) }}
          >
            {mission.difficulty}
          </span>
        )}
      </div>

      <div className="shift-call-timer">
        <div className="shift-call-timer-track">
          <div className="shift-call-timer-fill" style={{ width: `${fraction * 100}%` }} />
        </div>
        <span className="shift-call-timer-value">{(remainingMs / 1000).toFixed(0)}s</span>
      </div>

      <button type="button" className="shift-call-respond" onClick={() => onRespond(call.id)}>
        Respond
      </button>
    </div>
  );
}
