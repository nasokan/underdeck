// Underdeck art: woodcut / ink-print drawings as inline SVG strings.
// Colors come only from classes in art.css (ink, paper, blood).

export type BossKey = 'warden' | 'leech' | 'rust' | 'crown' | 'mimic' | 'swarm';
export type RelicKey =
  | 'whetstone' | 'trophy' | 'cloak' | 'blood' | 'packrat' | 'duelist' | 'exec'
  | 'hoarder' | 'irongut' | 'scavenger' | 'glass' | 'bloodletter' | 'tooth';

// ---------------------------------------------------------------- helpers

const svg = (cls: string, body: string, vb = '0 0 100 100'): string =>
  `<svg class="art ${cls}" viewBox="${vb}" aria-hidden="true">${body}</svg>`;

/** Filled path. */
const P = (cls: string, d: string, extra = ''): string => `<path class="${cls}" d="${d}"${extra}/>`;
/** Carved paper-colored stroke. */
const cut = (d: string, w = 1.6, extra = ''): string =>
  `<path class="cut" stroke-width="${w}" d="${d}"${extra}/>`;
/** Ink stroke. */
const ln = (d: string, w = 1.6, extra = ''): string =>
  `<path class="line" stroke-width="${w}" d="${d}"${extra}/>`;
/** Paper stroke with an ink outline: bones, blades, highlights that must read on any ground. */
const bone = (d: string, w: number): string => ln(d, w + 2.6) + cut(d, w);
const C = (cls: string, cx: number, cy: number, r: number, extra = ''): string =>
  `<circle class="${cls}" cx="${cx}" cy="${cy}" r="${r}"${extra}/>`;
const E = (cls: string, cx: number, cy: number, rx: number, ry: number, extra = ''): string =>
  `<ellipse class="${cls}" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"${extra}/>`;
const g = (cls: string, body: string, extra = ''): string =>
  `<g${cls ? ` class="${cls}"` : ''}${extra}>${body}</g>`;
const at = (x: number, y: number, s = 1, rot = 0, flip = false): string =>
  ` transform="translate(${x} ${y})${rot ? ` rotate(${rot})` : ''} scale(${flip ? -s : s} ${s})"`;

const r1 = (n: number): string => (Math.round(n * 10) / 10).toString();

/** Star / spiky polygon around a center, optionally limited to an arc (degrees, 0 = right, clockwise). */
function spikes(cx: number, cy: number, rIn: number, rOut: number, n: number, a0 = 0, a1 = 360, jag = 0): string {
  const pts: string[] = [];
  const full = a1 - a0 >= 360;
  const steps = n * 2 + (full ? 0 : 1);
  for (let i = 0; i < steps; i++) {
    const a = ((a0 + ((a1 - a0) * i) / (n * 2)) * Math.PI) / 180;
    const wob = jag ? 1 + jag * Math.sin(i * 2.7 + n) : 1;
    const r = (i % 2 ? rOut * wob : rIn);
    pts.push(`${r1(cx + Math.cos(a) * r)} ${r1(cy + Math.sin(a) * r)}`);
  }
  return `M${pts.join(' L')}${full ? 'Z' : ''}`;
}

/** Spiky fur along an elliptical arc (degrees, clockwise from right). */
function fringe(cx: number, cy: number, rx: number, ry: number, n: number, a0: number, a1: number, len: number): string {
  const pts: string[] = [];
  for (let i = 0; i <= n * 2; i++) {
    const a = ((a0 + ((a1 - a0) * i) / (n * 2)) * Math.PI) / 180;
    const k = i % 2 ? 1 + (len / Math.max(rx, ry)) * (0.7 + 0.3 * Math.sin(i * 1.7)) : 0.97;
    pts.push(`${r1(cx + Math.cos(a) * rx * k)} ${r1(cy + Math.sin(a) * ry * k)}`);
  }
  return `M${cx} ${cy} L${pts.join(' L')}Z`;
}

/** Hatched ground shadow. */
const shadow = (cx: number, rx: number, cy = 93, ry = 3.6): string => E('hatch', cx, cy, rx, ry);

// ---------------------------------------------------------------- defs

export function artDefs(): string {
  return `<svg class="ud-defs" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false"><defs>
<pattern id="ud-hatch" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line class="ud-pl" x1="0.6" y1="0" x2="0.6" y2="3.2" stroke-width="1.15"/></pattern>
<pattern id="ud-hatch2" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line class="ud-pl" x1="0.6" y1="0" x2="0.6" y2="3.2" stroke-width="1.15"/></pattern>
<pattern id="ud-xhatch" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line class="ud-pl" x1="0.6" y1="0" x2="0.6" y2="3.2" stroke-width="1"/><line class="ud-pl" x1="0" y1="0.6" x2="3.2" y2="0.6" stroke-width="1"/></pattern>
<pattern id="ud-carve" width="3.4" height="3.4" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><line class="ud-pc" x1="0.6" y1="0" x2="0.6" y2="3.4" stroke-width="0.9"/></pattern>
<pattern id="ud-hatch-s" width="1.3" height="1.3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line class="ud-pl" x1="0.3" y1="0" x2="0.3" y2="1.3" stroke-width="0.5"/></pattern>
<filter id="ud-rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.4" xChannelSelector="R" yChannelSelector="G"/></filter>
<filter id="ud-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur in="SourceGraphic" stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs></svg>`;
}

// ---------------------------------------------------------------- undead (spades)

function skeleton(): string {
  const arch = P('ink', 'M16 95 V44 A34 34 0 0 1 84 44 V95 Z') +
    cut('M20.5 93 V44.5 A29.5 29.5 0 0 1 79.5 44.5 V93', 1.1) +
    cut('M24 30 L27 32 M76 30 L73 32 M50 13 V16', 1.2);
  const skull =
    P('pi', 'M40 26 C40 14.5 60 14.5 60 26 C60 31 58.2 33 57 35 L57 40 L43 40 L43 35 C41.8 33 40 31 40 26Z', ' stroke-width="1.4"') +
    E('ink', 45.2, 27.2, 3.3, 3.7) + E('ink', 54.8, 27.2, 3.3, 3.7) +
    P('ink', 'M50 30.6 L48.4 34 L51.6 34Z') +
    ln('M44.5 37.6 H55.5 M47.2 35.8 V40 M50 35.8 V40 M52.8 35.8 V40', 0.9) +
    ln('M53 16.5 L54 20 L52.2 22.4', 0.9);
  const eyes = g('a-eyes', C('acc', 45.4, 27.6, 1.45) + C('acc', 54.6, 27.6, 1.45));
  const torso =
    bone('M50 41 V66', 3) +
    bone('M37 44.5 L63 44.5', 3) +
    bone('M50 48 C42 47 38.5 50 39.5 55 M50 48 C58 47 61.5 50 60.5 55', 2.5) +
    bone('M50 53.5 C43.5 53 41 55.5 42 59.5 M50 53.5 C56.5 53 59 55.5 58 59.5', 2.4) +
    bone('M50 58.5 C46 58.5 44.5 60 45.5 62.5 M50 58.5 C54 58.5 55.5 60 54.5 62.5', 2.2) +
    P('pi', 'M41.5 66.5 C42 62 58 62 58.5 66.5 L56 71.5 L44 71.5Z', ' stroke-width="1.3"') +
    C('ink', 50, 67, 1.6);
  const legs = bone('M45 71 L43 82 L42 92 L36.5 93.2 M55 71 L57 82 L58 92 L63.5 93.2', 3) +
    C('pi', 43, 82, 1.9, ' stroke-width="1"') + C('pi', 57, 82, 1.9, ' stroke-width="1"');
  const armL = bone('M37 44.5 L33 56 L30.5 67', 2.8) +
    ln('M30.5 67 L28.5 71.5 M30.5 67 L30.6 72 M30.5 67 L32.5 71', 1.1);
  const sword =
    P('pi', 'M74.5 43 L72.6 41.8 L82.6 9.5 L85.4 7.6 L84.8 11 Z', ' stroke-width="1.5"') +
    ln('M79.5 22 L81 23 M77.5 28.5 L78.6 29.3', 1.1) +
    ln('M68.6 40 L80.4 44.4', 3) +
    ln('M74 43 L71.6 51', 3.2) + C('ink', 71.4, 52, 2.2);
  const armR = g('a-limb',
    sword + bone('M63 44.5 L70 50.5 L74.5 44', 2.8) + C('pi', 74.6, 43.8, 2.2, ' stroke-width="1.2"'),
    ' style="transform-origin:0% 100%"');
  return svg('art-mon art-skeleton',
    arch + shadow(50, 30) + g('a-body', torso + legs + armL + skull + eyes + armR));
}

function ghoul(): string {
  const torso = P('ink', 'M38 46 C40 31 56 23 70 31 C83 39 87 56 79 68 C71 75 56 71 48 63 C44 59 40 53 38 46Z');
  const head =
    P('ink', 'M20 40 C20 30.5 29 26.5 36.5 28.6 C44 31 46.5 38 44 44.5 C42 50 36 52.5 31.5 52.5 L25 50.5 C21.6 48.6 20 44.5 20 40Z') +
    P('ink', 'M37 31 L51 22.5 L43 37.5Z') + cut('M41 31.2 L47.5 26.4', 1.2) +
    cut('M21.4 44.2 L23.6 47 L25.8 44.6 L28 47.6 L30.2 45.2 L32.4 48 L34.4 45.6', 1.35) +
    cut('M25.5 33.4 L34.6 35.6', 1.5) + cut('M30 29.6 C34 28.4 38 29.4 40.5 32', 1.1);
  const eyes = g('a-eyes', E('acc', 31, 38.4, 2.8, 1.9, ' transform="rotate(10 31 38.4)"'));
  const carve =
    cut('M44 36 C52 27.6 64 27.6 74.5 36', 2.6, ' stroke-dasharray="0.1 4.2"') +
    cut('M57 43 C61.5 49 61.5 56 57.5 62 M63.5 41.5 C68.5 48 68.5 56 64.5 62.5 M70 43.5 C74 50 74 56.5 70.6 61.5', 1.6) +
    cut('M76 52 C79.5 57 79 63 75.5 67', 1.3);
  const hind = ln('M72.5 63 L62 82 L72 92', 8.5) + ln('M69.5 92.3 L85 93.4', 4.6) +
    cut('M70 70 L65 80', 1.2) + P('hatch', 'M60 74 C64 70 72 70 76 74 L72 88 L62 86Z');
  const front = ln('M46 52 L42 72 L36.5 90', 5.6) +
    ln('M36.5 90 L30 93.4 M36.5 90 L34 95 M36.5 90 L39.6 94.4', 1.7);
  const reach = g('a-limb',
    ln('M44 50 C36 60 26 64 15.5 60', 5.2) +
    ln('M15.5 60 L7.6 53.6 M15.5 60 L5.6 59.4 M15.5 60 L8.4 65.6', 1.9) + cut('M38 58 C33 61 27 62.5 22 62', 1.1),
    ' style="transform-origin:100% 0%"');
  return svg('art-mon art-ghoul',
    shadow(52, 36) + g('a-body', hind + torso + front + reach + head + carve + eyes));
}

