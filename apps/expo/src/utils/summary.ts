// summary.ts — builds the sentence that is read aloud by "Read aloud".

import { t, tList } from '../i18n';
import { RiskLevel } from '../services/weather';
import { nearestSpot } from '../services/coolSpots';
import { LatLng, formatDistance } from './geo';

export function spokenSummary(risk: RiskLevel, location: LatLng): string {
  const spot = nearestSpot(location);
  return [
    t('speech.summary', { level: t(`risk.${risk}`) }),
    ...tList(`tips.${risk}`),
    t('speech.nearest', { name: spot.name, dist: formatDistance(spot.distance) }),
  ].join(' ');
}

/** "2026-10-15T09:45:00+08:00" → "9:45 AM" */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
