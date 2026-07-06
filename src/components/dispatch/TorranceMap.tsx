import type { ReactNode } from 'react';
import type { ActiveMission } from '../../types/activeMission';
import type { Mission } from '../../types/mission';
import type { ShiftCall } from '../../types/shift';

// Wire-frame map of Torrance, CA — the diegetic dispatch terminal surface.
// Calls appear as pulsing "!" markers with countdown rings; deployed teams
// show a beacon; resolved calls become check badges awaiting report review.

export interface OpenCallMarker {
  call: ShiftCall;
  mission: Mission;
}

interface TorranceMapProps {
  openCalls: OpenCallMarker[];
  /** Deployed teams still in flight — shown as on-scene beacons. */
  activeMissions: ActiveMission[];
  /** Settled missions awaiting report review — shown as check badges. */
  reports: ActiveMission[];
  now: number;
  callTimerMs: number;
  onRespond: (callId: string) => void;
  onOpenReport: (activeMissionId: string) => void;
  /** Overlay windows (start screen, briefing, report, review). */
  children?: ReactNode;
}

/** Deterministic tiny offset so repeated calls at one POI don't stack. */
function jitter(id: string): { dx: number; dy: number } {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  const dx = ((h & 0xff) / 255 - 0.5) * 5;
  const dy = (((h >> 8) & 0xff) / 255 - 0.5) * 5;
  return { dx, dy };
}

/** % coordinates for a mission; unlocated missions land mid-town. */
function positionFor(mission: Mission, id: string): { x: number; y: number } {
  const base = mission.location ?? { x: 50, y: 45 };
  const { dx, dy } = jitter(id);
  return {
    x: Math.min(96, Math.max(4, base.x + dx)),
    y: Math.min(94, Math.max(6, base.y + dy)),
  };
}

const RING_R = 23;
const RING_C = 2 * Math.PI * RING_R;

export function TorranceMap({
  openCalls,
  activeMissions,
  reports,
  now,
  callTimerMs,
  onRespond,
  onOpenReport,
  children,
}: TorranceMapProps) {
  return (
    <div className="dm-map">
      <MapArt />

      {openCalls.map(({ call, mission }) => {
        const { x, y } = positionFor(mission, call.id);
        const remaining = Math.max(0, call.expiresAt - now);
        // Per-difficulty timers: each call carries its own window; the shift-wide
        // config value is only the fallback for pre-timerMs saves.
        const fraction = Math.min(1, remaining / (call.timerMs ?? callTimerMs));
        const urgent = fraction < 0.3;
        return (
          <button
            key={call.id}
            type="button"
            className={`dm-marker dm-marker-call${urgent ? ' urgent' : ''}`}
            style={{ left: `${x}%`, top: `${y}%` }}
            onClick={() => onRespond(call.id)}
            aria-label={`Respond to ${mission.name}, ${Math.ceil(remaining / 1000)} seconds left`}
          >
            <svg className="dm-marker-ring" viewBox="0 0 52 52" aria-hidden="true">
              <circle className="track" cx="26" cy="26" r={RING_R} />
              <circle
                className="fill"
                cx="26"
                cy="26"
                r={RING_R}
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - fraction)}
              />
            </svg>
            <span className="dm-marker-call-core">!</span>
          </button>
        );
      })}

      {activeMissions.map((m) => {
        const { x, y } = positionFor(m.mission, m.id);
        return (
          <div
            key={m.id}
            className="dm-marker dm-marker-onscene"
            style={{ left: `${x}%`, top: `${y}%` }}
            title={`${m.mission.name} — team on scene`}
          >
            <svg className="dm-marker-onscene-ring" viewBox="0 0 34 34" aria-hidden="true">
              <circle cx="17" cy="17" r="15" />
            </svg>
            <span className="dm-marker-onscene-core">
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <polygon points="6,0.5 11.4,4.4 9.3,10.8 2.7,10.8 0.6,4.4" fill="#ece4d1" />
              </svg>
            </span>
          </div>
        );
      })}

      {reports.map((m) => {
        const { x, y } = positionFor(m.mission, m.id);
        return (
          <button
            key={m.id}
            type="button"
            className="dm-marker dm-marker-report"
            style={{ left: `${x}%`, top: `${y}%` }}
            onClick={() => onOpenReport(m.id)}
            aria-label={`Review report: ${m.mission.name}`}
          >
            <span className="dm-marker-report-core">✓</span>
          </button>
        );
      })}

      {children}
    </div>
  );
}