function wraith(): string {
  const robe = P('ink',
    'M50 7 C62 8.5 68.5 21 66.5 33 C77 37.5 87 47 93 59 L85 57.5 L88.5 67.5 L78.5 62 C74.5 70 72.5 78 74 88 L66 81.5 L62 92 L56 81.5 L50 94 L44 81.5 L38 92 L34 81.5 L26 88 C27.5 78 25.5 70 21.5 62 L11.5 67.5 L15 57.5 L7 59 C13 47 23 37.5 33.5 33 C31.5 21 38 8.5 50 7 Z');
  const folds =
    cut('M41.5 44 C39.5 60 39.5 72 37.5 83 M58.5 44 C60.5 60 61.5 70 61.5 81 M50 45 C50.6 60 50.6 72 50 86', 1.5) +
    cut('M34 40 C28 45.5 21.5 51 15 57.5 M66 40 C72 45.5 78.5 51 85 57.5', 1.3) +
    cut('M40.4 12.6 C36.6 18 35.6 24 37 32', 1.3);
  const hood = cut('M50 16.6 C57 16.6 59.6 23 59.4 29 C59 36 55 40 50 40 C45 40 41 36 40.6 29 C40.4 23 43 16.6 50 16.6Z', 2) +
    P('hatch', 'M42.6 24 C44 19 56 19 57.4 24 L57.6 26 C52 24 48 24 42.4 26Z');
  const eyes = g('a-eyes', E('acc', 45.6, 29.2, 2.3, 1.45, ' transform="rotate(12 45.6 29.2)"') +
    E('acc', 54.4, 29.2, 2.3, 1.45, ' transform="rotate(-12 54.4 29.2)"'));
  const hands = g('a-limb',
    bone('M86.5 60.5 L94 67 M87.5 59 L96 62 M85 62.4 L90.6 70.4', 1.2) +
    bone('M13.5 60.5 L6 67 M12.5 59 L4 62 M15 62.4 L9.4 70.4', 1.2));
  const wisps = P('hatch', 'M30 86 C34 92 40 90 44 96 C48 92 54 93 58 96 C62 90 68 92 72 86 L66 84 L62 92 L56 84 L50 94 L44 84 L38 92 L34 84Z');
  return svg('art-mon art-wraith',
    E('hatch', 50, 95, 22, 2.6) + g('a-body', wisps + robe + folds + hood + hands + eyes));
}

function revenant(): string {
  const cape = g('a-limb',
    P('ink', 'M26 42 C17 58 12 76 7 95 L15 90 L19 97 L25 89 L30 95 L33 80 L67 80 L70 95 L75 89 L81 97 L85 90 L93 95 C88 76 83 58 74 42Z') +
    cut('M18 64 C15 74 12 84 10 92 M82 64 C85 74 88 84 90 92', 1.2) +
    P('hatch', 'M24 56 C20 68 17 80 15 89 L20 92 L22 72Z'),
    ' style="transform-origin:50% 0%"');
  const body =
    P('ink', 'M32 37 L68 37 L72 70 L62 80 L38 80 L28 70 Z') +
    P('ink', 'M34 74 L66 74 L71 95 L64 89 L59 97 L54 89 L48 97 L42 89 L36 97 L31 89 Z') +
    P('ink', 'M19 50 C17 38 28 31.5 41 35 L42 49 Z') + P('ink', 'M81 50 C83 38 72 31.5 59 35 L58 49 L64 46 L67 50 L72 46 Z') +
    cut('M22 46 C23 40 30 36.5 38 37.5 M24 49.5 C26 44 31 41.5 38 42', 1.4) +
    cut('M78 46 C77 40 70 36.5 62 37.5', 1.4) +
    cut('M35 66 L65 66 M37 72.5 L63 72.5', 1.3) +
    cut('M36 78 L36 92 M43.5 79 L44 93 M56.5 79 L56 93 M64 78 L64 92', 1) +
    // rotten gap in the breastplate, ribs showing
    P('paper', 'M58 52 C63 50 67 54 66 60 C64 63 59 62 57 58Z') +
    ln('M58 55 L65.5 54.2 M58 58.4 L65 58.4', 1.1) +
    // arrow stuck in the shoulder
    ln('M64 42 L80 25', 1.4) + P('ink', 'M80 25 L84.5 19.5 L82 25.8Z M80 25 L85.6 22.6 L81.4 26.6Z');
  const helm =
    P('ink', 'M37.5 14 C37.5 5 62.5 5 62.5 14 L63.5 33 C63.5 37.5 36.5 37.5 36.5 33 Z') +
    cut('M41 22 L59 22', 2.6) + cut('M50 7.5 V18.5 M50 25.5 V35', 1.3) +
    cut('M43 27.5 V27.6 M43 31 V31.1 M57 27.5 V27.6 M57 31 V31.1', 1.6) +
    cut('M39.5 12.5 C40.5 9 44 7.6 47 7.4', 1.2);
  const eyes = g('a-eyes', C('acc', 45, 22, 1.7) + C('acc', 55, 22, 1.7));
  const sword =
    P('pi', 'M45.6 61 L54.4 61 L54.4 91 L50 98 L45.6 91 Z', ' stroke-width="1.8"') +
    P('hatch', 'M50 62 L54 62 L54 90.6 L50 97Z') + ln('M50 64 V90', 1) +
    P('pi', 'M33 57 L67 57 L69 61.6 L31 61.6 Z', ' stroke-width="1.6"') +
    cut('M50 56 V46', 6.6) + ln('M50 56 V46', 4) + C('pi', 50, 43.4, 3.4, ' stroke-width="1.6"');
  const arm = 'M27 45 C31 51 38 52.6 45.4 51.4 M73 45 C69 51 62 52.6 54.6 51.4';
  const arms = cut(arm, 11.6) + ln(arm, 9) +
    E('paper', 50, 51.4, 7.6, 5.8) + E('ink', 50, 51.4, 6.2, 4.4) + cut('M45.6 50 L54.4 50 M46 52.6 L54 52.6', 0.9);
  return svg('art-mon art-revenant',
    shadow(50, 40, 95, 3) + cape + g('a-body', body + sword + arms + helm + eyes));
}

function banshee(): string {
  const hair = P('ink',
    'M31 55 C21 46 15.5 31 21 14 L27 25 C28 14 34 6 43 2 L42 13 C48 6 56 3 63 2.5 L60 13 C67 8 75 9 82 5 L76 20 C84 22.5 87 34 82 47 L76 40 C74 47 72 51 69 55 L62 45 L38 45 Z');
  const strands = cut('M27 40 C24 32 24 24 27 18 M33 32 C32 22 36 14 41 9 M66 30 C68 22 70 16 76 12 M73 38 C76 32 78 28 79 22', 1.3);
  const face =
    P('pi', 'M40.5 29 C40.5 18.5 59.5 18.5 59.5 29 L57.5 46 C55.6 55 44.4 55 42.5 46 Z', ' stroke-width="1.5"') +
    P('hatch', 'M41 30 C41.2 37 42 43 43.4 47 C44.6 50 46 52 48 53 C45 47 44 40 44 32Z') +
    E('ink', 45.4, 32.4, 2.7, 3.6, ' transform="rotate(-14 45.4 32.4)"') +
    E('ink', 54.6, 32.4, 2.7, 3.6, ' transform="rotate(14 54.6 32.4)"') +
    ln('M41.6 26.6 L47.6 28.8 M58.4 26.6 L52.4 28.8', 1.3) +
    E('ink', 50, 45, 3.8, 6.6) + E('acc', 50, 47.2, 1.9, 3.4);
  const eyes = g('a-eyes', C('acc', 45.6, 33, 1.05) + C('acc', 54.4, 33, 1.05));
  const gown =
    P('ink', 'M42 52 C36 56 32 62 30.5 72 C29.5 79 27 84 24 88 L76 88 C73 84 70.5 79 69.5 72 C68 62 64 56 58 52 C55 55.5 45 55.5 42 52 Z') +
    P('hatch', 'M24 88 C20 91 16 94 12 96 L88 96 C84 94 80 91 76 88Z') +
    cut('M44 60 C42 68 40 76 37 86 M50 58 V87 M56 60 C58 68 60 76 63 86', 1.4);
  const arms = ln('M41 58 C32 58 24 52 15.5 40', 3.2) +
    ln('M15.5 40 L10.5 32.5 M15.5 40 L12.6 31.4 M15.5 40 L16.2 32 M15.5 40 L9 36.6', 1.4);
  const armR = g('a-limb', ln('M59 58 C68 58 76 52 84.5 40', 3.2) +
    ln('M84.5 40 L89.5 32.5 M84.5 40 L87.4 31.4 M84.5 40 L83.8 32 M84.5 40 L91 36.6', 1.4),
    ' style="transform-origin:0% 100%"');
  const wail = ln('M30 62 C25 66 25 72 28 76 M23 60 C17 66 17 74 21 79 M70 62 C75 66 75 72 72 76 M77 60 C83 66 83 74 79 79', 1.2);
  return svg('art-mon art-banshee',
    g('a-body', wail + hair + strands + gown + arms + armR + face + eyes));
}

