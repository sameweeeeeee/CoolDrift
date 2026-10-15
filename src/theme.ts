// theme.ts — all the app's colours and sizes in ONE place.
// Calm green + white, with strong contrast so text is easy to read outdoors.

export const colors = {
  primary: '#1B7A43', // deep green (buttons, headers)
  primaryDark: '#0F5530',
  primaryLight: '#E8F5EC', // pale green backgrounds
  white: '#FFFFFF',
  text: '#10231A', // almost black, high contrast on white
  textMuted: '#3E5247',
  border: '#B9D8C4',

  // Heat-risk colours (also used for the crowdsourced heat map)
  low: '#1B7A43', // green
  moderate: '#B86E00', // dark amber (still readable with white text)
  high: '#C62828', // red

  // Route colours
  coolRoute: '#1B7A43',
  fastRoute: '#6B7C73',
};

export const riskColor = {
  low: colors.low,
  moderate: colors.moderate,
  high: colors.high,
} as const;

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
