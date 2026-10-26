import type { ReactNode } from 'react'

// Penny's wardrobe, drawn over the 3D render in its own pixel space (810 × 1053).
// The render is lit from the upper left, so every item gets the same light: a lighter
// top-left, a darker lower-right, a specular glint, and a soft contact shadow onto the wool.
const VB_W = 810
const VB_H = 1053

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
      <defs>
        <filter id="o-shadow" x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="6" dy="14" stdDeviation="9" floodColor="#4A3420" floodOpacity="0.32" />
        </filter>
        <filter id="o-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        {/* fuzzy edge for pompoms */}
        <filter id="o-fuzz" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="16" />
          <feDropShadow dx="4" dy="8" stdDeviation="6" floodColor="#4A3420" floodOpacity="0.25" />
        </filter>
        <radialGradient id="o-pom" cx="38%" cy="32%" r="70%">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.55" stopColor="#F6EEE2" />
          <stop offset="1" stopColor="#CFC0AA" />
        </radialGradient>
      </defs>
      {children}
    </svg>
  )
}

export function Outfit({ id }: { id: string }) {
  switch (id) {
    case 'scarf': {
      // Hugs the jaw line; the ends darken as they wrap round behind the neck.
      const band = 'M298 448 Q 470 590 692 444 Q 734 488 704 532 Q 480 680 310 546 Q 268 496 298 448 Z'
      return (
        <Svg>
          <defs>
            <linearGradient id="sc-band" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#F77464" />
              <stop offset="0.5" stopColor="#E0473F" />
              <stop offset="1" stopColor="#A82A28" />
            </linearGradient>
            <linearGradient id="sc-wrap" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#6E1414" stopOpacity="0.55" />
              <stop offset="0.16" stopColor="#6E1414" stopOpacity="0" />
              <stop offset="0.8" stopColor="#6E1414" stopOpacity="0" />
              <stop offset="1" stopColor="#6E1414" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="sc-tail" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#F26A5B" />
              <stop offset="0.6" stopColor="#D8403A" />
              <stop offset="1" stopColor="#9E2725" />
            </linearGradient>
            <clipPath id="sc-band-clip">
              <path d={band} />
            </clipPath>
          </defs>
          <g filter="url(#o-shadow)">
            {/* hanging tail, tucked under the wrap */}
            <path d="M366 540 Q 350 640 334 750 L 424 762 Q 432 660 448 566 Z" fill="url(#sc-tail)" />
            <path d="M334 750 L 424 762 L 422 780 L 332 768 Z" fill="#B83230" />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <rect key={i} x={336 + i * 15} y={768 + i * 1.6} width="9" height="34" rx="4.5" fill={i % 2 ? '#C9383A' : '#E5534A'} transform={`rotate(4 ${340 + i * 15} 780)`} />
            ))}
            <path d="M344 690 L 432 702 M 348 662 L 436 674" stroke="#FFF2E0" strokeWidth="13" strokeLinecap="round" opacity="0.92" />
            <path d={band} fill="url(#sc-band)" />
          </g>
          <g clipPath="url(#sc-band-clip)" fill="none" strokeLinecap="round">
            {/* knit rows following the curve */}
            {[0, 1, 2, 3, 4].map((i) => (
              <path key={i} d={`M284 ${468 + i * 18} Q 476 ${606 + i * 18} 716 ${462 + i * 18}`} stroke="#A82A28" strokeOpacity="0.32" strokeWidth="5" strokeDasharray="10 9" />
            ))}
            <path d="M300 458 Q 470 598 690 454" stroke="#FFFFFF" strokeOpacity="0.5" strokeWidth="12" filter="url(#o-soft)" />
            <rect x="260" y="420" width="480" height="300" fill="url(#sc-wrap)" />
          </g>
          {/* fold where the tail tucks under */}
          <path d="M364 546 Q 404 572 450 566" stroke="#8E2020" strokeOpacity="0.5" strokeWidth="9" fill="none" strokeLinecap="round" filter="url(#o-soft)" />
        </Svg>
      )
    }
    case 'flower':
      return (
        <Svg>
          <defs>
            <radialGradient id="fl-petal" cx="50%" cy="85%" r="90%">
              <stop offset="0" stopColor="#E9DCC6" />
              <stop offset="0.45" stopColor="#FFFFFF" />
              <stop offset="1" stopColor="#FFFFFF" />
            </radialGradient>
            <radialGradient id="fl-pink" cx="50%" cy="85%" r="90%">
              <stop offset="0" stopColor="#F59AC2" />
              <stop offset="0.5" stopColor="#FFD3E6" />
              <stop offset="1" stopColor="#FFE6F1" />
            </radialGradient>
            <radialGradient id="fl-eye" cx="38%" cy="32%" r="75%">
              <stop offset="0" stopColor="#FFE680" />
              <stop offset="0.6" stopColor="#FFC531" />
              <stop offset="1" stopColor="#D98A00" />
            </radialGradient>
            <linearGradient id="fl-leaf" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#7BDA8F" />
              <stop offset="1" stopColor="#2E9A55" />
            </linearGradient>
          </defs>
          <g filter="url(#o-shadow)">
            <path d="M262 214 Q 200 196 168 232 Q 222 258 262 228 Z" fill="url(#fl-leaf)" />
            <path d="M262 222 Q 214 222 178 234" stroke="#2A7F45" strokeWidth="3" fill="none" opacity="0.6" />
            <Daisy x={300} y={168} r={1} rotate={-18} petal="url(#fl-petal)" />
            <Daisy x={392} y={110} r={0.62} rotate={22} petal="url(#fl-pink)" />
          </g>
        </Svg>
      )
    case 'beanie':
      return (
        <Svg>
          <defs>
            <linearGradient id="be-body" x1="0" y1="0" x2="1" y2="0.4">
              <stop offset="0" stopColor="#6CC0FF" />
              <stop offset="0.5" stopColor="#3BA7FF" />
              <stop offset="1" stopColor="#1D74C8" />
            </linearGradient>
            <linearGradient id="be-cuff" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3896EA" />
              <stop offset="1" stopColor="#1661AE" />
            </linearGradient>
            <radialGradient id="be-shade" cx="30%" cy="20%" r="85%">
              <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.38" />
              <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0" />
              <stop offset="1" stopColor="#0B3D74" stopOpacity="0.35" />
            </radialGradient>
            <clipPath id="be-dome">
              <path d="M286 150 Q 290 -96 512 -104 Q 734 -96 738 150 Z" />
            </clipPath>
            <clipPath id="be-cuff-clip">
              <rect x="262" y="118" width="500" height="94" rx="46" />
            </clipPath>
          </defs>
          <g transform="rotate(10 512 120)">
            <g filter="url(#o-shadow)">
              <path d="M286 150 Q 290 -96 512 -104 Q 734 -96 738 150 Z" fill="url(#be-body)" />
              <rect x="262" y="118" width="500" height="94" rx="46" fill="url(#be-cuff)" />
            </g>
            {/* knit ribs that follow the dome */}
            <g clipPath="url(#be-dome)" fill="none" stroke="#1C6BBA" strokeOpacity="0.45" strokeWidth="7">
              {Array.from({ length: 11 }, (_, i) => {
                const x = 300 + i * 42
                return <path key={i} d={`M${x} 160 Q ${512 + (x - 512) * 0.55} -40 512 -110`} />
              })}
            </g>
            <g clipPath="url(#be-dome)">
              <rect x="280" y="-110" width="470" height="270" fill="url(#be-shade)" />
            </g>
            <g clipPath="url(#be-cuff-clip)">
              {Array.from({ length: 13 }, (_, i) => (
                <rect key={i} x={272 + i * 38} y="118" width="20" height="94" rx="10" fill="#4FA9F5" opacity="0.55" />
              ))}
              <rect x="262" y="118" width="500" height="34" fill="#FFFFFF" opacity="0.18" filter="url(#o-soft)" />
              <rect x="262" y="182" width="500" height="30" fill="#0B3D74" opacity="0.28" filter="url(#o-soft)" />
            </g>
            <path d="M330 -10 Q 380 -78 470 -92" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="12" fill="none" strokeLinecap="round" filter="url(#o-soft)" />
            <circle cx="512" cy="-128" r="64" fill="url(#o-pom)" filter="url(#o-fuzz)" />
          </g>
        </Svg>
      )
    case 'glasses':
      return (
        <Svg>
          <defs>
            <linearGradient id="gl-frame" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#8A5A3C" />
              <stop offset="0.5" stopColor="#4A2C1C" />
              <stop offset="1" stopColor="#2A170E" />
            </linearGradient>
            <linearGradient id="gl-lens" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.28" />
              <stop offset="0.5" stopColor="#CFE8FF" stopOpacity="0.08" />
              <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.16" />
            </linearGradient>
          </defs>
          {/* temples run back toward the ears */}
          <path d="M338 276 Q 300 262 262 262" stroke="#2A170E" strokeWidth="14" strokeLinecap="round" fill="none" />
          <path d="M676 370 Q 694 378 706 386" stroke="#2A170E" strokeWidth="12" strokeLinecap="round" fill="none" />
          <g filter="url(#o-shadow)">
            <ellipse cx="415" cy="290" rx="80" ry="76" fill="url(#gl-lens)" stroke="url(#gl-frame)" strokeWidth="15" />
            <ellipse cx="612" cy="350" rx="62" ry="70" transform="rotate(14 612 350)" fill="url(#gl-lens)" stroke="url(#gl-frame)" strokeWidth="14" />
            <path d="M492 300 Q 522 290 552 326" stroke="url(#gl-frame)" strokeWidth="13" fill="none" strokeLinecap="round" />
          </g>
          {/* glints */}
          <path d="M362 248 Q 384 228 414 226" stroke="#FFFFFF" strokeOpacity="0.85" strokeWidth="9" fill="none" strokeLinecap="round" />
          <path d="M370 324 L 404 268" stroke="#FFFFFF" strokeOpacity="0.22" strokeWidth="16" strokeLinecap="round" />
          <path d="M574 312 Q 590 296 612 296" stroke="#FFFFFF" strokeOpacity="0.75" strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M348 236 Q 380 218 420 216" stroke="#C48A62" strokeOpacity="0.8" strokeWidth="4" fill="none" strokeLinecap="round" />
        </Svg>
      )
    case 'bowtie':
      return (
        <Svg>
          <defs>
            <linearGradient id="bt-l" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#7A47E6" />
              <stop offset="0.5" stopColor="#A47BFA" />
              <stop offset="1" stopColor="#6233CC" />
            </linearGradient>
            <linearGradient id="bt-r" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#7444E0" />
              <stop offset="0.45" stopColor="#8B5CF6" />
              <stop offset="1" stopColor="#4B2399" />
            </linearGradient>
            <radialGradient id="bt-knot" cx="35%" cy="30%" r="80%">
              <stop offset="0" stopColor="#9A72F8" />
              <stop offset="1" stopColor="#4A2299" />
            </radialGradient>
          </defs>
          <g transform="translate(478 552) rotate(12)">
            <g filter="url(#o-shadow)">
              <path d="M-14 0 C -60 -26 -100 -80 -128 -66 C -150 -30 -150 30 -128 66 C -100 80 -60 26 -14 0 Z" fill="url(#bt-l)" />
              <path d="M14 0 C 60 -26 100 -80 128 -66 C 150 -30 150 30 128 66 C 100 80 60 26 14 0 Z" fill="url(#bt-r)" />
              <rect x="-34" y="-36" width="68" height="72" rx="24" fill="url(#bt-knot)" />
            </g>
            {/* folds and dots */}
            <path d="M-36 -10 Q -80 -30 -116 -40 M -36 10 Q -80 30 -116 40" stroke="#3F1C85" strokeOpacity="0.45" strokeWidth="6" fill="none" strokeLinecap="round" />
            <path d="M36 -10 Q 80 -30 116 -40 M 36 10 Q 80 30 116 40" stroke="#3F1C85" strokeOpacity="0.45" strokeWidth="6" fill="none" strokeLinecap="round" />
            {[
              [-96, -14], [-70, 22], [-112, 30], [84, -18], [108, 16], [70, 26],
            ].map(([x, y]) => (
              <circle key={`${x}${y}`} cx={x} cy={y} r="8" fill="#FFFFFF" opacity="0.75" />
            ))}
            <path d="M-118 -52 Q -96 -62 -70 -40" stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="8" fill="none" strokeLinecap="round" />
            <path d="M-20 -26 Q -4 -32 12 -26" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="7" fill="none" strokeLinecap="round" />
          </g>
        </Svg>
      )
    case 'party':
      return (
        <Svg>
          <defs>
            <linearGradient id="pa-cone" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#FF9CC6" />
              <stop offset="0.45" stopColor="#FF5FA2" />
              <stop offset="1" stopColor="#C42C70" />
            </linearGradient>
            <clipPath id="pa-clip">
              <path d="M368 76 L 476 -226 L 586 76 Z" />
            </clipPath>
            <radialGradient id="pa-dot" cx="35%" cy="30%" r="70%">
              <stop offset="0" stopColor="#FFF1A8" />
              <stop offset="1" stopColor="#F5B400" />
            </radialGradient>
          </defs>
          <g transform="rotate(-12 476 60)">
            <g filter="url(#o-shadow)">
              <path d="M368 76 L 476 -226 L 586 76 Z" fill="url(#pa-cone)" />
              <ellipse cx="477" cy="78" rx="112" ry="24" fill="#B32766" />
            </g>
            <g clipPath="url(#pa-clip)">
              {[
                [440, 20], [520, 0], [470, -70], [500, -140], [420, 60], [560, 54],
              ].map(([x, y]) => (
                <circle key={`${x}${y}`} cx={x} cy={y} r="17" fill="url(#pa-dot)" />
              ))}
              <path d="M368 -10 Q 476 30 590 -10" stroke="#FFFFFF" strokeOpacity="0.85" strokeWidth="12" fill="none" strokeDasharray="2 22" strokeLinecap="round" />
              <path d="M418 40 L 478 -200" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="16" strokeLinecap="round" filter="url(#o-soft)" />
            </g>
            <ellipse cx="477" cy="72" rx="108" ry="14" fill="#FF8FC0" opacity="0.6" />
            <g filter="url(#o-fuzz)">
              <circle cx="476" cy="-234" r="40" fill="#FFD24A" />
              <circle cx="466" cy="-246" r="14" fill="#FFF3B8" />
            </g>
          </g>
        </Svg>
      )
    case 'crown':
      return (
        <Svg>
          <defs>
            <linearGradient id="cr-gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#FFF0A6" />
              <stop offset="0.35" stopColor="#FFCB2E" />
              <stop offset="0.7" stopColor="#E8A100" />
              <stop offset="1" stopColor="#A86A00" />
            </linearGradient>
            <linearGradient id="cr-band" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFD84D" />
              <stop offset="1" stopColor="#B87700" />
            </linearGradient>
            <radialGradient id="cr-ruby" cx="35%" cy="30%" r="75%">
              <stop offset="0" stopColor="#FFC2DC" />
              <stop offset="0.45" stopColor="#FF4F96" />
              <stop offset="1" stopColor="#A3165A" />
            </radialGradient>
            <radialGradient id="cr-sapph" cx="35%" cy="30%" r="75%">
              <stop offset="0" stopColor="#C8E8FF" />
              <stop offset="0.45" stopColor="#3BA7FF" />
              <stop offset="1" stopColor="#0E5BA8" />
            </radialGradient>
            <radialGradient id="cr-emer" cx="35%" cy="30%" r="75%">
              <stop offset="0" stopColor="#C9F7DC" />
              <stop offset="0.45" stopColor="#34C17B" />
              <stop offset="1" stopColor="#0F7442" />
            </radialGradient>
            <radialGradient id="cr-pearl" cx="35%" cy="30%" r="75%">
              <stop offset="0" stopColor="#FFFFFF" />
              <stop offset="1" stopColor="#E6CF8A" />
            </radialGradient>
          </defs>
          <g transform="rotate(9 512 50)">
            <g filter="url(#o-shadow)">
              <path d="M366 126 L 344 -56 L 430 22 L 512 -96 L 594 22 L 680 -56 L 658 126 Z" fill="url(#cr-gold)" stroke="#A86A00" strokeWidth="6" strokeLinejoin="round" />
              <rect x="356" y="98" width="312" height="48" rx="16" fill="url(#cr-band)" />
            </g>
            {/* inner shading for depth between points */}
            <path d="M430 22 L 512 -96 L 512 100 Z" fill="#FFFFFF" opacity="0.2" />
            <path d="M594 22 L 680 -56 L 664 100 Z" fill="#7A4A00" opacity="0.18" />
            <path d="M372 112 L 652 112" stroke="#FFF4C2" strokeOpacity="0.8" strokeWidth="5" strokeLinecap="round" />
            {[380, 444, 580, 644].map((x) => (
              <circle key={x} cx={x} cy="128" r="6" fill="#FFF4C2" opacity="0.85" />
            ))}
            <ellipse cx="512" cy="54" rx="26" ry="30" fill="url(#cr-ruby)" />
            <circle cx="430" cy="74" r="17" fill="url(#cr-sapph)" />
            <circle cx="594" cy="74" r="17" fill="url(#cr-emer)" />
            <circle cx="344" cy="-60" r="15" fill="url(#cr-pearl)" />
            <circle cx="512" cy="-102" r="17" fill="url(#cr-pearl)" />
            <circle cx="680" cy="-60" r="15" fill="url(#cr-pearl)" />
            {/* specular glints */}
            <path d="M372 -20 L 384 80" stroke="#FFFFFF" strokeOpacity="0.75" strokeWidth="9" strokeLinecap="round" />
            <circle cx="503" cy="42" r="7" fill="#FFFFFF" opacity="0.9" />
          </g>
        </Svg>
      )
    default:
      return null
  }
}

function Daisy({ x, y, r, rotate, petal }: { x: number; y: number; r: number; rotate: number; petal: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${r})`}>
      {Array.from({ length: 12 }, (_, i) => (
        <ellipse key={i} cx="0" cy="-50" rx="17" ry="46" fill={petal} stroke="#E6D6BC" strokeWidth="2.5" transform={`rotate(${i * 30})`} />
      ))}
      <circle r="31" fill="url(#fl-eye)" />
      {Array.from({ length: 10 }, (_, i) => (
        <circle key={i} cx={Math.cos(i * 0.9) * (6 + (i % 3) * 7)} cy={Math.sin(i * 0.9) * (6 + (i % 3) * 7)} r="3" fill="#C27A00" opacity="0.55" />
      ))}
      <ellipse cx="-10" cy="-12" rx="10" ry="7" fill="#FFFFFF" opacity="0.6" />
    </g>
  )
}