function lich(): string {
  const staff =
    ln('M77 18 V95', 3.6) + cut('M76.4 30 V90', 0.8) +
    P('ink', 'M77 22 C70 20 69 12 72 6 L73.6 12 C74 16 76 18 77 18 C78 18 80 16 80.4 12 L82 6 C85 12 84 20 77 22Z') +
    C('acc', 77, 11.5, 4.2) + cut('M75 9.2 A2.8 2.8 0 0 1 77.6 8.4', 1);
  const collar = P('ink', 'M28 48 L22 22 L32 32 L33 18 L39 28 L61 28 L67 18 L68 32 L78 22 L72 48Z');
  const robe =
    P('ink', 'M30 42 C24 56 19 74 10 95 L88 95 C80 74 75 56 70 42 C62 38 38 38 30 42 Z') +
    cut('M42 50 C40 64 36 80 31 93 M50 50 V93 M58 50 C60 64 64 80 69 93', 1.5) +
    cut('M14 90 L86 90', 1.2) + P('hatch', 'M30 52 C26 66 22 80 17 90 L28 90 C31 76 34 62 36 52Z') +
    ln('M44 44 L50 54 L56 44', 1.4) + cut('M45 46 L50 53.4 L55 46', 0.9);
  const skull =
    P('pi', 'M40.5 29 C40.5 18.5 59.5 18.5 59.5 29 C59.5 34 57.5 36 56.5 38 L56 43 L44 43 L43.5 38 C42.5 36 40.5 34 40.5 29Z', ' stroke-width="1.4"') +
    E('ink', 45.3, 30, 3.1, 3.4) + E('ink', 54.7, 30, 3.1, 3.4) + P('ink', 'M50 33.4 L48.6 36.4 L51.4 36.4Z') +
    ln('M45 40.6 H55 M47.4 39 V43 M50 39 V43 M52.6 39 V43', 0.8);
  const crown = P('ink', 'M39.5 25 L38 13 L43 18.5 L46 10 L50 17 L54 10 L57 18.5 L62 13 L60.5 25 Z') +
    cut('M40.5 22.5 L59.5 22.5', 1.1) + C('pi', 50, 19.5, 1.3, ' stroke-width=".6"');
  const eyes = g('a-eyes', C('acc', 45.4, 30.6, 1.3) + C('acc', 54.6, 30.6, 1.3));
  const grip = ln('M65 46 C70 48 72 50 74.5 50', 8) + bone('M74 47 L80 47.6 M74 50.4 L80.2 51 M74.4 53.6 L79.6 54', 1.2);
  const cast = g('a-limb',
    ln('M34 46 C28 46 22 42 18.5 36', 8) +
    bone('M17.5 35 L13 26.6 M17.5 35 L16.6 25.4 M17.5 35 L20.4 26.6 M17.5 35 L11 31', 1.2) +
    ln('M14 20 L12 16 M19 19 L19.5 14.6 M23.6 21 L26.4 17.6 M9.6 24 L6 22', 1.1),
    ' style="transform-origin:100% 100%"');
  return svg('art-mon art-lich',
    shadow(50, 42, 95, 2.6) + staff + g('a-body', collar + robe + grip + cast + skull + crown + eyes));
}

function boneKing(): string {
  const throne =
    P('ink', 'M12 95 L12 40 L6 33 L15 30 L16 13 L25 22 L31 5 L40 16 L50 1 L60 16 L69 5 L75 22 L84 13 L85 30 L94 33 L88 40 L88 95 Z') +
    cut('M17 92 V40 M83 92 V40', 1.2) +
    C('pi', 16, 13, 2.7, ' stroke-width="1"') + C('pi', 84, 13, 2.7, ' stroke-width="1"') +
    C('pi', 31, 5, 2.5, ' stroke-width="1"') + C('pi', 69, 5, 2.5, ' stroke-width="1"') +
    C('ink', 15.2, 13, 0.7) + C('ink', 16.8, 13, 0.7) + C('ink', 83.2, 13, 0.7) + C('ink', 84.8, 13, 0.7) +
    cut('M21 24 L26 28 M79 24 L74 28 M36 16 L39 20 M64 16 L61 20', 1.3);
  const rests = bone('M10 62 L30 62 M70 62 L90 62', 3.4) +
    C('pi', 9, 62, 3.6, ' stroke-width="1.2"') + C('pi', 91, 62, 3.6, ' stroke-width="1.2"') +
    C('ink', 7.8, 61.6, 0.9) + C('ink', 10.2, 61.6, 0.9) + C('ink', 89.8, 61.6, 0.9) + C('ink', 92.2, 61.6, 0.9);
  const ribs =
    bone('M50 50 V76', 3) +
    bone('M50 54 C40 53 36 56 37 61 M50 54 C60 53 64 56 63 61', 2.6) +
    bone('M50 60 C42 59.5 39 62 40 66 M50 60 C58 59.5 61 62 60 66', 2.4) +
    bone('M50 65.5 C45 65.5 43.5 67 44.5 70 M50 65.5 C55 65.5 56.5 67 55.5 70', 2.2);
  const arms = bone('M30 49 L23.5 57 L28 62 M70 49 L76.5 57 L72 62', 3.2) +
    bone('M28 62 L24 64.6 M28 62 L27.4 66 M72 62 L76 64.6 M72 62 L72.6 66', 1.4);
  const legs = P('pi', 'M40 76 C40 71.5 60 71.5 60 76 L57 80 L43 80Z', ' stroke-width="1.3"') +
    bone('M44 79 L38 83 L37 92 M56 79 L62 83 L63 92', 3.4);
  const mantle = P('pi', 'M24 52 C30 42 42 40 50 40 C58 40 70 42 76 52 L76 56 C70 50 60 47.5 50 47.5 C40 47.5 30 50 24 56Z', ' stroke-width="1.6"') +
    P('ink', 'M30 48.6 l1 2.2 l1 -2.2Z M38 45.4 l1 2.2 l1 -2.2Z M46 44.4 l1 2.2 l1 -2.2Z M54 44.4 l1 2.2 l1 -2.2Z M62 45.4 l1 2.2 l1 -2.2Z M70 48.6 l1 2.2 l1 -2.2Z');
  const skull =
    P('pi', 'M38.5 30 C38.5 16.5 61.5 16.5 61.5 30 C61.5 36 59 38.5 58 41 L58 46.5 L42 46.5 L42 41 C41 38.5 38.5 36 38.5 30Z', ' stroke-width="1.6"') +
    P('ink', 'M40.8 29.6 C41 25.6 48 26.6 48.6 30 C48.6 34.4 41 34.6 40.8 29.6Z M59.2 29.6 C59 25.6 52 26.6 51.4 30 C51.4 34.4 59 34.6 59.2 29.6Z') +
    P('ink', 'M50 34 L48.2 38 L51.8 38Z') + ln('M43.5 43.2 H56.5 M46 41.2 V46.5 M48.7 41.2 V46.5 M51.3 41.2 V46.5 M54 41.2 V46.5', 0.95);
  const crown = P('pi', 'M38.5 25 L36 7.5 L43 14 L46 4 L50 12 L54 4 L57 14 L64 7.5 L61.5 25 Z', ' stroke-width="1.6"') +
    ln('M39 21 L61 21', 1.3) + P('hatch', 'M38.5 25 L37.8 19 L62.2 19 L61.5 25Z') + C('acc', 50, 16.5, 2.3) +
    C('ink', 44, 17, 1.1) + C('ink', 56, 17, 1.1);
  const eyes = g('a-eyes', C('acc', 45, 30.6, 1.6) + C('acc', 55, 30.6, 1.6));
  const heap = [14, 26, 38, 50, 62, 74, 86].map((x, i) => {
    const y = 92 + (i % 2) * 1.5;
    return C('pi', x, y, 5.6, ' stroke-width="1.2"') + C('ink', x - 2, y - 0.5, 1.3) + C('ink', x + 2, y - 0.5, 1.3) +
      ln(`M${x - 1.6} ${y + 3.3} H${x + 1.6}`, 0.8);
  }).join('');
  return svg('art-mon art-boneking',
    throne + rests + g('a-body', ribs + arms + legs + mantle + skull + crown + eyes) + heap);
}

// ---------------------------------------------------------------- beasts (clubs)

function rat(x: number, y: number, s: number, flip: boolean, tailLimb: boolean): string {
  const tail = ln('M16.5 3.5 C26 5 32 -2 27 -9 C25 -12 21 -11 21 -8', 2);
  const body =
    P('ink', 'M-21 1.2 C-17 -4 -11 -7 -5 -9.2 C3 -12.2 15.5 -10 18 0 C19 6 14 8.4 8 8.4 L-6 7.4 C-12 6.6 -17.5 4.6 -21 1.2 Z') +
    C('ink', -8, -9, 4) + cut('M-9.8 -10.6 A2.2 2.2 0 0 1 -6.2 -10.4', 1.2) +
    ln('M-11 7 L-14 11.5 M-1 8 L-2 11.8 M8 8 L10.5 11.8', 2) +
    cut('M-4 -6.2 C1 -8.6 8 -8.2 12.6 -4.4 M-1 -2.6 C3.6 -4.6 8 -4.4 11.6 -1.4', 1.1) +
    ln('M-19 1 L-25 -1.6 M-19 1.6 L-25.4 2.8', 0.6) + C('ink', -21.2, 1.1, 1.1);
  const eye = g('a-eyes', C('acc', -13.4, -2.4, 1.5));
  return g('', (tailLimb ? g('a-limb', tail, ' style="transform-origin:0% 100%"') : tail) + body + eye,
    at(x, y, s, 0, flip));
}

function ratSwarm(): string {
  return svg('art-mon art-rats',
    shadow(50, 40, 93, 3.2) + g('a-body',
      rat(62, 32, 0.62, true, false) +
      rat(28, 50, 0.95, true, false) +
      rat(74, 56, 0.9, false, false) +
      rat(44, 78, 1.35, false, true)));
}

function direWolf(): string {
  const far = ln('M36 72 L30 92 M78 72 L74 92', 4.4) + P('hatch', 'M34 70 L28 93 L34 93 L40 72Z');
  const body = P('ink',
    'M4.6 43 L13 38.6 L23.5 36 L27 25 L32.5 33.5 C38 30 44 26 50 28 L53.5 22.5 L56 29.5 L60 24.5 L62.4 31 L66.5 27 L68.5 33.5 C76 34 84 38 86.5 46 C90 50 90.5 58 88.5 66 L88.5 70 L85 88 L89 93 L80 93 L78.5 76 C74 72 70 70 66 70 L60 72 L50 72 C46 72 42.5 74 40.5 76 L38.5 89 L42.5 93.5 L33 93.5 L32 78 C30 70 28.5 64 28 58 L24 58.5 L19 57 L9 55.6 L9.6 53 L18.6 49 L6.6 46.6 Z');
  const teeth = P('acc', 'M6.6 46.6 L18.6 49 L9.6 53 Z') +
    P('pi', 'M8.4 46.8 L9.6 51.2 L10.8 47.1Z M13.6 47.8 L14.2 50.4 L15 48.1Z M10.8 52.6 L11.6 49.4 L12.6 51.8Z', ' stroke-width=".7"') +
    C('ink', 5.4, 42.8, 1.6);
  const tail = g('a-limb', P('ink', 'M82 40 C90 40 98.5 32 96 18 C94.5 23 91.5 26 89 29 C86 33 83 35.5 79 37 Z') +
    cut('M85.5 37 C90 34 93 29 94.6 23', 1.1), ' style="transform-origin:0% 100%"');
  const carve =
    cut('M34 40 L38.5 44 M38.5 37 L43 41.4 M44 34.5 L48 38.6 M30 47 L34.6 50.4 M30.6 54.4 L35 57', 1.3) +
    cut('M72 46 C78 50 80 56 78 62 M68 52 C72 56 72.6 60 71 64', 1.3) +
    cut('M20 41 C23 39.6 25 38.8 27 38.6', 1.1) + cut('M28 29 L30 33', 1) +
    cut('M50 58 C56 62 64 62 70 60', 1.2, ' stroke-dasharray="2.4 2.2"');
  const eyes = g('a-eyes', P('acc', 'M18.5 41.4 L24.4 40.4 L22.4 43.2 Z'));
  return svg('art-mon art-wolf',
    shadow(56, 38, 94) + g('a-body', far + tail + body + teeth + carve + eyes));
}

