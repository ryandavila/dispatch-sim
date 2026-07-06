// Original stylized vector portraits for each hero — flat cel-shaded comic
// style in the SDN palette: bold ink outlines, teal portrait-card grounds,
// one step of shade per surface, light from the upper-left. No copyrighted
// game art; these are our own interpretations drawn from scratch.

import type { ReactNode } from 'react';

export interface HeroPortraitProps {
  heroId: string;
  /** Rendered square size in px. Defaults to 96. */
  size?: number;
}

/** Per-hero signature colors, usable anywhere a hero accent is needed. */
export const HERO_COLORS: Record<string, { bg: string; skin: string; accent: string }> = {
  sonar: { bg: '#2f8d85', skin: '#c99089', accent: '#26314e' },
  flambae: { bg: '#2e857e', skin: '#c98e63', accent: '#e2622d' },
  'punch-up': { bg: '#35907f', skin: '#d9a06b', accent: '#5d6e54' },
  prism: { bg: '#2e8a8f', skin: '#8a5a3b', accent: '#4fc3d9' },
  invisigal: { bg: '#328c8c', skin: '#c9976b', accent: '#cf5a8e' },
  coupe: { bg: '#2b807a', skin: '#a9765a', accent: '#8f9aa4' },
  malevola: { bg: '#2a7f7c', skin: '#b03a30', accent: '#4a2440' },
  golem: { bg: '#339088', skin: '#c98a95', accent: '#a06874' },
  phenomaman: { bg: '#34917f', skin: '#d9a06b', accent: '#dd9a2b' },
  waterboy: { bg: '#2f8b92', skin: '#6fc4e0', accent: '#58b7d8' },
};

const FALLBACK = { bg: '#2f8d85', skin: '#c9976b', accent: '#dd9a2b' };

const INK = '#17181a';

/** Soft light pooling behind the head, shared by every card. */
function Halo({ id }: { id: string }) {
  return (
    <>
      <defs>
        <radialGradient id={id} cx="0.5" cy="0.42" r="0.55">
          <stop offset="0" stopColor="#ece4d1" stopOpacity="0.14" />
          <stop offset="1" stopColor="#ece4d1" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="96" height="96" fill={`url(#${id})`} />
    </>
  );
}

