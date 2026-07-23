// Shared theme palette. Extracted from App.tsx so platform-split modules
// (e.g. src/TrailerPlayer.*) can reference the same colors without importing
// back from App.tsx (which would create an import cycle).
export const COLORS = {
  background: '#13002B', // Space purple
  primaryRed: '#E11D48', // Vibrant red
  gold: '#FACC15',       // Highlight yellow/gold
  textLight: '#F8FAFC',
  cardBg: '#1F0B3B',     // Dark purple
  blue: '#0EA5E9',       // Action blue
  darkBlue: '#0A192F',   // Deep blue
  borderDark: '#5B21B6', // Dark purple border
  marqueeBoard: '#F4EFE2',  // Off-white marquee letterboard
  marqueeRail: '#B8B0A0',   // Grey horizontal letter rails
  marqueeFrame: '#1A1A1A',  // Dark marquee frame
  marqueeInk: '#0B0B0B',    // Black marquee letters
};