function caveBear(): string {
  const armL = ln('M30 52 C24 44 18 36 14 26', 13) +
    ln('M6 21 C4 17 5 14 7 12 M10 18 C9 13 10.5 10.6 13 9 M15 18 C15.5 13.6 17.4 11.6 20 11', 1.9);
  const body =
    P('ink', 'M22 95 C16 72 18.5 53 30 44 C37 39 63 39 70 44 C81.5 53 84 72 78 95 Z') +
    P('hatch', 'M30 60 C26 70 26 84 28 95 L36 95 C34 82 34 70 36 62Z') +
    cut('M40 54 L43 58 L46 54 M54 54 L57 58 L60 54 M46 62 L49 66 L52 62 M38 66 L41 70 L44 66 M56 66 L59 70 L62 66 M44 74 L47 78 L50 74 M54 76 L57 80 L60 76', 1.3) +
    ln('M36 95 L38 86 M64 95 L62 86', 2);
  const armR = g('a-limb', ln('M70 52 C78 58 82 64 84 72', 13) +
    ln('M85 80 C86 84 85 87 82.6 89 M89 77 C91 81 91 84 89.4 87 M91.6 72.4 C94 75 95 78 94 81', 1.9),
    ' style="transform-origin:0% 0%"');
  const head =
    C('ink', 36, 22, 5.8) + C('ink', 64, 22, 5.8) + cut('M33.4 22.4 A3 3 0 0 1 38 19.8 M62 19.8 A3 3 0 0 1 66.6 22.4', 1.3) +
    E('ink', 50, 34, 16, 14) +
    cut('M38.5 29 L46 32 M61.5 29 L54 32', 1.8) +
    P('paper', 'M42 38 C42 32 58 32 58 38 C58 41 56 42 50 42 C44 42 42 41 42 38Z') +
    E('ink', 50, 36, 3.6, 2.4) +
    P('ink', 'M42.5 41 C42.5 48 46 52 50 52 C54 52 57.5 48 57.5 41 Z') +
    P('paper', 'M43.4 41.6 L45 45.6 L46.6 41.6Z M53.4 41.6 L55 45.6 L56.6 41.6Z M45 50 L46.4 47.4 L47.4 50.6Z M52.6 50.6 L53.6 47.4 L55 50Z') +
    E('acc', 50, 47.8, 3, 2);
  const eyes = g('a-eyes', C('acc', 43.6, 31.6, 1.5) + C('acc', 56.4, 31.6, 1.5));
  return svg('art-mon art-bear', g('a-body', armL + body + armR + head + eyes));
}

function basilisk(): string {
  const path = 'M33 36 C40 56 72 42 78 60 C84 78 52 84 32 84 C18 84 14 76 22 70';
  const body = ln(path, 13) + cut(path, 4.6, ' stroke-dasharray="0.1 5.4"');
  const belly = cut('M36.5 43 C44 54 66 48 74 58 C80 68 70 79 52 80.4', 1.1, ' stroke-dasharray="3 2"');
  const tail = g('a-limb', P('ink', 'M24 64.6 C28 66 30 68 29 72 C26 72 20 72 16 66 C13 62 10 56 4 54 C12 52 18 58 24 64.6Z') +
    ln('M4 54 L1 51 M4 54 L0.6 55.4', 1.4), ' style="transform-origin:100% 100%"');
  const legs = ln('M55 50 L52 60 M52 60 L48.4 62 M52 60 L50.6 64 M52 60 L54 64', 3) +
    ln('M64 79 L62 90 M62 90 L58 92 M62 90 L61.4 94 M62 90 L65.4 93', 3);
  const head =
    P('ink', 'M9 30 C13 22 24 17.5 34 19.5 C41 21.5 43 30 38.5 37 L30 38.5 C22 38.5 14 36.5 9 30Z') +
    P('ink', 'M23 21 L20 9 L27 16 L29.4 4.6 L33.6 15.6 L39 9 L38.4 22.6Z') +
    cut('M25.4 16.6 L23.6 12.6 M31.4 13.4 L30.4 9.6', 1) +
    cut('M10.5 31 C16 33.5 23 34.4 31 34', 1.2) + cut('M30 36.6 L36 34.4', 1) +
    `<path class="acc-s" stroke-width="1.3" d="M8.6 30.4 L3 32.6 L0.6 30.6 M3 32.6 L1 35.4"/>`;
  const eyes = g('a-eyes', C('acc', 27.4, 26.2, 3.6) + P('ink', 'M27.4 23.2 C26.4 25 26.4 27.4 27.4 29.2 C28.4 27.4 28.4 25 27.4 23.2Z') +
    ln('M21.4 22.6 L18.6 20.6 M21 26.2 L17.6 26.2 M22 29.8 L19.4 31.6', 0.9));
  return svg('art-mon art-basilisk',
    shadow(52, 40, 94) + g('a-body', tail + body + belly + legs + head + eyes));
}

function manticore(): string {
  const wingFar = P('hatch', 'M60 48 L66 14 L76 20 L84 12 Q83 26 88 28 Q86 38 92 42 Q84 46 80 50Z');
  const wing = P('ink', 'M46 50 L39 10 L52 16 L60 7 Q59.5 21 66 22 Q65 31 74 33 Q70 41 70 50 Z') +
    cut('M47 47 L51.6 17 M48 47 L59 9.6 M50 48 L64.6 23.6 M52 48.6 L71.6 34', 1.2);
  const tail = g('a-limb',
    ln('M82 58 C96 52 98.5 32 89 21 C83 15.4 75 17 73 23', 6.4) +
    cut('M82 58 C96 52 98.5 32 89 21 C83 15.4 75 17 73 23', 6.8, ' stroke-dasharray="1 4.2" stroke-linecap="butt"') +
    P('acc', 'M74.6 21.4 C70 19.4 66 22 66.2 29 C68 25.6 70.6 25.2 73.4 26.4Z'),
    ' style="transform-origin:0% 100%"');
  const legsFar = ln('M38 72 L36 93 M78 70 L80 93', 4.6);
  const body = P('ink', 'M26 50 C34 46 60 46 74 50 C82 52 86 58 84 66 L86 90 L90 94.5 L80 94.5 L76.5 74 C68 74.5 52 74.5 44 72 L41 90 L45 94.5 L33 94.5 L30.5 74 C26 70 22 62 26 50Z') +
    cut('M50 60 C58 63 66 63 74 60 M78 60 C80 64 80 68 79 72', 1.3) + cut('M32 62 L36 66 M33 70 L37 72', 1.2);
  const mane = P('ink', spikes(22, 45, 13, 19.5, 11, 0, 360, 0.08)) + cut(spikes(22, 45, 15.5, 17.4, 11, 16, 376), 0.9);
  const face =
    P('pi', 'M14 42 C14 33 30 33 30 42 C30 50 27 56 22 56 C17 56 14 50 14 42Z', ' stroke-width="1.4"') +
    ln('M15.6 39 L20.6 41 M28.4 39 L23.4 41', 1.5) +
    E('ink', 18.6, 42.4, 1.9, 1.3) + E('ink', 25.4, 42.4, 1.9, 1.3) +
    ln('M22 43.6 L21 47 L22.6 47.4', 0.9) +
    P('ink', 'M15.8 48.4 C18 54 26 54 28.2 48.4Z') +
    cut('M17 49.6 L18 51 L19 49.6 L20 51 L21 49.6 L22 51 L23 49.6 L24 51 L25 49.6 L26 51 L27 49.6', 0.6);
  const eyes = g('a-eyes', C('acc', 18.8, 42.5, 0.85) + C('acc', 25.2, 42.5, 0.85));
  return svg('art-mon art-manticore',
    shadow(56, 38, 94.5, 3) + wingFar + g('a-body', legsFar + tail + body + wing + mane + face + eyes));
}

function wyrm(): string {
  const coilOuter = 'M50 92 C20 92 8 84 10 74 C12 64 32 60 54 61 C78 62 92 68 90 78 C88 87 70 90 58 88';
  const coilInner = 'M58 88 C44 86 30 82 32 76 C34 70 54 69 66 72 C74 74 74 80 66 81';
  const neck = 'M28 70 C20 56 24 42 34 36 C42 31 44 24 40 17';
  const spinePts = [[11, 70], [16, 64.6], [24, 61.6], [33, 60.4], [42, 60.2], [62, 61.2], [72, 62.4], [81, 64.6], [88, 69]];
  const spines = spinePts.map(([x, y]) => P('ink', `M${x - 3} ${y + 1} L${x - 1} ${y - 6} L${x + 3} ${y + 0.6}Z`)).join('') +
    [[22, 57], [21, 49], [24, 41.6], [31, 35.6], [38, 30]].map(([x, y]) => P('ink', `M${x + 1} ${y + 3} L${x - 6} ${y - 1} L${x + 2} ${y - 3}Z`)).join('');
  const body =
    ln(coilOuter, 14) + cut(coilOuter, 4.4, ' stroke-dasharray="0.1 5.6"') +
    ln(coilInner, 12) + cut(coilInner, 3.6, ' stroke-dasharray="0.1 5.6"') +
    ln(neck, 13) + cut('M34 70 C27 57 31 44 39.6 39 C46 35 49 28 46 20', 1.6, ' stroke-dasharray="2.6 1.8"');
  const claw = ln('M48 66 L56 56 M56 56 L60 54 M56 56 L60.6 57.6 M56 56 L58 52', 4) + ln('M56 56 L61 53.4 M56 56 L61.4 58 M56 56 L58.6 51.4', 1.6);
  const tail = g('a-limb', P('ink', 'M64 76 C72 76 82 80 92 86 C86 84 76 83 66 84 Z'), ' style="transform-origin:0% 50%"');
  const head =
    P('ink', 'M30 18 C32 9 42 6 50 8 L64 12 C67 13 68 16 66 18 L54 19 L66 22 C67 24 66 26 62 26 L48 26 C42 28 34 26 30 18Z') +
    P('ink', 'M36 10 C30 4 22 3 14 6 C22 7 28 10 31 15Z M41 7.6 C38 1 32 -1 26 0 C32 2 36 5 37 10Z') +
    cut('M20 5.4 C25 6.4 28.4 8.6 31 12', 1) +
    P('paper', 'M54 19 L56 21.6 L57.4 19.2 Z M59 19 L60.6 21 L61.6 18.8Z M56 22.2 L57 19.8 L58.4 22.2Z M61 22.2 L62 20 L63.2 22.4Z M64.6 18.4 L65.4 16.4 L66.2 18Z') +
    cut('M50 11 L62 13.6', 1) + C('paper', 64, 13.6, 0.8) +
    cut('M34 21 C38 24 44 24.6 48 24', 1.2);
  const eyes = g('a-eyes', P('acc', 'M42 12.4 L49 13.2 L45 15.8Z'));
  return svg('art-mon art-wyrm',
    shadow(50, 44, 94, 2.6) + g('a-body', tail + spines + body + claw + head + eyes));
}