/** Points of interest drawn on the map (labels only; calls carry their own coords). */
const POIS: Array<{ name: string; x: number; y: number; anchor?: 'start' | 'end' }> = [
  { name: 'TORRANCE CITY HALL', x: 520, y: 236 },
  { name: 'CRYPTO NIGHT', x: 360, y: 186 },
  { name: "GRANNY'S DONUTS", x: 240, y: 273 },
  { name: 'COMIC PUG', x: 440, y: 322 },
  { name: 'THE SARDINE', x: 300, y: 384 },
  { name: 'TORRANCE BEACH', x: 180, y: 484 },
  { name: 'TORRANCE AIRPORT', x: 740, y: 422 },
  { name: 'TORRANCE COLLEGE', x: 680, y: 161 },
  { name: 'DEL LA MONICE', x: 580, y: 347 },
  { name: 'CRAVENS AVE', x: 400, y: 248 },
  { name: 'DEL AMO MALL', x: 820, y: 248 },
  { name: 'RAIL YARD', x: 880, y: 360, anchor: 'end' },
  { name: 'SEWER JCT C-4', x: 480, y: 434 },
  { name: 'MADRONA MARSH', x: 120, y: 186 },
];

function MapArt() {
  return (
    <svg
      className="dm-map-svg"
      viewBox="0 0 1000 620"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <pattern id="dm-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="rgba(69,169,158,0.07)" strokeWidth="1" />
        </pattern>
      </defs>

      <rect width="1000" height="620" fill="#0a1a19" />
      <rect width="1000" height="620" fill="url(#dm-grid)" />

      {/* ghost city label */}
      <text
        x="40"
        y="80"
        fill="rgba(159,216,208,0.07)"
        fontFamily="Orbitron, sans-serif"
        fontSize="46"
        fontWeight="900"
        letterSpacing="8"
      >
        TORRANCE, CA
      </text>

      {/* ocean + coastline (south-west corner) */}
      <path
        d="M0,460 C110,478 190,520 250,620 L0,620 Z"
        fill="#071413"
        stroke="rgba(69,169,158,0.5)"
        strokeWidth="2"
      />
      <path
        d="M30,520 q18,-8 36,0 q18,8 36,0"
        fill="none"
        stroke="rgba(69,169,158,0.25)"
        strokeWidth="1.5"
      />
      <path
        d="M60,565 q18,-8 36,0 q18,8 36,0"
        fill="none"
        stroke="rgba(69,169,158,0.25)"
        strokeWidth="1.5"
      />
      <path d="M20,480 q18,-8 36,0" fill="none" stroke="rgba(69,169,158,0.25)" strokeWidth="1.5" />
      {/* beach strip */}
      <path
        d="M0,455 C112,472 194,516 256,620"
        fill="none"
        stroke="rgba(221,154,43,0.28)"
        strokeWidth="7"
        strokeDasharray="2 6"
      />

      {/* street grid */}
      <g stroke="rgba(69,169,158,0.32)" strokeWidth="3" fill="none">
        <path d="M0,170 H1000" />
        <path d="M0,250 H1000" />
        <path d="M0,330 H1000" />
        <path d="M240,410 H1000" />
        <path d="M0,455 C250,445 430,490 640,520 L1000,545" />
        <path d="M250,0 V445" />
        <path d="M420,0 V478" />
        <path d="M560,0 V500" />
        <path d="M730,0 V520" />
      </g>
      <g stroke="rgba(69,169,158,0.14)" strokeWidth="1.5" fill="none">
        <path d="M0,210 H1000" />
        <path d="M0,290 H1000" />
        <path d="M120,370 H1000" />
        <path d="M330,0 V460" />
        <path d="M490,0 V490" />
        <path d="M650,0 V510" />
        <path d="M860,0 V535" />
        <path d="M140,0 V430" />
      </g>

      {/* I-405 (double diagonal, upper right) */}
      <g stroke="rgba(69,169,158,0.45)" strokeWidth="4" fill="none">
        <path d="M590,0 L1000,250" />
        <path d="M604,0 L1000,264" />
      </g>
      <text
        x="800"
        y="132"
        fill="rgba(159,216,208,0.4)"
        fontFamily="IBM Plex Mono, monospace"
        fontSize="12"
        transform="rotate(31 800 132)"
      >
        I-405
      </text>

      {/* rail line into the yard */}
      <path
        d="M1000,330 L890,352 L780,415"
        fill="none"
        stroke="rgba(159,216,208,0.3)"
        strokeWidth="2"
        strokeDasharray="8 4"
      />
      <g fill="rgba(159,216,208,0.25)">
        <rect x="866" y="356" width="52" height="4" transform="rotate(-14 892 358)" />
        <rect x="858" y="366" width="52" height="4" transform="rotate(-14 884 368)" />
      </g>

      {/* airport runways */}
      <g
        transform="rotate(-18 740 430)"
        stroke="rgba(159,216,208,0.45)"
        fill="rgba(69,169,158,0.1)"
      >
        <rect x="665" y="424" width="150" height="12" strokeWidth="1.5" />
        <rect x="700" y="398" width="12" height="64" strokeWidth="1.5" />
      </g>

      {/* Madrona Marsh preserve */}
      <path
        d="M85,160 q40,-22 72,2 q26,20 8,46 q-20,26 -56,16 q-38,-10 -24,-64 Z"
        fill="rgba(63,157,90,0.12)"
        stroke="rgba(63,157,90,0.4)"
        strokeWidth="1.5"
      />

      {/* Del Amo Mall block */}
      <rect
        x="790"
        y="222"
        width="58"
        height="40"
        fill="rgba(69,169,158,0.12)"
        stroke="rgba(159,216,208,0.4)"
        strokeWidth="1.5"
      />

      {/* scattered city blocks */}
      <g fill="rgba(69,169,158,0.09)">
        <rect x="262" y="182" width="26" height="16" />
        <rect x="300" y="182" width="18" height="16" />
        <rect x="262" y="262" width="20" height="14" />
        <rect x="436" y="184" width="24" height="14" />
        <rect x="436" y="262" width="30" height="16" />
        <rect x="572" y="184" width="26" height="16" />
        <rect x="572" y="262" width="20" height="14" />
        <rect x="572" y="342" width="26" height="16" />
        <rect x="436" y="342" width="20" height="14" />
        <rect x="300" y="342" width="24" height="16" />
        <rect x="744" y="262" width="24" height="14" />
        <rect x="744" y="182" width="20" height="16" />
        <rect x="262" y="422" width="24" height="14" />
        <rect x="640" y="422" width="20" height="14" />
      </g>

      {/* street names */}
      <g
        fill="rgba(159,216,208,0.32)"
        fontFamily="IBM Plex Mono, monospace"
        fontSize="11"
        letterSpacing="2"
      >
        <text x="16" y="163">
          CARSON ST
        </text>
        <text x="16" y="243">
          TORRANCE BLVD
        </text>
        <text x="620" y="323">
          SEPULVEDA BLVD
        </text>
        <text x="680" y="498">
          PACIFIC COAST HWY
        </text>
        <text x="262" y="86" transform="rotate(90 262 86)">
          HAWTHORNE BLVD
        </text>
        <text x="432" y="60" transform="rotate(90 432 60)">
          CRENSHAW BLVD
        </text>
      </g>

      {/* points of interest */}
      <g>
        {POIS.map((poi) => (
          <g key={poi.name}>
            <rect x={poi.x - 3} y={poi.y - 3} width="6" height="6" fill="rgba(159,216,208,0.85)" />
            <text
              x={poi.anchor === 'end' ? poi.x - 8 : poi.x + 8}
              y={poi.y + 4}
              textAnchor={poi.anchor ?? 'start'}
              fill="rgba(159,216,208,0.5)"
              fontFamily="IBM Plex Mono, monospace"
              fontSize="10.5"
              letterSpacing="1"
            >
              {poi.name}
            </text>
          </g>
        ))}
      </g>

      {/* compass + scale */}
      <g transform="translate(952,572)" stroke="rgba(159,216,208,0.5)" fill="none">
        <circle r="14" strokeWidth="1.5" />
        <path d="M0,9 L0,-9 M0,-9 L-4,-3 M0,-9 L4,-3" strokeWidth="1.5" />
      </g>
      <text
        x="948"
        y="606"
        textAnchor="middle"
        fill="rgba(159,216,208,0.45)"
        fontFamily="IBM Plex Mono, monospace"
        fontSize="10"
      >
        N
      </text>
      <g stroke="rgba(159,216,208,0.45)" strokeWidth="1.5">
        <path d="M760,596 H860" />
        <path d="M760,592 V600" />
        <path d="M860,592 V600" />
      </g>
      <text
        x="810"
        y="588"
        textAnchor="middle"
        fill="rgba(159,216,208,0.45)"
        fontFamily="IBM Plex Mono, monospace"
        fontSize="10"
      >
        2 MI
      </text>
    </svg>
  );
}
