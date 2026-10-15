// theme.ts — all the app's colours, sizes, shadows and gradients in ONE place.
// Calm green + white, with strong contrast so text is easy to read outdoors.

export const colors = {
  primary: '#1B7A43', // deep green (buttons, headers)
  primaryDark: '#0F5530',
  primaryLight: '#E3F3E9', // pale green (highlights)
  background: '#EEF6F1', // soft mint page background
  white: '#FFFFFF',
  text: '#10231A', // almost black, high contrast on white
  textMuted: '#4A5E53',
  border: '#D3E6DA',

  // Heat-risk colours (also used for the crowdsourced heat map)
  low: '#1B7A43', // green
  moderate: '#B86E00', // dark amber (still readable with white text)
  high: '#C62828', // red

  // Cooling type colours (pins, badges, filter buttons). All readable with white text.
  aircon: '#1565C0', // blue = cold
  shaded: '#8A5300', // warm brown = roof / umbrella
  green: '#2E7D32', // leafy green

  // Route colours
  coolRoute: '#1B7A43',
  fastRoute: '#6B7C73',
};

export const riskColor = {
  low: colors.low,
  moderate: colors.moderate,
  high: colors.high,
} as const;

export const coolingColor = {
  aircon: colors.aircon,
  shaded: colors.shaded,
  green: colors.green,
} as const;

/** Light tints of the cooling colours, for soft backgrounds behind icons. */
export const coolingTint = {
  aircon: '#E3EEFB',
  shaded: '#F6ECDD',
  green: '#E4F2E5',
} as const;

// Gradients: [start colour, end colour]. Used for the header, buttons and the heat meter.
// The light end is still dark enough for white text to be readable.
export const gradients = {
  header: ['#0F5530', '#1B7A43', '#238A55'] as const,
  primary: ['#1E8A4C', '#156B3A'] as const,
  danger: ['#D32F2F', '#A31515'] as const,
  low: ['#146B39', '#239158'] as const,
  moderate: ['#9A5A00', '#C77800'] as const,
  high: ['#A31515', '#D32F2F'] as const,
};

// Shadows make cards "float" above the page, so the design doesn't look flat.
// (boxShadow works on iOS, Android and the web.)
export const shadow = {
  card: '0px 6px 18px rgba(16, 70, 40, 0.10)',
  raised: '0px 10px 24px rgba(16, 70, 40, 0.18)',
  button: '0px 4px 12px rgba(16, 90, 50, 0.28)',
};

// Rounded corners
export const radius = {
  card: 22,
  button: 16,
  pill: 999,
};

// Base font sizes. These are multiplied by 1.35 in large-text / senior mode.
export const fontSize = {
  small: 15,
  body: 18,
  large: 22,
  title: 28,
  huge: 44,
};

// Minimum height for anything you can tap. 56+ is easy for older fingers.
export const touchSize = 56;