function elderBeast(): string {
  const sky = P('hatch', 'M0 0 H100 V60 H0Z');
  const antlers = ln('M34 32 C28 22 24 14 26 4 M28 18 C22 16 16 10 14 2 M26 10 C30 6 34 4 38 0 M20 13 C14 14 8 12 4 8', 3.2) +
    ln('M66 32 C72 22 76 14 74 4 M72 18 C78 16 84 10 86 2 M74 10 C70 6 66 4 62 0 M80 13 C86 14 92 12 96 8', 3.2);
  const body = P('ink', 'M4 96 C2 64 14 36 50 28 C86 36 98 64 96 96 Z') +
    P('ink', fringe(50, 98, 45.4, 69.4, 26, 196, 344, 5));
  const grin = P('paper', 'M24 76 C34 84 66 84 76 76 C66 80 34 80 24 76Z') +
    cut('M24 76 L27 81.6 L30 78 L33 83.2 L36 79.2 L39 84 L42 79.8 L45 84.4 L48 80 L51 84.6 L54 80 L57 84.4 L60 79.6 L63 83.6 L66 79 L69 82.4 L72 78.4 L75 80.6', 1.5);
  const bigEye = (x: number, y: number, r: number): string =>
    E('paper', x, y, r, r * 0.66) + E('ink', x, y, r * 0.24, r * 0.6) + C('acc', x, y, r * 0.18);
  const smallEyes = [[22, 54], [78, 54], [32, 66], [68, 66], [50, 38], [14, 70], [86, 70], [40, 46], [60, 46]]
    .map(([x, y], i) => E('acc', x, y, i < 4 ? 2.2 : 1.6, i < 4 ? 1.5 : 1.1)).join('');
  const eyes = g('a-eyes', bigEye(38, 56, 6) + bigEye(62, 56, 6) + bigEye(50, 64, 4) + smallEyes);
  const trees =
    P('ink', 'M0 0 H9 C8 30 9 60 12 96 H0Z') + P('ink', 'M100 0 H91 C92 30 91 60 88 96 H100Z') +
    ln('M8 22 L16 14 M8 40 L18 36 M92 26 L84 18 M92 46 L82 42', 2.2) +
    cut('M4 6 C3.4 30 4 60 6 92 M96 6 C96.6 30 96 60 94 92', 1.1, ' stroke-dasharray="6 3"');
  const wanderer = P('ink', 'M47.2 99 L48 93 C47.2 91.6 47.4 90 48.6 89.4 C48 88.4 48.6 87 49.6 87 C50.6 87 51.2 88.4 50.6 89.4 C51.8 90 52 91.6 51.2 93 L52 99Z') +
    ln('M51.4 91 L54 92.4', 0.8) + C('acc', 54.4, 93.6, 0.9);
  return svg('art-mon art-elder',
    sky + g('a-body', antlers + body + grin + eyes) + trees + P('paper', 'M40 97 C46 95 54 95 60 97 V100 H40Z') + wanderer);
}

// ---------------------------------------------------------------- public: monsters

export function monsterArt(suit: 'S' | 'C', v: number): string {
  if (suit === 'S') {
    if (v <= 5) return skeleton();
    if (v <= 9) return ghoul();
    if (v === 10) return wraith();
    if (v === 11) return revenant();
    if (v === 12) return banshee();
    if (v === 13) return lich();
    return boneKing();
  }
  if (v <= 5) return ratSwarm();
  if (v <= 9) return direWolf();
  if (v === 10) return caveBear();
  if (v === 11) return basilisk();
  if (v === 12) return manticore();
  if (v === 13) return wyrm();
  return elderBeast();
}

// ---------------------------------------------------------------- weapons (diamonds)

const backdrop = (): string => C('hatch', 50, 50, 40) + C('line', 50, 50, 40, ' stroke-width="1.2"');

function dagger(): string {
  const blade = g('a-blade',
    P('pi', 'M50 10 C57 22 59.5 40 57 60 L43 60 C40.5 40 43 22 50 10Z', ' stroke-width="2.2"') +
    P('hatch', 'M50 12 C56 24 58 40 56 58.6 L50 58.6Z') + ln('M50 22 V56', 1.6) +
    cut('M46.4 24 C45 32 44.6 42 45.2 54', 1.3));
  const hilt =
    P('ink', 'M30 60 C30 57 36 58 50 58 C64 58 70 57 70 60 C70 63.6 64 64 50 64 C36 64 30 63.6 30 60Z') +
    C('ink', 29, 57.6, 2.8) + C('ink', 71, 57.6, 2.8) +
    P('ink', 'M45 63 H55 V82 H45Z') + cut('M45.5 67 L54.5 69.4 M45.5 72 L54.5 74.4 M45.5 77 L54.5 79.4', 1.2) +
    C('acc', 50, 87, 5, ' stroke-width="1.8"') + C('line', 50, 87, 5, ' stroke-width="1.8"') + cut('M47.6 85 A3 3 0 0 1 50.4 84', 1.1);
  return svg('art-wpn art-dagger', backdrop() + g('', blade + hilt, ' transform="rotate(38 50 50) translate(0 -1)"'));
}

function sword(): string {
  const blade = g('a-blade',
    P('pi', 'M50 2 L55.6 11 L55.6 63 L44.4 63 L44.4 11Z', ' stroke-width="2"') +
    P('hatch', 'M50 4 L54.6 11.4 L54.6 62 L50 62Z') + ln('M50 13 V58', 1.6) + cut('M47 13 V58', 1.1));
  const hilt =
    P('ink', 'M26 62 C26 58 34 61 50 61 C66 61 74 58 74 62 C74 66 68 67 50 67 C32 67 26 66 26 62Z') +
    P('ink', 'M26 62 C22 62 20 66 21 70 C22 67 24 65 27 65Z M74 62 C78 62 80 66 79 70 C78 67 76 65 73 65Z') +
    cut('M32 63.4 L68 63.4', 1) +
    P('ink', 'M45.6 66 H54.4 V84 H45.6Z') + cut('M46 70 L54 72 M46 74.6 L54 76.6 M46 79.2 L54 81.2', 1.1) +
    C('ink', 50, 89, 5.6) + cut('M50 89 m-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0', 1.1);
  return svg('art-wpn art-sword', backdrop() + g('', blade + hilt, ' transform="rotate(42 50 50)"'));
}

function battleAxe(): string {
  const haft = ln('M50 6 V96', 6.4) + cut('M48.8 46 V94', 0.9) +
    cut('M47.4 64 L52.6 66.6 M47.4 68 L52.6 70.6 M47.4 72 L52.6 74.6 M47.4 76 L52.6 78.6', 1.2) +
    C('ink', 50, 96, 4.2);
  const bit = 'M53 16 C62 16 70 12 78 5 C87 16 88 36 79 49 C71 41 62 37 53 37 Z';
  const head = g('a-blade',
    P('pi', bit, ' stroke-width="2.2"') + P('pi', bit, ' stroke-width="2.2" transform="translate(100 0) scale(-1 1)"') +
    P('hatch', 'M53 18 C60 18 66 16 70 14 C73 24 73 32 71 40 C66 38 60 36 53 35.4Z') +
    P('hatch', 'M47 18 C40 18 34 16 30 14 C27 24 27 32 29 40 C34 38 40 36 47 35.4Z') +
    cut('M80.6 10 C85 20 85.4 34 80.4 44 M19.4 10 C15 20 14.6 34 19.6 44', 1.3) +
    P('ink', 'M45 12 H55 V41 H45Z') + P('ink', 'M46 12 L50 0 L54 12Z') + cut('M47.6 15 V38', 1) +
    P('acc', 'M83.4 27 C82 31 82.4 34 84 35.4 C85.6 34 85.4 31 83.4 27Z M80.8 40 C80 42.6 80.4 44.4 81.6 45 C82.8 44 82.6 42 80.8 40Z'));
  return svg('art-wpn art-axe', backdrop() + g('', haft + head, ' transform="rotate(30 50 50) translate(0 2)"'));
}

function greatsword(): string {
  const blade = g('a-blade',
    P('pi', 'M50 -14 L59.4 -3 L59.4 55 L40.6 55 L40.6 -3Z', ' stroke-width="2.2"') +
    P('hatch', 'M50 -12 L58.2 -2.4 L58.2 54 L50 54Z') + ln('M50 -2 V50', 1.8) +
    cut('M45.4 0 V50', 1.3) +
    P('ink', 'M40.6 49 L36 46 L34 49.6 L39 55 L40.6 55Z M59.4 49 L64 46 L66 49.6 L61 55 L59.4 55Z'));
  const hilt =
    P('ink', 'M14 59 C14 54.6 28 57.4 50 57.4 C72 57.4 86 54.6 86 59 C86 63.4 72 64 50 64 C28 64 14 63.4 14 59Z') +
    P('ink', 'M15 59 L9 52 L11 59 L9 66Z M85 59 L91 52 L89 59 L91 66Z') + cut('M20 60 L80 60', 1) +
    C('acc', 50, 60.6, 3.8) + C('line', 50, 60.6, 3.8, ' stroke-width="1.3"') +
    P('ink', 'M45.4 63 H54.6 V83 H45.4Z') + cut('M46 67 L54 69 M46 71.6 L54 73.6 M46 76.2 L54 78.2', 1.1) +
    P('ink', 'M50 82 L56.4 88 L50 94 L43.6 88Z') + cut('M50 85 L53 88 L50 91', 1);
  return svg('art-wpn art-greatsword', backdrop() + g('', blade + hilt, ' transform="rotate(45 50 50) translate(0 10)"'));
}