const HERO_ART: Record<string, ReactNode> = {
  // Mutated pig-bat businessman: huge bat ears, flat snout, navy suit + tie.
  sonar: (
    <>
      <rect width="96" height="96" fill="#2f8d85" />
      <Halo id="hp-so-halo" />
      <path d="M40 56 H56 V78 H40 Z" fill="#c99089" stroke={INK} strokeWidth="2.5" />
      <path d="M40 64 Q48 70 56 64 V70 Q48 75 40 70 Z" fill="#b07f7c" />
      <path
        d="M5 96 Q9 78 26 73 L39 68 L48 80 L57 68 L70 73 Q87 78 91 96 Z"
        fill="#26314e"
        stroke={INK}
        strokeWidth="3"
      />
      <path d="M60 69.5 L70 73 Q87 78 91 96 H66 Z" fill="#1b2338" />
      <path d="M39.5 68.5 L48 79 L43.5 83 L37 72 Z" fill="#ece4d1" stroke={INK} strokeWidth="2" />
      <path d="M56.5 68.5 L48 79 L52.5 83 L59 72 Z" fill="#ece4d1" stroke={INK} strokeWidth="2" />
      <path d="M48 79 L52 84 L50 96 H46 L44 84 Z" fill="#141824" stroke={INK} strokeWidth="2" />
      <g transform="translate(48 46) scale(1.12) translate(-48 -46)">
        <path d="M33 32 Q16 25 19 6 Q31 10 39 26 Z" fill="#c99089" stroke={INK} strokeWidth="3" />
        <path d="M31 27 Q23 21 24 11 Q30 15 34 24 Z" fill="#8f5560" />
        <path d="M63 32 Q80 25 77 6 Q65 10 57 26 Z" fill="#c99089" stroke={INK} strokeWidth="3" />
        <path d="M65 27 Q73 21 72 11 Q66 15 62 24 Z" fill="#8f5560" />
        <path
          d="M30 42 Q29 22 48 21 Q67 22 66 42 L65 50 Q62 62 48 65 Q34 62 31 50 Z"
          fill="#c99089"
          stroke={INK}
          strokeWidth="3"
        />
        <path
          d="M56 22 Q66 27 66 42 L65 50 Q62 62 48 65 Q58 58 60.5 49 Q63 34 56 22 Z"
          fill="#a86e6c"
        />
        <path d="M33 36 Q38 33.5 42 35" fill="none" stroke={INK} strokeWidth="1.7" />
        <path d="M54 35 Q58 33.5 63 36" fill="none" stroke={INK} strokeWidth="1.7" />
        <circle cx="38" cy="42" r="2.7" fill={INK} />
        <circle cx="58" cy="42" r="2.7" fill={INK} />
        <circle cx="38.9" cy="41.1" r="0.8" fill="#ece4d1" />
        <circle cx="58.9" cy="41.1" r="0.8" fill="#ece4d1" />
        <ellipse cx="48" cy="53" rx="12" ry="7.5" fill="#d9a49b" stroke={INK} strokeWidth="2.5" />
        <path
          d="M53 46.5 Q59.5 49 59.5 53.5 Q59.5 58.5 53.5 60.2 Q57.5 56.5 57.5 53 Q57.5 49.2 53 46.5 Z"
          fill="#b07f7c"
        />
        <ellipse cx="44" cy="53" rx="1.8" ry="3" fill="#6e3f45" />
        <ellipse cx="52" cy="53" rx="1.8" ry="3" fill="#6e3f45" />
      </g>
    </>
  ),

  // Brooding fire-starter: swept-back hair, short beard, ember at the collar.
  flambae: (
    <>
      <defs>
        <radialGradient id="hp-fl-ember" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f2913d" stopOpacity="0.55" />
          <stop offset="1" stopColor="#e2622d" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="96" height="96" fill="#2e857e" />
      <Halo id="hp-fl-halo" />
      <path d="M40 54 H56 V80 H40 Z" fill="#c98e63" stroke={INK} strokeWidth="2.5" />
      <path d="M40 62 Q48 69 56 62 V70 Q48 76 40 70 Z" fill="#a86e48" />
      <path
        d="M5 96 Q9 78 26 73 L40 67 L48 78 L56 67 L70 73 Q87 78 91 96 Z"
        fill="#33302e"
        stroke={INK}
        strokeWidth="3"
      />
      <path d="M60 69 L70 73 Q87 78 91 96 H66 Z" fill="#242220" />
      <ellipse cx="48" cy="79" rx="22" ry="11" fill="url(#hp-fl-ember)" />
      <path d="M40 67 L48 78 L56 67" fill="none" stroke="#e2622d" strokeWidth="2" opacity="0.9" />
      <g transform="translate(48 46) scale(1.18) translate(-48 -46)">
        <ellipse cx="31" cy="46" rx="3.5" ry="5.5" fill="#c98e63" stroke={INK} strokeWidth="2.5" />
        <ellipse cx="65" cy="46" rx="3.5" ry="5.5" fill="#c98e63" stroke={INK} strokeWidth="2.5" />
        <path
          d="M32 38 Q32 19 48 19 Q64 19 64 38 L63 47 Q61 58 48 64 Q35 58 33 47 Z"
          fill="#c98e63"
          stroke={INK}
          strokeWidth="3"
        />
        <path
          d="M55 20 Q64 25 64 38 L63 47 Q61 58 48 64 Q57 56 58.5 46 Q60.5 31 55 20 Z"
          fill="#a86e48"
        />
        <path d="M48 44 L46.8 51.5 Q48.4 53.2 51 52.4" fill="none" stroke={INK} strokeWidth="1.7" />
        <path
          d="M34 44.5 Q36.5 58.5 48 64.5 Q59.5 58.5 62 44.5 L59.8 46 Q58 55 51.5 58.7 Q48 60 44.5 58.7 Q38 55 36.2 46 Z"
          fill="#2a2320"
          stroke={INK}
          strokeWidth="2"
        />
        <path
          d="M43.2 52.6 Q48 50.9 52.8 52.6 Q51.8 54.9 48 54.4 Q44.2 54.9 43.2 52.6 Z"
          fill="#2a2320"
          stroke={INK}
          strokeWidth="1.4"
        />
        <path d="M44.8 57 Q48 58.2 51.2 57" fill="none" stroke={INK} strokeWidth="1.6" />
        <path
          d="M31 42 Q29 13 48 12 Q67 13 65 42 Q64 30 60 25 Q54 20 48 20 Q40 20 35 26 Q31 32 31 42 Z"
          fill="#2a2320"
          stroke={INK}
          strokeWidth="2.5"
        />
        <path d="M37 18 Q44 14.5 52 15.5 Q45 17.5 40 21.5 Z" fill="#4a3c33" />
        <path d="M55 16 Q60 18.5 62 24" fill="none" stroke={INK} strokeWidth="1.4" />
        <path d="M50 14.5 Q56 16 59 20" fill="none" stroke={INK} strokeWidth="1.4" />
        <path d="M32.5 40 L35.5 40 L36 47 L33.5 45.5 Z" fill="#2a2320" />
        <path d="M63.5 40 L60.5 40 L60 47 L62.5 45.5 Z" fill="#2a2320" />
        <path d="M35.5 38.5 Q40.5 36.5 45 39 L45 41.8 Q40.5 39.5 35.5 41 Z" fill={INK} />
        <path d="M60.5 38.5 Q55.5 36.5 51 39 L51 41.8 Q55.5 39.5 60.5 41 Z" fill={INK} />
        <path d="M36.5 43.5 Q40.5 41.8 44.5 43.5 Q40.5 45.8 36.5 43.5 Z" fill="#ece4d1" />
        <circle cx="40.7" cy="43.8" r="1.8" fill="#3d2a1c" />
        <path d="M36 43.2 Q40.5 41.2 45 43.2" fill="none" stroke={INK} strokeWidth="1.8" />
        <path d="M59.5 43.5 Q55.5 41.8 51.5 43.5 Q55.5 45.8 59.5 43.5 Z" fill="#ece4d1" />
        <circle cx="55.3" cy="43.8" r="1.8" fill="#3d2a1c" />
        <path d="M60 43.2 Q55.5 41.2 51 43.2" fill="none" stroke={INK} strokeWidth="1.8" />
      </g>
    </>
  ),

  // Deadpan chain-smoker: purple bob, half-lidded eyes, dissolving edge.
  invisigal: (
    <>
      <defs>
        <linearGradient id="hp-iv-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#cf5a8e" />
          <stop offset="0.5" stopColor="#cf5a8e" stopOpacity="0.55" />
          <stop offset="1" stopColor="#cf5a8e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="96" height="96" fill="#328c8c" />
      <Halo id="hp-iv-halo" />
      <path d="M41 54 H55 V78 H41 Z" fill="#c9976b" stroke={INK} strokeWidth="2.5" />
      <path
        d="M30 96 Q30 78 40 72 L48 80 L56 72 Q66 78 66 96 Z"
        fill="#26262a"
        stroke={INK}
        strokeWidth="2.5"
      />
      <path
        d="M5 96 Q9 78 26 73 L40 68 Q37 76 36 96 Z"
        fill="#cf5a8e"
        stroke={INK}
        strokeWidth="3"
      />
      <path d="M26 73 L40 68 Q38 73 37.5 78 L28 78 Z" fill="#a8406e" />
      <path d="M56 68 L70 73 Q87 78 91 96 H60 Q58 76 56 68 Z" fill="url(#hp-iv-fade)" />
      <path d="M56 68 L70 73" stroke={INK} strokeWidth="2.5" fill="none" opacity="0.55" />
      <rect
        x="78"
        y="70"
        width="4"
        height="4"
        fill="#cf5a8e"
        opacity="0.5"
        transform="rotate(12 80 72)"
      />
      <rect x="86" y="60" width="3" height="3" fill="#cf5a8e" opacity="0.3" />
      <rect
        x="74"
        y="50"
        width="3"
        height="3"
        fill="#7b4f9e"
        opacity="0.35"
        transform="rotate(20 75.5 51.5)"
      />
      <rect x="81" y="40" width="2.5" height="2.5" fill="#7b4f9e" opacity="0.28" />
      <rect
        x="70"
        y="30"
        width="2.5"
        height="2.5"
        fill="#7b4f9e"
        opacity="0.22"
        transform="rotate(30 71 31)"
      />
      <g transform="translate(48 46) scale(1.18) translate(-48 -46)">
        <path
          d="M33 40 Q33 21 48 21 Q63 21 63 40 L62 48 Q60 58 48 63 Q36 58 34 48 Z"
          fill="#c9976b"
          stroke={INK}
          strokeWidth="3"
        />
        <path
          d="M55 22 Q63 27 63 40 L62 48 Q60 58 48 63 Q57 56 58.5 47 Q60.5 33 55 22 Z"
          fill="#a8794f"
        />
        <path d="M36.5 44.5 Q40.5 43 44.5 44.5 L44.5 46.2 Q40.5 47.8 36.5 46.2 Z" fill="#ece4d1" />
        <circle cx="40.7" cy="45.6" r="1.8" fill="#4a2f6b" />
        <path d="M36 44.3 Q40.5 42.6 45 44.3" fill="none" stroke={INK} strokeWidth="1.9" />
        <path d="M59.5 44.5 Q55.5 43 51.5 44.5 L51.5 46.2 Q55.5 47.8 59.5 46.2 Z" fill="#ece4d1" />
        <circle cx="55.3" cy="45.6" r="1.8" fill="#4a2f6b" />
        <path d="M60 44.3 Q55.5 42.6 51 44.3" fill="none" stroke={INK} strokeWidth="1.9" />
        <path d="M48 46 L47.2 52 Q48.2 53.5 50 53" fill="none" stroke={INK} strokeWidth="1.5" />
        <path d="M43 57.5 Q47 59 51 57.8" fill="none" stroke={INK} strokeWidth="1.8" />
        <path d="M51 57.8 L63 55.2" stroke={INK} strokeWidth="3.6" fill="none" />
        <path d="M51.3 57.7 L62.6 55.3" stroke="#ece4d1" strokeWidth="2" fill="none" />
        <circle cx="63.2" cy="55.1" r="1.5" fill="#e2622d" />
        <circle cx="63.2" cy="55.1" r="0.7" fill="#f2b843" />
        <path
          d="M64.5 52.5 Q66.5 48.5 64.5 44.5 Q62.5 40.5 65.5 36.5"
          fill="none"
          stroke="#d8e8e4"
          strokeWidth="1.4"
          opacity="0.55"
        />
        <path
          d="M29 55 Q25 16 48 15 Q71 16 67 55 L63 58 L62.5 40 Q62 34.5 57 34 L53.5 36 L49.5 34 L45.5 36 L41.5 34 Q34.5 34.5 33.5 40 L33 58 Z"
          fill="#7b4f9e"
          stroke={INK}
          strokeWidth="3"
        />
        <path
          d="M58 17.5 Q70 23 67 55 L63 58 L62.6 42 Q64.5 32 62 24.5 Q60.5 20 58 17.5 Z"
          fill="#5d3a7c"
        />
        <path d="M33.5 27 Q36 19.5 43 17.2 Q37.5 22 36.3 28.5 Z" fill="#9a6fbc" />
      </g>
    </>
  ),

  // Masked mercenary: chrome half-mask, blade-wings rising behind.
  coupe: (
    <>
      <rect width="96" height="96" fill="#2b807a" />
      <Halo id="hp-cp-halo" />
      <path d="M26 74 L6 24 L16 27 L34 70 Z" fill="#3a4048" stroke={INK} strokeWidth="2.5" />
      <path d="M10 26 L15 27.5 L32 70 L28 71 Z" fill="#aeb6bf" />
      <path d="M70 74 L90 24 L80 27 L62 70 Z" fill="#3a4048" stroke={INK} strokeWidth="2.5" />
      <path d="M86 26 L81 27.5 L64 70 L68 71 Z" fill="#aeb6bf" />
      <path d="M41 54 H55 V78 H41 Z" fill="#a9765a" stroke={INK} strokeWidth="2.5" />
      <path d="M41 62 Q48 68 55 62 V68 Q48 74 41 68 Z" fill="#8a6047" />
      <path
        d="M6 96 Q10 78 27 73 L41 68 L48 76 L55 68 L69 73 Q86 78 90 96 Z"
        fill="#59616c"
        stroke={INK}
        strokeWidth="3"
      />
      <path d="M60 69.5 L69 73 Q86 78 90 96 H65 Z" fill="#444b55" />
      <path d="M34 72 Q38 84 37 96" fill="none" stroke={INK} strokeWidth="1.5" opacity="0.6" />
      <path d="M62 72 Q58 84 59 96" fill="none" stroke={INK} strokeWidth="1.5" opacity="0.6" />
      <path d="M41 68 L48 76 L55 68" fill="none" stroke={INK} strokeWidth="2" />
      <g transform="translate(48 46) scale(1.18) translate(-48 -46)">
        <path
          d="M33 40 Q33 22 48 22 Q63 22 63 40 L62 48 Q60 58 48 63 Q36 58 34 48 Z"
          fill="#a9765a"
          stroke={INK}
          strokeWidth="3"
        />
        <path
          d="M55 23 Q63 28 63 40 L62 48 Q60.5 56 55 60.5 Q59 52 59.5 45 Q60.5 33 55 23 Z"
          fill="#855a42"
        />
        <path
          d="M32.5 38 Q31.5 18 48 18 Q64.5 18 63.5 38 Q62.5 26 55 23 Q48 21 41 23 Q33.5 26 32.5 38 Z"
          fill="#241d1a"
          stroke={INK}
          strokeWidth="2.5"
        />
        <path
          d="M33 36 Q40 33 48 33 Q56 33 63 36 L62.3 45 Q57 43.8 53 45.2 L48 50.5 L43 45.2 Q39 43.8 33.7 45 Z"
          fill="#c7ccd2"
          stroke={INK}
          strokeWidth="2.5"
        />
        <path
          d="M56 33.8 Q60.5 34.8 63 36 L62.3 45 Q58.5 44.2 55 45 Q58 39.5 56 33.8 Z"
          fill="#8f9aa4"
        />
        <path d="M47 34 L49 34 L48.6 47.5 L47.4 47.5 Z" fill="#8f9aa4" />
        <path
          d="M35 35.5 Q39.5 34 44 33.8 L42 36.5 Q38.5 36.7 35.4 37.8 Z"
          fill="#eef1f4"
          opacity="0.85"
        />
        <path d="M36.5 41 L44 39.8 L44.2 41.7 L36.7 42.9 Z" fill={INK} />
        <path d="M59.5 41 L52 39.8 L51.8 41.7 L59.3 42.9 Z" fill={INK} />
        <path d="M46.8 54 Q48.2 55 49.8 54" fill="none" stroke="#855a42" strokeWidth="1.4" />
        <path d="M43.5 57 Q48 58.6 52.5 57" fill="none" stroke={INK} strokeWidth="1.8" />
      </g>
    </>
  ),

  // Old-guard brawler: handlebar mustache, gray temples, olive dress jacket.
  'punch-up': (
    <>
      <rect width="96" height="96" fill="#35907f" />
      <Halo id="hp-pu-halo" />
      <path d="M37 54 H59 V78 H37 Z" fill="#d9a06b" stroke={INK} strokeWidth="2.5" />
      <path d="M37 56 Q48 66 59 56 V66 Q48 74 37 66 Z" fill="#b57e4c" />
      <path
        d="M4 96 Q8 76 25 71 L37 66 L48 74 L59 66 L71 71 Q88 76 92 96 Z"
        fill="#5d6e54"
        stroke={INK}
        strokeWidth="3"
      />
      <path d="M62 67.5 L71 71 Q88 76 92 96 H67 Z" fill="#46543f" />
      <path d="M37 66 L48 74 L44 78 L33.5 69.5 Z" fill="#b03a30" stroke={INK} strokeWidth="2" />
      <path d="M59 66 L48 74 L52 78 L62.5 69.5 Z" fill="#b03a30" stroke={INK} strokeWidth="2" />
      <circle cx="48" cy="84" r="2.2" fill="#dd9a2b" stroke={INK} strokeWidth="1.5" />
      <g transform="translate(48 46) scale(1.18) translate(-48 -46)">
        <ellipse cx="30" cy="46" rx="3.6" ry="5.5" fill="#d9a06b" stroke={INK} strokeWidth="2.5" />
        <ellipse cx="66" cy="46" rx="3.6" ry="5.5" fill="#d9a06b" stroke={INK} strokeWidth="2.5" />
        <path
          d="M31 38 Q31 19 48 19 Q65 19 65 38 L64.5 48 Q63 59 48 64 Q33 59 31.5 48 Z"
          fill="#d9a06b"
          stroke={INK}
          strokeWidth="3"
        />
        <path
          d="M56 20 Q65 25 65 38 L64.5 48 Q63 59 48 64 Q58.5 57 60.5 47 Q62.5 32 56 20 Z"
          fill="#b57e4c"
        />
        <path
          d="M30.5 36 Q30 14.5 48 14 Q66 14.5 65.5 36 Q64 24 57 21.5 Q48 19 39 21.5 Q32 24 30.5 36 Z"
          fill="#2b2622"
          stroke={INK}
          strokeWidth="2.5"
        />
        <path d="M31 33.5 Q32 26.5 36.5 23.5 L38.5 26.5 Q34.5 29.5 33.2 35.5 Z" fill="#9a948c" />
        <path d="M65 33.5 Q64 26.5 59.5 23.5 L57.5 26.5 Q61.5 29.5 62.8 35.5 Z" fill="#9a948c" />
        <path d="M40 17.5 Q48 15.5 56 17.5" fill="none" stroke={INK} strokeWidth="1.3" />
        <path d="M35 38 L45 37.2 L45 40.4 L35 41.4 Z" fill={INK} />
        <path d="M61 38 L51 37.2 L51 40.4 L61 41.4 Z" fill={INK} />
        <path d="M36.5 43.5 Q40.5 42.3 44.5 43.5 Q40.5 45.8 36.5 43.5 Z" fill="#ece4d1" />
        <circle cx="40.5" cy="44" r="1.6" fill="#3d2a1c" />
        <path d="M36 43.2 Q40.5 42 45 43.2" fill="none" stroke={INK} strokeWidth="1.8" />
        <path d="M59.5 43.5 Q55.5 42.3 51.5 43.5 Q55.5 45.8 59.5 43.5 Z" fill="#ece4d1" />
        <circle cx="55.5" cy="44" r="1.6" fill="#3d2a1c" />
        <path d="M60 43.2 Q55.5 42 51 43.2" fill="none" stroke={INK} strokeWidth="1.8" />
        <path d="M48 43 L46 52 Q48.5 55 52 53.5" fill="none" stroke={INK} strokeWidth="1.8" />
        <path
          d="M37.5 54 Q42 50.5 48 52.5 Q54 50.5 58.5 54 Q62 57 64 54.5 Q65 58.5 61 59.5 Q56.5 60.3 53 57.5 Q50 55.5 48 55.5 Q46 55.5 43 57.5 Q39.5 60.3 35 59.5 Q31 58.5 32 54.5 Q34 57 37.5 54 Z"
          fill="#2b2622"
          stroke={INK}
          strokeWidth="1.8"
        />
        <path d="M44.5 61.5 Q48 62.6 51.5 61.5" fill="none" stroke={INK} strokeWidth="1.6" />
      </g>
    </>
  ),

  // Demon sorceress: horns, glowing pupil-less eyes, plum high collar.
  malevola: (
    <>
      <rect width="96" height="96" fill="#2a7f7c" />
      <Halo id="hp-mv-halo" />
      <g transform="translate(48 46) scale(1.1) translate(-48 -46)">
        <path
          d="M34 27 Q20 22 16 8 L25 5 Q29 17 42 23 Z"
          fill="#2e2430"
          stroke={INK}
          strokeWidth="2.5"
        />
        <path d="M22 8 Q25 15 31 19.5" fill="none" stroke="#4a3a4c" strokeWidth="1.6" />
        <path
          d="M62 27 Q76 22 80 8 L71 5 Q67 17 54 23 Z"
          fill="#2e2430"
          stroke={INK}
          strokeWidth="2.5"
        />
        <path d="M74 8 Q71 15 65 19.5" fill="none" stroke="#4a3a4c" strokeWidth="1.6" />
        <path
          d="M19 96 Q13 58 22 34 Q30 13 48 13 Q66 13 74 34 Q83 58 77 96 Z"
          fill="#15121a"
          stroke={INK}
          strokeWidth="3"
        />
        <path d="M22 60 Q24 40 32 26 Q26 44 25 62 Q24 78 26 96 H22 Q20 76 22 60 Z" fill="#2c2438" />
        <path d="M74 60 Q72 40 64 26 Q70 44 71 62 Q72 78 70 96 H74 Q76 76 74 60 Z" fill="#2c2438" />
      </g>
      <path d="M41 54 H55 V78 H41 Z" fill="#b03a30" stroke={INK} strokeWidth="2.5" />
      <path d="M41 62 Q48 68 55 62 V68 Q48 74 41 68 Z" fill="#96302a" />
      <path
        d="M6 96 Q10 78 27 73 L41 68 L48 78 L55 68 L69 73 Q86 78 90 96 Z"
        fill="#4a2440"
        stroke={INK}
        strokeWidth="3"
      />
      <path d="M60 69.5 L69 73 Q86 78 90 96 H65 Z" fill="#35182e" />
      <path d="M41 68 L48 78 L55 68" fill="none" stroke="#dd9a2b" strokeWidth="1.6" />
      <path d="M41 70 L30 53 L38 53.5 L46 67 Z" fill="#5c2c50" stroke={INK} strokeWidth="2" />
      <path d="M55 70 L66 53 L58 53.5 L50 67 Z" fill="#5c2c50" stroke={INK} strokeWidth="2" />
      <g transform="translate(48 46) scale(1.1) translate(-48 -46)">
        <path
          d="M33 40 Q33 21 48 21 Q63 21 63 40 L62 48 Q60 58 48 63 Q36 58 34 48 Z"
          fill="#b03a30"
          stroke={INK}
          strokeWidth="3"
        />
        <path
          d="M55 22 Q63 27 63 40 L62 48 Q60 58 48 63 Q57 56 58.5 47 Q60.5 33 55 22 Z"
          fill="#8a2a24"
        />
        <path
          d="M32.5 40 Q32 20 48 19.5 Q64 20 63.5 40 L62 29 Q54 26.5 48 33 Q42 26.5 34 29 Z"
          fill="#15121a"
          stroke={INK}
          strokeWidth="2"
        />
        <ellipse cx="40" cy="43" rx="6" ry="3.6" fill="#f2c832" opacity="0.3" />
        <ellipse cx="56" cy="43" rx="6" ry="3.6" fill="#f2c832" opacity="0.3" />
        <path
          d="M34.5 44.5 Q39.5 39.5 45.5 42.3 Q40.5 46.5 34.5 44.5 Z"
          fill="#f2c832"
          stroke={INK}
          strokeWidth="1.5"
        />
        <path
          d="M61.5 44.5 Q56.5 39.5 50.5 42.3 Q55.5 46.5 61.5 44.5 Z"
          fill="#f2c832"
          stroke={INK}
          strokeWidth="1.5"
        />
        <path d="M34.5 40.5 Q40 37.2 45.5 39.6" fill="none" stroke={INK} strokeWidth="1.9" />
        <path d="M61.5 40.5 Q56 37.2 50.5 39.6" fill="none" stroke={INK} strokeWidth="1.9" />
        <path d="M48 44 L47.4 51 Q48.2 52.5 50 52" fill="none" stroke={INK} strokeWidth="1.5" />
        <path
          d="M43.5 56.8 Q48 58.4 52.5 56.5 Q50.8 58.9 47.8 58.9 Q45.2 58.7 43.5 56.8 Z"
          fill="#4a1f2e"
          stroke={INK}
          strokeWidth="1.3"
        />
      </g>
    </>
  ),

  // Rose-pink rock hulk: boulder shoulders, heavy brow, cracked stone.
  golem: (
    <>
      <rect width="96" height="96" fill="#339088" />
      <Halo id="hp-go-halo" />
      <path
        d="M-2 96 V72 L2 56 L14 49 L28 47 L37 53 L40 62 L40 96 Z"
        fill="#c98a95"
        stroke={INK}
        strokeWidth="3"
      />
      <path
        d="M98 96 V72 L94 56 L82 49 L68 47 L59 53 L56 62 L56 96 Z"
        fill="#c98a95"
        stroke={INK}
        strokeWidth="3"
      />
      <path d="M82 49 L94 56 L98 72 V96 H82 Q86 74 80 54 Z" fill="#a06874" />
      <path d="M4 57 L14 51 L12 60 Z" fill="#d9a2ac" />
      <path d="M30 96 L30 62 Q48 54 66 62 L66 96 Z" fill="#b87c88" stroke={INK} strokeWidth="3" />
      <path
        d="M30 60 L28 40 L32 26 L43 19 L55 19 L64 26 L68 41 L65 60 Q60 68.5 48 69 Q36 68.5 30 60 Z"
        fill="#c98a95"
        stroke={INK}
        strokeWidth="3"
      />
      <path
        d="M55 19 L64 26 L68 41 L65 60 Q60 68.5 48 69 Q59 63 61.5 52 L63 38 L58 25 Z"
        fill="#a06874"
      />
      <path d="M33 26 L43 20 L41 30 Z" fill="#d9a2ac" />
      <path d="M34 46.5 Q48 40 62 46.5 L60.5 52.5 Q48 47 35.5 52.5 Z" fill="#7c4b57" />
      <path
        d="M32.5 45.5 Q48 38.5 63.5 45.5"
        fill="none"
        stroke={INK}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path d="M42 40 L41 35.5" fill="none" stroke={INK} strokeWidth="1.5" opacity="0.6" />
      <path d="M54 40 L55 35.5" fill="none" stroke={INK} strokeWidth="1.5" opacity="0.6" />
      <circle cx="39.5" cy="48.2" r="1.9" fill={INK} />
      <circle cx="56.5" cy="48.2" r="1.9" fill={INK} />
      <circle cx="40.1" cy="47.6" r="0.6" fill="#ece4d1" />
      <circle cx="57.1" cy="47.6" r="0.6" fill="#ece4d1" />
      <path d="M42 66 Q48 67 54 66" fill="none" stroke={INK} strokeWidth="1.3" opacity="0.5" />
      <path
        d="M45.5 50.5 L50.5 50.5 L52 57 L44 57 Z"
        fill="#a06874"
        stroke={INK}
        strokeWidth="1.6"
      />
      <path d="M39.5 61.5 Q48 63 56.5 61.5" fill="none" stroke={INK} strokeWidth="2.3" />
      <path d="M35 54 l-2.5 4 l1.8 3" fill="none" stroke={INK} strokeWidth="1.4" opacity="0.7" />
      <path d="M75 62 l4 5 l-2 4" fill="none" stroke={INK} strokeWidth="1.4" opacity="0.7" />
      <path d="M52 23 l3 4" fill="none" stroke={INK} strokeWidth="1.4" opacity="0.7" />
      <path d="M14 62 l-4 5" fill="none" stroke={INK} strokeWidth="1.4" opacity="0.7" />
      <path d="M60 64 l2 4 l-2 3" fill="none" stroke={INK} strokeWidth="1.3" opacity="0.6" />
      <path d="M63 30 l3.5 3" fill="none" stroke={INK} strokeWidth="1.3" opacity="0.6" />
    </>
  ),

  // Cool tech scout: cyan bob with pink underlights, oversized mirror visor.
  prism: (
    <>
      <defs>
        <linearGradient id="hp-pr-visor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7fe0ee" />
          <stop offset="1" stopColor="#2b8fa8" />
        </linearGradient>
      </defs>
      <rect width="96" height="96" fill="#2e8a8f" />
      <Halo id="hp-pr-halo" />
      <path d="M41 54 H55 V78 H41 Z" fill="#8a5a3b" stroke={INK} strokeWidth="2.5" />
      <path d="M41 62 Q48 68 55 62 V68 Q48 74 41 68 Z" fill="#734a2d" />
      <path d="M40 70 L48 80 L56 70 L55 66 H41 Z" fill="#8a5a3b" />
      <path
        d="M7 96 Q11 78 28 73 L41 68 L48 78 L55 68 L68 73 Q85 78 89 96 Z"
        fill="#2a2d33"
        stroke={INK}
        strokeWidth="3"
      />
      <path d="M59 69.5 L68 73 Q85 78 89 96 H64 Z" fill="#1e2126" />
      <path d="M41 68 L48 78 L55 68" fill="none" stroke={INK} strokeWidth="2" />
      <circle cx="42" cy="71" r="1.6" fill="#dd9a2b" stroke={INK} strokeWidth="1" />
      <circle cx="44.8" cy="73.8" r="1.6" fill="#dd9a2b" stroke={INK} strokeWidth="1" />
      <circle cx="48" cy="75" r="1.6" fill="#dd9a2b" stroke={INK} strokeWidth="1" />
      <circle cx="51.2" cy="73.8" r="1.6" fill="#dd9a2b" stroke={INK} strokeWidth="1" />
      <circle cx="54" cy="71" r="1.6" fill="#dd9a2b" stroke={INK} strokeWidth="1" />
      <g transform="translate(48 46) scale(1.18) translate(-48 -46)">
        <path
          d="M34 40 Q34 22 48 22 Q62 22 62 40 L61 48 Q59 57.5 48 62.5 Q37 57.5 35 48 Z"
          fill="#8a5a3b"
          stroke={INK}
          strokeWidth="3"
        />
        <path
          d="M54 23 Q62 28 62 40 L61 48 Q59 57.5 48 62.5 Q56.5 56 58 47 Q60 34 54 23 Z"
          fill="#6d4429"
        />
        <path d="M47.6 52 Q48.6 53.5 50 53.2" fill="none" stroke={INK} strokeWidth="1.5" />
        <path d="M44 56.5 Q48 58.2 52 56.5" fill="none" stroke={INK} strokeWidth="1.8" />
        <path d="M45.5 59.3 Q48 60 50.5 59.3" fill="none" stroke="#6d4429" strokeWidth="1.3" />
        <path
          d="M29 54 Q25 15 48 14 Q71 15 67 54 L62 57 L62 40 Q62.5 33 56 32.5 L39 34.8 Q34 35.8 34 42 L34 57 Z"
          fill="#45b5cf"
          stroke={INK}
          strokeWidth="3"
        />
        <path
          d="M58 16.5 Q70 22 67 54 L62 57 L62 42 Q64 30 61.5 23.5 Q60 19 58 16.5 Z"
          fill="#3195ad"
        />
        <path d="M33 25 Q35.5 18.5 42.5 16.2 Q37 21 36 27.5 Z" fill="#9fe6f0" />
        <path
          d="M34 44 L34 57 L29.4 54.2 Q28.2 49 30 43 Q32 45 34 44 Z"
          fill="#e668a8"
          stroke={INK}
          strokeWidth="2"
        />
        <path
          d="M62 44 L62 57 L66.6 54.2 Q67.8 49 66 43 Q64 45 62 44 Z"
          fill="#e668a8"
          stroke={INK}
          strokeWidth="2"
        />
        <path
          d="M28.5 37.5 Q48 33 67.5 37.5 L66 48.5 Q48 52 30 48.5 Z"
          fill="url(#hp-pr-visor)"
          stroke={INK}
          strokeWidth="2.5"
        />
        <path d="M33 39.5 L42.5 38 L36 47 L31.5 46.2 Z" fill="#d8f6fa" opacity="0.75" />
        <path d="M49 38.5 L54 38.2 L50 44.5 Z" fill="#d8f6fa" opacity="0.45" />
        <path
          d="M30 47.8 Q48 51 66 47.8"
          fill="none"
          stroke="#9fe6f0"
          strokeWidth="1.2"
          opacity="0.7"
        />
      </g>
    </>
  ),

  // Golden-age parody: coiffed hair with spit curl, mile-wide grin, cape.
  phenomaman: (
    <>
      <rect width="96" height="96" fill="#34917f" />
      <Halo id="hp-ph-halo" />
      <path d="M22 96 L12 56 L34 72 Z" fill="#7e2418" stroke={INK} strokeWidth="2.5" />
      <path d="M74 96 L84 56 L62 72 Z" fill="#7e2418" stroke={INK} strokeWidth="2.5" />
      <path d="M41 54 H55 V78 H41 Z" fill="#d9a06b" stroke={INK} strokeWidth="2.5" />
      <path d="M41 63 Q48 69 55 63 V69 Q48 75 41 69 Z" fill="#b57e4c" />
      <path
        d="M5 96 Q9 77 26 72 L39 66 L48 74 L57 66 L70 72 Q87 77 91 96 Z"
        fill="#dd9a2b"
        stroke={INK}
        strokeWidth="3"
      />
      <path d="M61 67.5 L70 72 Q87 77 91 96 H66 Z" fill="#b5761a" />
      <path
        d="M39.5 67 L33 62.5 L41 63.5 L45.5 69.5 Z"
        fill="#b5761a"
        stroke={INK}
        strokeWidth="2"
      />
      <path
        d="M56.5 67 L63 62.5 L55 63.5 L50.5 69.5 Z"
        fill="#b5761a"
        stroke={INK}
        strokeWidth="2"
      />
      <path d="M48 81 L53 87 L48 93 L43 87 Z" fill="#7e2418" stroke={INK} strokeWidth="2" />
      <g transform="translate(48 46) scale(1.18) translate(-48 -46)">
        <ellipse cx="31" cy="44" rx="3.4" ry="5.2" fill="#d9a06b" stroke={INK} strokeWidth="2.5" />
        <ellipse cx="65" cy="44" rx="3.4" ry="5.2" fill="#d9a06b" stroke={INK} strokeWidth="2.5" />
        <path
          d="M32 36 Q32 18 48 18 Q64 18 64 36 L64 44 Q64 57 54 61.5 L42 61.5 Q32 57 32 44 Z"
          fill="#d9a06b"
          stroke={INK}
          strokeWidth="3"
        />
        <path
          d="M56 19 Q64 24 64 36 L64 44 Q64 57 54 61.5 Q60 54 60.5 45 Q61.5 30 56 19 Z"
          fill="#b57e4c"
        />
        <path
          d="M31 34 Q28 9 48 8.5 Q68 9 65 34 Q65 20 57 17 Q49 14.5 40 17.5 Q31 21 31 34 Z"
          fill="#1e2b46"
          stroke={INK}
          strokeWidth="2.5"
        />
        <path d="M36 13.5 Q43 10 51 11 Q44 13 39.5 17 Z" fill="#35496e" />
        <path
          d="M47.5 16.5 Q45.8 20.5 48.3 22.6 Q50.6 20.9 49.2 18.4 Q48.7 17.3 47.5 16.5 Z"
          fill="#1e2b46"
          stroke={INK}
          strokeWidth="1.4"
        />
        <path d="M36.5 35 Q41 33.4 45 35.2 L45 37.5 Q41 36 36.5 37.2 Z" fill={INK} />
        <path d="M59.5 34 Q55 32.6 51 34.6 L51 36.9 Q55 35.4 59.5 36.2 Z" fill={INK} />
        <path d="M36.5 40.5 Q40.5 38.5 44.5 40.5 Q40.5 43.2 36.5 40.5 Z" fill="#ece4d1" />
        <circle cx="40.7" cy="40.7" r="1.9" fill="#3a6fae" />
        <circle cx="40.7" cy="40.7" r="0.9" fill={INK} />
        <path d="M36 40.2 Q40.5 38 45 40.2" fill="none" stroke={INK} strokeWidth="1.8" />
        <path d="M59.5 40.5 Q55.5 38.5 51.5 40.5 Q55.5 43.2 59.5 40.5 Z" fill="#ece4d1" />
        <circle cx="55.3" cy="40.7" r="1.9" fill="#3a6fae" />
        <circle cx="55.3" cy="40.7" r="0.9" fill={INK} />
        <path d="M60 40.2 Q55.5 38 51 40.2" fill="none" stroke={INK} strokeWidth="1.8" />
        <path d="M48 41 L47 49.5 Q49 51.5 52 50.5" fill="none" stroke={INK} strokeWidth="1.7" />
        <path
          d="M40 52 Q48 55.5 56 52 Q55 58.3 48 59.1 Q41 58.3 40 52 Z"
          fill="#ffffff"
          stroke={INK}
          strokeWidth="2"
        />
        <path d="M41.5 54.6 Q48 56.9 54.5 54.6" fill="none" stroke="#c9bfae" strokeWidth="1.1" />
        <path
          d="M58 48.5 l1.2 2.6 2.6 1.2 -2.6 1.2 -1.2 2.6 -1.2 -2.6 -2.6 -1.2 2.6 -1.2 Z"
          fill="#ffffff"
        />
      </g>
    </>
  ),

  // Nervous liquid hero: cresting-wave hair, glassy skin, worn hoodie.
  waterboy: (
    <>
      <rect width="96" height="96" fill="#2f8b92" />
      <Halo id="hp-wb-halo" />
      <path
        d="M6 96 Q10 78 27 73 L41 68 L48 77 L55 68 L69 73 Q86 78 90 96 Z"
        fill="#667a72"
        stroke={INK}
        strokeWidth="3"
      />
      <path d="M60 69.5 L69 73 Q86 78 90 96 H65 Z" fill="#4f6058" />
      <path
        d="M32 75 Q27 62 36 58 L48 66 L60 58 Q69 62 64 75 Q56 70.5 48 70.5 Q40 70.5 32 75 Z"
        fill="#58695f"
        stroke={INK}
        strokeWidth="2.5"
      />
      <path d="M44 75 L43 85" fill="none" stroke="#ece4d1" strokeWidth="1.8" />
      <path d="M52 75 L51 85" fill="none" stroke="#ece4d1" strokeWidth="1.8" />
      <circle cx="43" cy="86" r="1.1" fill="#ece4d1" />
      <circle cx="51" cy="86" r="1.1" fill="#ece4d1" />
      <g transform="translate(48 46) scale(1.18) translate(-48 -46)">
        <path d="M41 58 H55 V70 H41 Z" fill="#6fc4e0" stroke={INK} strokeWidth="2.5" />
        <path
          d="M33 40 Q33 21 48 21 Q63 21 63 40 L62 48 Q60 58 48 63 Q36 58 34 48 Z"
          fill="#6fc4e0"
          stroke={INK}
          strokeWidth="3"
        />
        <path
          d="M40 59.5 Q48 63.5 56 59.5"
          fill="none"
          stroke="#3f5a52"
          strokeWidth="1.6"
          opacity="0.3"
        />
        <path
          d="M55 22 Q63 27 63 40 L62 48 Q60 58 48 63 Q57 56 58.5 47 Q60.5 33 55 22 Z"
          fill="#4fa8c9"
        />
        <path d="M36 44 Q35 36 39 30 Q36.5 38 38.5 44 Z" fill="#b8e6f4" opacity="0.8" />
        <circle
          cx="37"
          cy="52"
          r="1.4"
          fill="none"
          stroke="#d9f2fa"
          strokeWidth="1.1"
          opacity="0.8"
        />
        <circle
          cx="58"
          cy="55"
          r="1.1"
          fill="none"
          stroke="#d9f2fa"
          strokeWidth="1"
          opacity="0.7"
        />
        <path
          d="M31 40 Q28 14 48 12 Q64 10 71 19 Q77 28 65 27 Q70 34 58 32 Q61 38 50 35 Q40 33 34 36 Q31 38 31 40 Z"
          fill="#58b7d8"
          stroke={INK}
          strokeWidth="3"
        />
        <path
          d="M40 15.5 Q52 11.5 62 16 Q68 19 68.5 24"
          fill="none"
          stroke="#d9f2fa"
          strokeWidth="1.6"
          opacity="0.85"
        />
        <path
          d="M60 29.5 Q64 30 66.5 27.5"
          fill="none"
          stroke="#d9f2fa"
          strokeWidth="1.4"
          opacity="0.7"
        />
        <path d="M36.5 41.5 Q40.5 39 44.5 38.7" fill="none" stroke={INK} strokeWidth="2" />
        <path d="M59.5 41.5 Q55.5 39 51.5 38.7" fill="none" stroke={INK} strokeWidth="2" />
        <circle cx="40" cy="45" r="3.4" fill="#ffffff" stroke={INK} strokeWidth="1.8" />
        <circle cx="56" cy="45" r="3.4" fill="#ffffff" stroke={INK} strokeWidth="1.8" />
        <circle cx="41" cy="45.5" r="1.5" fill={INK} />
        <circle cx="55" cy="45.5" r="1.5" fill={INK} />
        <circle cx="41.5" cy="44.8" r="0.5" fill="#ffffff" />
        <circle cx="55.5" cy="44.8" r="0.5" fill="#ffffff" />
        <path
          d="M43.5 57 Q45.7 55.5 48 57 Q50.3 58.5 52.5 57"
          fill="none"
          stroke={INK}
          strokeWidth="1.8"
        />
        <path
          d="M76 32 Q79.5 36.5 76 39.5 Q72.5 36.5 76 32 Z"
          fill="#6fc4e0"
          fillOpacity="0.85"
          stroke={INK}
          strokeWidth="1.5"
        />
        <path
          d="M22 40 Q24.5 43.5 22 45.8 Q19.5 43.5 22 40 Z"
          fill="#6fc4e0"
          fillOpacity="0.7"
          stroke={INK}
          strokeWidth="1.3"
        />
      </g>
    </>
  ),
};

/**
 * Flat-comic hero portrait card. Falls back to a pentagon monogram for
 * unknown hero ids so new roster entries never render blank.
 */
export function HeroPortrait({ heroId, size = 96 }: HeroPortraitProps) {
  const art = HERO_ART[heroId];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      role="img"
      aria-label={`${heroId} portrait`}
    >
      {art ?? <FallbackPortrait heroId={heroId} />}
    </svg>
  );
}

function FallbackPortrait({ heroId }: { heroId: string }) {
  const colors = HERO_COLORS[heroId] ?? FALLBACK;
  const initial = heroId.charAt(0).toUpperCase();
  return (
    <>
      <rect width="96" height="96" fill={colors.bg} />
      <polygon
        points="48,14 80,37 68,74 28,74 16,37"
        fill={colors.accent}
        stroke={INK}
        strokeWidth="3"
      />
      <text
        x="48"
        y="60"
        textAnchor="middle"
        fontFamily="Barlow Condensed, sans-serif"
        fontWeight="800"
        fontSize="34"
        fill="#ece4d1"
      >
        {initial}
      </text>
    </>
  );
}
