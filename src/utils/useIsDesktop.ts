// useIsDesktop.ts — true when the screen is wide (a computer or big tablet).
// Screens use it to switch to a side-by-side layout.

import { useWindowDimensions } from 'react-native';

export const DESKTOP_MIN_WIDTH = 900; // pixels

export function useIsDesktop(): boolean {
  const { width } = useWindowDimensions();
  return width >= DESKTOP_MIN_WIDTH;
}