export function weaponArt(v: number): string {
  if (v <= 4) return dagger();
  if (v <= 7) return sword();
  if (v <= 9) return battleAxe();
  return greatsword();
}

// ---------------------------------------------------------------- potions (hearts)

function vial(): string {
  const glass = P('pi', 'M44 26 L56 26 L56 34 C59.5 36 60 39 60 43 L60 80 C60 88.6 40 88.6 40 80 L40 43 C40 39 40.5 36 44 34 Z', ' stroke-width="2.2"');
  const liquid = g('a-liquid', P('acc', 'M42.4 56 C46 54 54 58 57.6 55.4 L57.6 80 C57.6 86 42.4 86 42.4 80 Z') +
    cut('M44.6 60 V79', 1.6));
  const bubbles = g('a-bubbles', C('paper', 52, 74, 1.5) + C('paper', 54.4, 66, 1.1) + C('paper', 49.6, 62, 0.9));
  const top = P('ink', 'M42.6 18 H57.4 V27 H42.6Z') + cut('M45 21 H55 M45 24 H55', 1) +
    P('hatch', 'M40 44 C40.6 40 42 37 44.6 35.4 L44.6 54 L40 54.6Z') +
    cut('M43.6 40 C42.6 42 42.4 46 42.6 50', 1.4) +
    ln('M56 30 C62 30 66 34 64 40', 1) + P('pi', 'M61 38 L68 38 L68 46 L61 46Z', ' stroke-width="1" transform="rotate(12 64 42)"') +
    C('ink', 64.4, 42, 1.3);
  return svg('art-pot art-vial', shadow(50, 16, 89, 2.4) + glass + liquid + bubbles + top);
}

function flask(): string {
  const glass = P('pi', 'M43.6 16 L56.4 16 L56.4 40 A25 25 0 1 1 43.6 40 Z', ' stroke-width="2.4"');
  const liquid = g('a-liquid',
    P('acc', 'M28 57 C36 53 44 60 50 57 C56 54 64 60 72 57 A22.6 22.6 0 1 1 28 57Z') +
    cut('M31.4 70 C32.6 78 37 83 42 85', 1.8));
  const bubbles = g('a-bubbles', C('paper', 56, 76, 2) + C('paper', 63, 68, 1.4) + C('paper', 47, 70, 1.2) + C('paper', 59, 61.6, 1));
  const top = P('ink', 'M41.6 7 H58.4 V17 H41.6Z') + cut('M44 10.4 H56 M44 13.6 H56', 1.1) +
    cut('M46.6 22 V38', 1.4) +
    P('hatch', 'M30 50 C32 44 37 40 43.6 38.6 L43.6 44 C38 46 34 50 32.4 56Z') +
    cut('M34 52 C36 47.6 39.6 44.8 43 43.6', 1.4) +
    P('pi', 'M40 63 H60 V75 H40Z', ' stroke-width="1.3"') +
    C('ink', 50, 67.4, 2.6) + P('ink', 'M48.6 69 H51.4 V71 H48.6Z') + ln('M45 72 L55 66 M45 66 L55 72', 1.1) +
    C('paper', 49, 67.4, 0.6) + C('paper', 51, 67.4, 0.6);
  return svg('art-pot art-flask', shadow(50, 22, 91, 2.6) + glass + liquid + top + bubbles);
}

function cauldron(): string {
  const fire = P('ink', 'M24 96 C22 90 26 86 26 82 C30 86 30 88 32 90 C32 84 36 80 36 76 C40 82 42 86 42 90 C44 86 46 84 46 80 C50 86 52 90 52 92 C54 88 56 86 56 82 C60 86 62 90 62 92 C64 88 66 84 66 80 C70 86 70 90 70 92 C72 90 74 88 76 84 C78 88 78 92 76 96Z') +
    cut('M30 94 C30 92 31 90 32 89 M41 94 C41 92 42 90 42.5 89 M52 94 C52 92 52.6 90 53 89 M63 94 C63 92 63.6 90 64 89', 1.3);
  const pot = P('ink', 'M14 44 C14 72 28 86 50 86 C72 86 86 72 86 44 Z') +
    ln('M26 82 L20 92 M74 82 L80 92', 4.6) +
    C('line', 11, 54, 5, ' stroke-width="3"') + C('line', 89, 54, 5, ' stroke-width="3"') +
    cut('M20 52 C21 66 30 77 44 80.6', 1.8) + cut('M24 50 C25 58 28 64 32 68', 1.1) +
    P('hatch2', 'M60 48 L84 48 C82 64 74 76 62 82 C66 72 66 60 60 48Z');
  const rim = E('ink', 50, 44, 38, 8) + cut('M15 43 C24 37.4 76 37.4 85 43', 1.4);
  const liquid = g('a-liquid',
    E('acc', 50, 43.6, 32.6, 5) + P('acc', 'M28 47 C27 52 28 55 30 56 C32 54 31 51 30 47Z M70 47 C69 53 70 57 72 58 C74 55 73 51 72 47Z') +
    cut('M28 42 C36 40 44 39.6 50 39.6', 1.2));
  const boneOut = bone('M60 41 L72 26', 3) + C('pi', 72.6, 25.4, 2.6, ' stroke-width="1.2"') + C('pi', 74.2, 27.8, 2.4, ' stroke-width="1.2"');
  const bubbles = g('a-bubbles',
    C('pi', 40, 34, 3, ' stroke-width="1.4"') + C('pi', 52, 28, 2.2, ' stroke-width="1.3"') +
    C('pi', 33, 22, 1.8, ' stroke-width="1.2"') + C('pi', 47, 15, 1.5, ' stroke-width="1.1"') + C('pi', 58, 18, 1.2, ' stroke-width="1"'));
  const steam = ln('M24 30 C20 24 26 20 22 12 M76 34 C80 28 74 22 80 14 M64 12 C60 8 64 4 62 0', 1.4);
  return svg('art-pot art-cauldron', fire + pot + rim + liquid + boneOut + bubbles + steam);
}

export function potionArt(v: number): string {
  if (v <= 4) return vial();
  if (v <= 7) return flask();
  return cauldron();
}

// ---------------------------------------------------------------- bosses

function warden(): string {
  const door =
    P('ink', 'M52 95 V32 A22 22 0 0 1 96 32 V95 Z') +
    cut('M56 92 V33 A18 18 0 0 1 92 33 V92', 1.2) +
    cut('M54 50 H94 M54 76 H94', 2.6) +
    cut('M58 50 V50.1 M66 50 V50.1 M82 50 V50.1 M90 50 V50.1 M58 76 V76.1 M66 76 V76.1 M82 76 V76.1 M90 76 V76.1', 2.6) +
    P('paper', 'M64 22 H84 V42 H64Z') + P('hatch', 'M64 22 H84 V42 H64Z') +
    ln('M64 22 H84 V42 H64Z M69 22 V42 M74 22 V42 M79 22 V42', 1.6) +
    C('acc', 71.4, 33, 1.3) + C('acc', 76.6, 33, 1.3);
  const body =
    P('ink', 'M6 95 C6 70 12 56 24 50 C30 47 44 47 48 51 C58 58 62 74 62 95 Z') +
    P('pi', 'M12 74 C22 76 44 76 58 72 L59 79 C44 83 22 83 11 81Z', ' stroke-width="1"') +
    P('ink', 'M30 73.4 H40 V81.6 H30Z') + cut('M32.4 75.6 H37.6 V79.4 H32.4Z', 1) +
    cut('M18 58 C22 64 24 70 24 74 M46 56 C50 62 52 68 52 72', 1.3) +
    P('hatch', 'M12 84 C20 87 44 87 60 84 L61 95 L8 95Z');
  const head =
    P('ink', 'M24 52 C19 38 23 22 36 19 C49 20 53 36 48 52 Z') +
    P('pi', 'M28.6 32 C29 28 43 28 43.4 32 L43.4 41 C42 48 30 48 28.6 41 Z', ' stroke-width="1.2"') +
    P('hatch', 'M29 39 C30 46 42 46 43 39 L43 44 C40 49 32 49 29 44Z') +
    ln('M29.6 32.6 L35 35 M42.4 32.6 L37 35', 1.8) +
    ln('M32.6 42.6 C34.6 41 37.4 41 39.4 42.6', 1.3) + ln('M36 36.6 L35.2 39.6 L36.8 39.6', 0.9) +
    cut('M30 22 C34 19.6 40 19.6 44 22', 1.2);
  const eyes = g('a-eyes', C('ink', 33.2, 36.2, 1.2) + C('ink', 38.8, 36.2, 1.2));
  const keys = g('a-limb',
    ln('M14 56 C9 48 8 38 11 28', 9) + C('ink', 12, 26, 4.6) +
    C('line', 14, 14.6, 7, ' stroke-width="2"') +
    bone('M8 19 L3 33', 1.6) + bone('M3 33 L6 34.4', 1.4) + C('pi', 7.8, 18.4, 2, ' stroke-width="1"') +
    bone('M17 20.8 L19 36', 1.6) + bone('M19 36 L22 35.4 M19 32.6 L21.6 32.2', 1.3) + C('pi', 17, 20.6, 2, ' stroke-width="1"') +
    bone('M21 15 L28 26', 1.6) + bone('M28 26 L30.4 24.4', 1.4) + C('pi', 20.6, 14.6, 2, ' stroke-width="1"'),
    ' style="transform-origin:50% 100%"');
  return svg('art-boss art-warden', door + g('a-body', body + keys + head + eyes));
}

