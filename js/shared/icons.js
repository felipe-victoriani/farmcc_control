/**
 * @file svg-icons.js
 * @description Biblioteca de ícones SVG inline — estilo outline.
 * Todos os ícones são paths SVG originais (stroke, fill="none").
 * Uso: Icons.dashboard, Icons.medications, etc.
 */

/** @type {Object.<string, string>} */
export const Icons = {
  // Navegação / Dashboard
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="8" height="8" rx="1.5"/>
    <rect x="13" y="3" width="8" height="8" rx="1.5"/>
    <rect x="3" y="13" width="8" height="8" rx="1.5"/>
    <rect x="13" y="13" width="8" height="8" rx="1.5"/>
  </svg>`,

  medications: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10.5 5.5 A4.5 4.5 0 0 0 5.5 10.5 L13.5 18.5 A4.5 4.5 0 0 0 18.5 13.5 Z"/>
    <line x1="8.5" y1="12.5" x2="15.5" y2="11.5"/>
    <path d="M17 3 C19.8 3 22 5.2 22 8 S19.8 13 17 13"/>
  </svg>`,

  pill: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10.5 20.5 A6 6 0 0 1 3.5 13.5 L13.5 3.5 A6 6 0 0 1 20.5 10.5 Z"/>
    <line x1="9" y1="15" x2="15" y2="9"/>
  </svg>`,

  movements: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M7 16 L3 12 L7 8"/>
    <path d="M3 12 L13 12"/>
    <path d="M17 8 L21 12 L17 16"/>
    <path d="M21 12 L11 12"/>
  </svg>`,

  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 19.5 A2.5 2.5 0 0 1 6.5 17 H20"/>
    <path d="M6.5 2 H20 V22 H6.5 A2.5 2.5 0 0 1 4 19.5 V4.5 A2.5 2.5 0 0 1 6.5 2 Z"/>
    <line x1="8" y1="7" x2="16" y2="7"/>
    <line x1="8" y1="11" x2="16" y2="11"/>
    <line x1="8" y1="15" x2="12" y2="15"/>
  </svg>`,

  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="7"/>
    <line x1="16.5" y1="16.5" x2="21" y2="21"/>
  </svg>`,

  patients: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="9" cy="7" r="3.5"/>
    <path d="M2 21 C2 17.1 5.1 14 9 14 S16 17.1 16 21"/>
    <path d="M19 8 L19 14 M16 11 L22 11"/>
  </svg>`,

  calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
    <rect x="7" y="14" width="3" height="3" rx="0.5"/>
    <rect x="14" y="14" width="3" height="3" rx="0.5"/>
  </svg>`,

  expiry: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <polyline points="12 7 12 12 15 15"/>
    <line x1="12" y1="3" x2="12" y2="1"/>
  </svg>`,

  trash2: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6 L18.2 19 A2 2 0 0 1 16.2 21 H7.8 A2 2 0 0 1 5.8 19 L5 6"/>
    <path d="M10 11 L10 17 M14 11 L14 17"/>
    <path d="M9 6 V4 A1 1 0 0 1 10 3 H14 A1 1 0 0 1 15 4 V6"/>
  </svg>`,

  reports: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 2 H6 A2 2 0 0 0 4 4 V20 A2 2 0 0 0 6 22 H18 A2 2 0 0 0 20 20 V8 Z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <line x1="10" y1="9" x2="8" y2="9"/>
  </svg>`,

  compliance: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2 L15.09 8.26 L22 9.27 L17 14.14 L18.18 21.02 L12 17.77 L5.82 21.02 L7 14.14 L2 9.27 L8.91 8.26 Z"/>
  </svg>`,

  audit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 11 L12 14 L22 4"/>
    <path d="M21 12 V19 A2 2 0 0 1 19 21 H5 A2 2 0 0 1 3 19 V5 A2 2 0 0 1 5 3 H16"/>
  </svg>`,

  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15 A1.65 1.65 0 0 0 19.9 16.7 L20 16.8 A2 2 0 0 1 17.2 20.6 L17.1 20.5 A1.65 1.65 0 0 0 15.4 20 H14.6 A1.65 1.65 0 0 0 13 20.5 L12.9 20.6 A2 2 0 0 1 9.1 17.8 L9.2 17.7 A1.65 1.65 0 0 0 9.7 16 L9.7 15.2 A1.65 1.65 0 0 0 9.2 13.5 L9.1 13.4 A2 2 0 0 1 11.9 9.6 L12 9.7 A1.65 1.65 0 0 0 13.7 10.2 H14.5 A1.65 1.65 0 0 0 16.2 9.7 L16.3 9.6 A2 2 0 0 1 20.1 12.4 L20 12.5 A1.65 1.65 0 0 0 19.5 14.2 Z"/>
  </svg>`,

  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17 21 V19 A4 4 0 0 0 13 15 H5 A4 4 0 0 0 1 19 V21"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21 V19 A4 4 0 0 0 17 15.13"/>
    <path d="M16 3.13 A4 4 0 0 1 16 10.87"/>
  </svg>`,

  logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 21 H5 A2 2 0 0 1 3 19 V5 A2 2 0 0 1 5 3 H9"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>`,

  bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 8 A6 6 0 0 0 6 8 C6 15 3 17 3 17 H21 S18 15 18 8"/>
    <path d="M13.73 21 A2 2 0 0 1 10.27 21"/>
  </svg>`,

  filter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>`,

  download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15 V19 A2 2 0 0 1 19 21 H5 A2 2 0 0 1 3 19 V15"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>`,

  print: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18 H4 A2 2 0 0 1 2 16 V11 A2 2 0 0 1 4 9 H20 A2 2 0 0 1 22 11 V16 A2 2 0 0 1 20 18 H18"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>`,

  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>`,

  minus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>`,

  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 4 H4 A2 2 0 0 0 2 6 V20 A2 2 0 0 0 4 22 H18 A2 2 0 0 0 20 20 V13"/>
    <path d="M18.5 2.5 A2.121 2.121 0 0 1 21.5 5.5 L12 15 L8 16 L9 12 Z"/>
  </svg>`,

  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M1 12 S5 4 12 4 S23 12 23 12 S19 20 12 20 S1 12 1 12 Z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>`,

  eyeOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17.94 17.94 A10.07 10.07 0 0 1 12 20 C7 20 2.73 16.39 1 12 A18.45 18.45 0 0 1 5.06 5.06"/>
    <path d="M9.9 4.24 A9.12 9.12 0 0 1 12 4 C17 4 21.27 7.61 23 12 A18.5 18.5 0 0 1 20.66 16.07"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
    <path d="M14.12 14.12 A3 3 0 0 1 9.88 9.88"/>
  </svg>`,

  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>`,

  xClose: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>`,

  alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10.29 3.86 L1.82 18 A2 2 0 0 0 3.54 21 H20.46 A2 2 0 0 0 22.18 18 L13.71 3.86 A2 2 0 0 0 10.29 3.86 Z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>`,

  arrowRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>`,

  arrowLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>`,

  chevronDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>`,

  chevronRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>`,

  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11 V7 A5 5 0 0 1 17 7 V11"/>
    <circle cx="12" cy="16" r="1"/>
  </svg>`,

  unlock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11 V7 A5 5 0 0 1 17 7"/>
    <circle cx="12" cy="16" r="1"/>
  </svg>`,

  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <polyline points="12 7 12 12 15 15"/>
  </svg>`,

  temperature: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 14.76 V5 A2 2 0 0 0 10 5 V14.76 A3.5 3.5 0 1 0 14 14.76 Z"/>
    <line x1="10" y1="9" x2="8" y2="9"/>
    <line x1="10" y1="12" x2="8" y2="12"/>
  </svg>`,

  package: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
    <path d="M21 16 V8 A2 2 0 0 0 20 6.27 L12 2 L4 6.27 A2 2 0 0 0 3 8 V16 A2 2 0 0 0 4 17.73 L12 22 L20 17.73 A2 2 0 0 0 21 16 Z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>`,

  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 22 S20 18 20 12 V5 L12 2 L4 5 V12 C4 18 12 22 12 22 Z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>`,

  fileText: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 2 H6 A2 2 0 0 0 4 4 V20 A2 2 0 0 0 6 22 H18 A2 2 0 0 0 20 20 V8 Z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>`,

  barChart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
    <line x1="2" y1="20" x2="22" y2="20"/>
  </svg>`,

  activity: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>`,

  inbox: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
    <path d="M5.45 5.11 L2 12 V20 A2 2 0 0 0 4 22 H20 A2 2 0 0 0 22 20 V12 L18.55 5.11 A2 2 0 0 0 16.76 4 H7.24 A2 2 0 0 0 5.45 5.11 Z"/>
  </svg>`,

  loading: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="animate-spin">
    <circle cx="12" cy="12" r="9" stroke-opacity="0.25"/>
    <path d="M12 3 A9 9 0 0 1 21 12" stroke-opacity="1"/>
  </svg>`,

  checkCircle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 11.08 V12 A10 10 0 1 1 15.39 4.63"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>`,

  xCircle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  </svg>`,

  alertTriangle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10.29 3.86 L1.82 18 A2 2 0 0 0 3.54 21 H20.46 A2 2 0 0 0 22.18 18 L13.71 3.86 A2 2 0 0 0 10.29 3.86 Z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>`,

  infoCircle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>`,

  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>`,

  waste: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 6 H5 H21"/>
    <path d="M8 6 V4 A1 1 0 0 1 9 3 H15 A1 1 0 0 1 16 4 V6 M19 6 L18.2 19 A2 2 0 0 1 16.2 21 H7.8 A2 2 0 0 1 5.8 19 L5 6 H19 Z"/>
    <path d="M10 11 L10 17 M14 11 L14 17"/>
  </svg>`,

  hospital: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 9 L12 2 L21 9 V20 A2 2 0 0 1 19 22 H5 A2 2 0 0 1 3 20 Z"/>
    <line x1="9" y1="22" x2="9" y2="12"/>
    <line x1="15" y1="22" x2="15" y2="12"/>
    <line x1="9" y1="12" x2="15" y2="12"/>
    <line x1="12" y1="6" x2="12" y2="9"/>
    <line x1="10.5" y1="7.5" x2="13.5" y2="7.5"/>
  </svg>`,

  clipboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 4 H18 A2 2 0 0 1 20 6 V20 A2 2 0 0 1 18 22 H6 A2 2 0 0 1 4 20 V6 A2 2 0 0 1 6 4 H8"/>
    <rect x="8" y="2" width="8" height="4" rx="1"/>
    <line x1="8" y1="12" x2="16" y2="12"/>
    <line x1="8" y1="16" x2="12" y2="16"/>
  </svg>`,

  tag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20.59 13.41 L13.42 20.58 A2 2 0 0 1 11 20.58 L3 13 V3 H13 L20.59 10.59 A2 2 0 0 1 20.59 13.41 Z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>`,

  hash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="4" y1="9" x2="20" y2="9"/>
    <line x1="4" y1="15" x2="20" y2="15"/>
    <line x1="10" y1="3" x2="8" y2="21"/>
    <line x1="16" y1="3" x2="14" y2="21"/>
  </svg>`,

  refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="1 4 1 10 7 10"/>
    <path d="M3.51 15 A9 9 0 1 0 5.63 5.36 L1 10"/>
  </svg>`,

  crosshair: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <line x1="12" y1="3" x2="12" y2="7"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
    <line x1="3" y1="12" x2="7" y2="12"/>
    <line x1="17" y1="12" x2="21" y2="12"/>
  </svg>`,

  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <line x1="12" y1="8" x2="12" y2="8.5"/>
    <line x1="12" y1="11" x2="12" y2="16"/>
  </svg>`,

  wifi: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M1.42 9 A16 16 0 0 1 22.58 9"/>
    <path d="M5 12.55 A11 11 0 0 1 19 12.55"/>
    <path d="M10.54 16 A6 6 0 0 1 13.46 16"/>
    <circle cx="12" cy="20" r="1" fill="currentColor"/>
  </svg>`,

  wifiOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="1" y1="1" x2="23" y2="23"/>
    <path d="M16.72 11.06 A10.94 10.94 0 0 1 19 12.55"/>
    <path d="M5 12.55 A11 11 0 0 1 15 11"/>
    <path d="M10.71 5.05 A16 16 0 0 1 22.56 9"/>
    <path d="M1.42 9 A15.94 15.94 0 0 1 5 12.04"/>
    <path d="M10.54 16 A6 6 0 0 1 13.46 16"/>
    <circle cx="12" cy="20" r="1" fill="currentColor"/>
  </svg>`,

  copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/>
    <path d="M5 15 H4 A2 2 0 0 1 2 13 V4 A2 2 0 0 1 4 2 H13 A2 2 0 0 1 15 4 V5"/>
  </svg>`,

  externalLink: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 13 V19 A2 2 0 0 1 16 21 H5 A2 2 0 0 1 3 19 V8 A2 2 0 0 1 5 6 H11"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>`,
};

/**
 * Cria um elemento span contendo o SVG do ícone especificado.
 * @param {string} name - Nome do ícone (chave em Icons)
 * @param {string} [className='icon'] - Classes CSS adicionais
 * @param {string} [ariaLabel=''] - Label acessível
 * @returns {string} HTML string do ícone
 */
export function icon(name, className = "icon", ariaLabel = "") {
  const svg = Icons[name];
  if (!svg) {
    console.warn(`[Icons] Ícone não encontrado: "${name}"`);
    return "";
  }
  const aria = ariaLabel
    ? `aria-label="${ariaLabel}" role="img"`
    : 'aria-hidden="true"';
  return `<span class="${className}" ${aria}>${svg}</span>`;
}

export default Icons;