function leech(): string {
  const body =
    P('ink', 'M24 38 C21 56 28 72 42 82 C54 90 68 97 84 95 C97 93 99 80 95 69 C91 57 81 50 68 46 C57 42 52 34 50 24 Z') +
    P('hatch', 'M30 64 C34 74 42 82 52 88 C62 93 72 96 82 95 L80 99 C66 99 50 94 40 87 C32 80 28 72 30 64Z') +
    cut('M28 51 Q40 53 54 39 M33 62 Q47 64 62 47 M40 72 Q56 74 72 53 M50 81 Q67 83 84 60 M62 89 Q78 89 92 69', 1.7) +
    cut('M78 93.6 Q89 90 96 80', 1.3) +
    cut('M55 31 C59 40 67 45 78 50', 2.4) + cut('M82 53 C88 57 91 61 93 66', 1.6) +
    P('acc', 'M70 66 C74 64 78 66 78 70 C76 72 72 72 70 66Z M60 76 C62 74.4 65 75 65 77.6 C63 79 61 78.6 60 76Z');
  const teeth = (() => {
    let d = '';
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const a1 = a - 0.17, a2 = a + 0.17;
      d += `M${r1(Math.cos(a1) * 13.4)} ${r1(Math.sin(a1) * 13.4)} L${r1(Math.cos(a) * 7.6)} ${r1(Math.sin(a) * 7.6)} L${r1(Math.cos(a2) * 13.4)} ${r1(Math.sin(a2) * 13.4)}Z `;
    }
    return P('paper', d);
  })();
  const mouth = g('',
    C('ink', 0, 0, 20) + cut('M0 0 m-16.4 0 a16.4 16.4 0 1 0 32.8 0 a16.4 16.4 0 1 0 -32.8 0', 2.4) +
    teeth + C('ink', 0, 0, 7.2) + cut('M0 0 m-4.6 0 a4.6 4.6 0 1 0 9.2 0', 1, ' stroke-dasharray="1.4 1.6"') + cut('M-15 -13 C-9 -18 -2 -19 5 -17.6', 1.3),
    ' transform="translate(36 28) rotate(-24) scale(1 .78)"');
  const drips = P('acc', 'M28 44 C26 48 26.4 51 28.4 52.4 C30.4 51 30.4 48 28 44Z M37 45 C36 48 36.4 50 37.6 51 C39 50 38.8 48 37 45Z M30 57 C29 60 29.4 62 30.6 62.6 C32 61.6 31.6 59.6 30 57Z');
  const eyes = g('a-eyes', C('paper', 54, 16.6, 1.3) + C('paper', 56.6, 21, 1.3) + C('paper', 57.6, 26, 1.1));
  return svg('art-boss art-leech', E('hatch', 60, 96, 36, 3) + g('a-body', body + mouth + drips + eyes));
}

function rustking(): string {
  const shoulders =
    P('ink', 'M5 95 C5 72 13 60 29 55 L71 55 C87 60 95 72 95 95 Z') +
    cut('M10 78 C14 67 22 61 33 58 M12 87 C16 76 24 70 35 67 M90 78 C86 67 78 61 67 58 M88 87 C84 76 76 70 65 67', 1.6) +
    cut('M50 62 V95', 1.4) + cut('M40 64 C42 74 42 86 40 95 M60 64 C58 74 58 86 60 95', 1);
  const helm =
    P('ink', 'M31 58 L29.5 30 C29.5 17 70.5 17 70.5 30 L69 58 Z') +
    P('ink', 'M30 26 L27 6 L35.5 18 L41 2 L46.5 16 L50 4 L53.5 16 L60 6 L62.5 17 L70.5 9 L69 20 L70 26Z') +
    cut('M31 23.5 L69 23.5', 1.4) +
    cut('M36 36 L64 36', 3.2) +
    cut('M40 44 V54 M45 44 V55.6 M50 44 V56 M55 44 V55.6 M60 44 V54', 1.5);
  const flakes =
    P('paper', 'M16 72 l3 -2 l2 3 l-3 2Z M78 64 l4 -1 l1 3 l-3 1.6Z M84 80 l2.4 -2 l2 2.4 l-2.8 1.4Z M22 84 l3 0 l0.6 3 l-3 0.4Z M66 28 l2 2 l-1.4 2.4 l-1.6 -1.6Z M34 48 l2 -1 l0.8 2.4 l-2.2 0.6Z M56 12 l2 1 l-1 2 l-1.6 -1Z') +
    P('hatch', 'M60 64 C66 62 74 66 76 74 C70 76 62 72 60 64Z M22 64 C26 62 30 64 30 68 C26 70 23 68 22 64Z') +
    cut('M33 40 C33 44 32.4 47 33 50 M67 40 C67 44 67.6 46 67 49 M38 58 C38 61 37.6 63 38 66 M62 58 C62 62 62.4 64 62 67', 0.9) +
    P('ink', 'M8 50 l3 -1 l1 2 l-3 1Z M92 44 l-3 -1 l-1 2.4 l3 0.6Z M88 30 l2 1.6 l-1.6 1.6 l-1.6 -1.4Z M12 36 l2 -1.4 l1.2 1.8 l-2 1Z M14 22 l1.6 0 l0.4 1.6 l-1.6 0.4Z');
  const eyes = g('a-eyes', C('acc', 43, 36, 2.1) + C('acc', 57, 36, 2.1));
  return svg('art-boss art-rust', g('a-body', shoulders + helm + flakes + eyes));
}

function hollowCrown(): string {
  const robe = P('ink', 'M12 95 C12 78 22 68 35 66 C40 71.6 60 71.6 65 66 C78 68 88 78 88 95 Z') +
    E('ink', 50, 67.4, 15.4, 5) + E('paper', 50, 67.4, 13, 3.6) + E('ink', 50, 67.8, 12, 2.9) +
    cut('M30 76 C28 82 27 88 26 95 M70 76 C72 82 73 88 74 95 M50 74 V95', 1.4) +
    P('hatch', 'M16 92 C17 82 23 74 32 70 C30 78 30 86 32 95 L16 95Z');
  const ghost = E('line', 50, 54, 11, 13, ' stroke-width="1.1" stroke-dasharray="2 2.6"') +
    ln('M28 58 C24 56 22 52 22 48 M72 58 C76 56 78 52 78 48', 1.1);
  const crown =
    P('ink', 'M26 50 L22 24 L34 33 L38 13 L46 29 L50 8 L54 29 L62 13 L66 33 L78 24 L74 50 Z') +
    cut('M27.4 40.4 L72.6 40.4 M28 47 L72 47', 1.3) +
    C('pi', 22, 23, 2.4, ' stroke-width="1.2"') + C('pi', 38, 12, 2.4, ' stroke-width="1.2"') + C('pi', 50, 7, 2.6, ' stroke-width="1.2"') +
    C('pi', 62, 12, 2.4, ' stroke-width="1.2"') + C('pi', 78, 23, 2.4, ' stroke-width="1.2"') +
    cut('M37 32 L39 22 M49 28 L50 18', 1.1) +
    P('pi', 'M35 43.6 L38 41.6 L41 43.6 L38 45.8Z M59 43.6 L62 41.6 L65 43.6 L62 45.8Z', ' stroke-width=".8"');
  const eyes = g('a-eyes', C('acc', 50, 43.8, 3.4) + cut('M48.6 42.4 L49.6 41.6', 0.9));
  return svg('art-boss art-crown', robe + ghost + g('a-body', crown + eyes) + E('hatch', 50, 59, 16, 2));
}

function mimic(): string {
  const lid = P('ink', 'M12 44 C12 22 28 10 50 10 C72 10 88 22 88 44 Z') +
    cut('M26 42 C26 26 30 18 36 14 M74 42 C74 26 70 18 64 14', 2.4) + cut('M14 41.4 L86 41.4', 1.6);
  const eyes = g('a-eyes',
    E('paper', 40, 28, 6, 4.4) + E('paper', 60, 28, 6, 4.4) + E('ink', 41.4, 28.6, 1.6, 3.2) + E('ink', 58.6, 28.6, 1.6, 3.2) +
    ln('M33 22 L46 26 M67 22 L54 26', 2.2));
  const inside = P('ink', 'M14 42 H86 V60 H14Z') +
    P('paper', 'M15 44 L19 52 L23 44 L27 54 L31 44 L35 52 L39 44 L43 53 L47 44 L53 44 L57 53 L61 44 L65 52 L69 44 L73 54 L77 44 L81 52 L85 44Z') +
    P('paper', 'M16 60 L20 53 L24 60 L28 51.6 L32 60 L36 54 L40 60 L60 60 L64 54 L68 60 L72 51.6 L76 60 L80 53 L84 60Z');
  const base = P('ink', 'M12 58 H88 V92 H12Z') +
    cut('M14 61 H86', 1.6) + cut('M24 62 V90 M76 62 V90', 2.6) +
    P('pi', 'M44 62 H56 V74 C56 76 44 76 44 74Z', ' stroke-width="1"') + P('ink', 'M50 65 C48.6 65 48.4 67.6 49.4 68 L49 71.6 H51 L50.6 68 C51.6 67.6 51.4 65 50 65Z') +
    cut('M14 88 H86', 1.1);
  const tongue = g('a-limb', P('acc', 'M42 54 C44 64 34 72 36 82 C38 92 50 94 52 86 C53 80 48 78 50 72 C52 66 58 62 58 54 Z') +
    ln('M42 54 C44 64 34 72 36 82 C38 92 50 94 52 86 C53 80 48 78 50 72 C52 66 58 62 58 54', 1.4) +
    ln('M48 58 C47 64 44 70 43 78', 1.1), ' style="transform-origin:50% 0%"');
  const bone1 = bone('M76 51 L90 46', 2.6) + C('pi', 91, 45, 2, ' stroke-width="1"') + C('pi', 91.6, 47.6, 2, ' stroke-width="1"');
  const coins = C('pi', 14, 94, 3.4, ' stroke-width="1.2"') + C('pi', 22, 96, 3, ' stroke-width="1.2"') + C('pi', 84, 95, 3.2, ' stroke-width="1.2"') +
    ln('M12.6 94 H15.4 M82.6 95 H85.4', 0.9);
  return svg('art-boss art-mimic', g('a-body', inside + base + lid + bone1 + tongue + eyes) + coins);
}

function bat(x: number, y: number, s: number, rot: number, withEyes: boolean): string {
  const shape = P('ink', 'M0 -3.4 L-1.4 -2.4 L-8 -7.4 L-17 -3 Q-14 -2 -13 1.2 Q-10 -1 -8 2.2 Q-5 0 -2.2 3.4 L0 4.4 L2.2 3.4 Q5 0 8 2.2 Q10 -1 13 1.2 Q14 -2 17 -3 L8 -7.4 L1.4 -2.4 Z') +
    P('ink', 'M-2.6 -1.6 L-2.8 -6.8 L-0.6 -3.6 L0.6 -3.6 L2.8 -6.8 L2.6 -1.6 C2 1.4 -2 1.4 -2.6 -1.6Z');
  const eyes = withEyes ? g('a-eyes', C('acc', -1.1, -2.2, 0.75) + C('acc', 1.1, -2.2, 0.75)) +
    cut('M-7.6 -6 L-3 -2 M7.6 -6 L3 -2 M-12 -2.4 L-8.6 0.4 M12 -2.4 L8.6 0.4', 0.5) : '';
  return g('', shape + eyes, at(x, y, s, rot));
}

function swarm(): string {
  const swirl = ln('M14 60 C10 34 34 14 60 18 C82 22 92 44 84 62 C76 80 50 86 34 76', 1.2, ' stroke-dasharray="5 3"') +
    ln('M26 70 C18 52 30 30 52 30 C70 30 80 46 74 60', 1, ' stroke-dasharray="3 3"');
  const small: Array<[number, number, number, number]> = [
    [16, 22, 0.5, -20], [30, 12, 0.42, 10], [48, 8, 0.5, -6], [68, 10, 0.55, 14], [84, 20, 0.5, 24],
    [90, 38, 0.6, 30], [10, 42, 0.62, -26], [88, 58, 0.5, 18], [80, 74, 0.66, -10], [64, 86, 0.48, 6],
    [44, 90, 0.56, -14], [24, 84, 0.6, 12], [12, 66, 0.46, -8], [30, 32, 0.4, -18], [72, 32, 0.42, 20],
    [26, 50, 0.72, -12], [76, 48, 0.74, 14], [40, 72, 0.7, 8], [62, 70, 0.66, -10], [56, 24, 0.36, 0],
  ];
  const flock = small.map(([x, y, s, r]) => bat(x, y, s, r, false)).join('');
  return svg('art-boss art-swarm', swirl + g('a-body', flock + bat(50, 50, 2.1, 0, true)));
}

export function bossArt(key: BossKey): string {
  switch (key) {
    case 'warden': return warden();
    case 'leech': return leech();
    case 'rust': return rustking();
    case 'crown': return hollowCrown();
    case 'mimic': return mimic();
    case 'swarm': return swarm();
  }
}

// ---------------------------------------------------------------- relic icons (24x24)

const RELICS: Record<RelicKey, string> = {
  whetstone:
    P('ink', 'M1.6 17.4 L5 13 H22 L19.6 21.6 H3Z') + cut('M5.4 15.6 H19.6 M4.6 18.8 H18', 0.9) +
    P('pi', 'M3 11.6 L17.6 3.4 L20.6 2.6 L19.6 5 L5 13.4 Z', ' stroke-width="1.1"') +
    ln('M3.6 12.2 L1.4 13.6', 2.4) +
    ln('M21 8 L23 7 M20 10.6 L22.6 11.4 M17.4 9.4 L18 11.6', 1.1),
  trophy:
    P('ink', 'M5 13 H19 V19 L12 23.4 L5 19Z') + cut('M7 15 H17', 0.8) +
    ln('M8 10 C5 8 3 5 3.4 1.4 M5 6 L1.4 5.4 M16 10 C19 8 21 5 20.6 1.4 M19 6 L22.6 5.4', 1.7) +
    P('pi', 'M8.2 10.6 C8.2 6.6 15.8 6.6 15.8 10.6 C15.8 12.6 14.6 13.4 14.4 14.6 L14.4 16.6 L9.6 16.6 L9.6 14.6 C9.4 13.4 8.2 12.6 8.2 10.6Z', ' stroke-width="1"') +
    C('ink', 10.4, 11, 1.2) + C('ink', 13.6, 11, 1.2),
  cloak:
    P('ink', 'M12 1.4 C7.6 1.4 5.6 5 5.6 9 C5.6 13 4 18 1.6 22.6 L22.4 22.6 C20 18 18.4 13 18.4 9 C18.4 5 16.4 1.4 12 1.4Z') +
    P('paper', 'M12 4.6 C9.4 4.6 8.4 7 8.4 9.4 C8.4 11.4 10 13 12 13 C14 13 15.6 11.4 15.6 9.4 C15.6 7 14.6 4.6 12 4.6Z') +
    E('ink', 12, 9.8, 2.6, 2.6) + cut('M9 16 L7 21.4 M15 16 L17 21.4 M12 15.6 V21.4', 0.9),
  blood:
    P('acc', 'M12 1.6 C9 7 5 11 5 15.4 C5 19.4 8.2 22.4 12 22.4 C15.8 22.4 19 19.4 19 15.4 C19 11 15 7 12 1.6Z') +
    ln('M12 1.6 C9 7 5 11 5 15.4 C5 19.4 8.2 22.4 12 22.4 C15.8 22.4 19 19.4 19 15.4 C19 11 15 7 12 1.6Z', 1.3) +
    cut('M8.4 15 C8.4 17.6 9.8 19.2 11.6 19.6', 1.4),
  packrat:
    P('ink', 'M3 11 C3 8 5 7 12 7 C19 7 21 8 21 11 V20.6 C21 21.8 20 22.6 18.8 22.6 H5.2 C4 22.6 3 21.8 3 20.6Z') +
    cut('M3.6 12.6 C7 14.6 17 14.6 20.4 12.6', 1.1) + P('paper', 'M10.4 13.4 H13.6 V16.8 H10.4Z') + C('ink', 12, 15.1, 0.7) +
    cut('M6.4 17 V21 M17.6 17 V21', 0.8) +
    P('ink', 'M6 8 C6 4.6 8.6 2.4 11 2.6 L16.6 1 L14.6 4 C15.6 5 15.8 6.6 15.4 8Z') +
    C('ink', 8.4, 3, 2) + cut('M7.6 2.4 A1 1 0 0 1 9 2.2', 0.7) + C('acc', 12.6, 3.6, 0.8) +
    ln('M21 18 C23.4 17 23.6 14 21.6 12.6', 1.1),
  duelist:
    ln('M4 20 L20 3 M20 20 L4 3', 1.6) +
    ln('M2.4 18.4 L5.6 21.6 M21.6 18.4 L18.4 21.6', 2) +
    C('line', 5.6, 18.4, 2.6, ' stroke-width="1.3"') + C('line', 18.4, 18.4, 2.6, ' stroke-width="1.3"') +
    C('ink', 2.6, 21.4, 1.4) + C('ink', 21.4, 21.4, 1.4),
  exec:
    ln('M8 22.4 L17 3', 2.4) +
    P('ink', 'M14.6 2 C10 1.4 5 3 2.6 6.6 C1.6 10 3 13.4 5.6 15 C7 11.6 10 9 13.6 8.6Z') +
    cut('M3.8 7 C3 9.6 3.6 11.6 5.2 13', 1) +
    P('acc', 'M3 12 C2.4 13.4 2.6 14.6 3.4 15.2 C4.2 14.6 4.2 13.4 3 12Z'),
  hoarder:
    E('pi', 7, 19.4, 5, 2.2, ' stroke-width="1.1"') + E('pi', 16.4, 20, 5, 2.2, ' stroke-width="1.1"') +
    E('pi', 11.6, 16.4, 5, 2.2, ' stroke-width="1.1"') + E('pi', 12.4, 12.8, 5, 2.2, ' stroke-width="1.1"') +
    E('pi', 11.6, 9.2, 5, 2.2, ' stroke-width="1.1"') +
    C('pi', 18, 7, 3.6, ' stroke-width="1.2"') + ln('M18 5 V9', 1.2) + ln('M3 4 L4.4 5.4 M6 2 V4', 1),
  irongut:
    P('ink', 'M5 3 H19 L20 8 C21.6 10 22 14 20.6 17 C19 21 15.6 22.6 12 22.6 C8.4 22.6 5 21 3.4 17 C2 14 2.4 10 4 8Z') +
    P('paper', 'M8 3 C8 5.6 9.8 7 12 7 C14.2 7 16 5.6 16 3Z') +
    cut('M12 9 V21 M6 12 C6 16 8 19.6 11 20.6', 1.1) +
    C('paper', 6.4, 9.6, 0.9) + C('paper', 17.6, 9.6, 0.9) + C('paper', 9, 18.6, 0.8) + C('paper', 15, 18.6, 0.8),
  scavenger:
    P('ink', 'M3 9 L7 7.6 C8 5 10.4 3.4 13 4 C16 4.8 17 8 16.6 10.6 L22.6 15.6 L15 14.6 C13.6 16.4 10.6 17 8.6 15.6 L8 10.4 L5.2 10.4Z') +
    ln('M11 16 L10 19.4 M13 16 L13 19.4', 1.1) + C('acc', 11, 7.2, 0.9) +
    cut('M11.6 11 C13.6 12 15.6 11.6 17.4 12.4', 0.8) +
    bone('M3 21 L21 21', 1.4) + C('pi', 2.6, 20.2, 1.2, ' stroke-width=".7"') + C('pi', 21.4, 20.2, 1.2, ' stroke-width=".7"'),
  glass:
    P('pi', 'M12 1 L15.4 5 L15.4 16 L8.6 16 L8.6 5 Z', ' stroke-width="1.3"') +
    ln('M12 3 L10.4 7 L13 9.6 L11 13 M13 9.6 L15 10.6', 0.8) +
    P('ink', 'M5 16 H19 V18.4 H5Z') + P('ink', 'M10.6 18 H13.4 V22 H10.6Z') + C('acc', 12, 22.6, 1.4) +
    P('pi', 'M18.4 3 L20.6 4.6 L19 6Z M3.4 8 L5.6 9 L4 10.6Z', ' stroke-width=".7"'),
  bloodletter:
    P('ink', 'M5 11 C5 8 7 7 8.4 7.6 C8.6 6 11 5.4 12.2 6.4 C13 5.2 15.4 5.2 16.2 6.6 C17.4 6 19.4 6.8 19.4 8.8 V15 C19.4 19.6 16.6 22.6 12 22.6 C8 22.6 5 20 5 16Z') +
    cut('M8.4 8 V12 M12.2 6.8 V11.4 M16.2 7.2 V11.4 M5.6 12.6 C8 13.4 11 13.4 13 12.6', 0.9) +
    P('acc', 'M9.8 1 C9 2.6 8.8 3.8 9.8 4.4 C10.8 3.8 10.6 2.6 9.8 1Z M15.4 1.6 C14.8 2.8 14.8 3.6 15.4 4 C16 3.6 16 2.8 15.4 1.6Z') +
    P('acc', 'M3 14 C2.2 15.6 2.2 16.8 3 17.4 C3.8 16.8 3.8 15.6 3 14Z'),
  tooth:
    P('pi', 'M5.4 4 C7.6 2.4 9.6 3.6 12 3.6 C14.4 3.6 16.4 2.4 18.6 4 C21 6 19.6 10.6 18.2 13 C17 15.4 17 20 15.2 21.6 C13.8 22.8 13 19 12 16.4 C11 19 10.2 22.8 8.8 21.6 C7 20 7 15.4 5.8 13 C4.4 10.6 3 6 5.4 4Z', ' stroke-width="1.4"') +
    P('hatch-s', 'M12 4.2 C14.4 4.2 16.4 3 18 4.4 C20 6 19 10.4 17.6 12.6 C16.6 14.8 16.4 18.6 15 20.6 C14 18 13 16 12 16.4Z') +
    cut('M8 6 C7 7 7 9 7.6 10.4', 1.2) +
    ln('M20.6 1.4 V4.6 M19 3 H22.2', 0.9),
};

export function relicIcon(key: RelicKey): string {
  return svg(`relic relic-${key}`, RELICS[key], '0 0 24 24');
}
