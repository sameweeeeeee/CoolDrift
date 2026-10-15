// chatbot.ts — a simple RULE-BASED chatbot (no AI, no internet, free).
// How it works:
//   1. Look for keywords in the question (in English, Chinese, Malay or Tamil).
//   2. Pick the matching "intent" (what the user wants).
//   3. Build the answer from the LIVE heat data.
// To teach it something new: add a new intent + keywords below, and an answer.

import { t, tList } from '../i18n';
import { HeatReading, RiskLevel } from './weather';
import { nearestSpot } from './coolSpots';
import { LatLng, formatDistance } from '../utils/geo';

type Intent = 'emergency' | 'safe' | 'nearest' | 'temp' | 'water' | 'route' | 'tips' | 'hello';

// Keywords for each intent. Order matters: emergency is checked first.
const KEYWORDS: [Intent, string[]][] = [
  ['emergency', ['dizzy', 'faint', 'unwell', 'sick', 'ambulance', 'heatstroke', '头晕', '不舒服', 'pening', 'sakit', 'தலைசுற்ற']],
  ['nearest', ['nearest', 'near', 'where', 'cool place', 'rest', 'shelter', 'aircon', '最近', '哪里', '清凉', 'terdekat', 'mana', 'அருகில்', 'எங்கே']],
  ['safe', ['safe', 'go out', 'outside', 'walk', 'exercise', '安全', '出门', 'selamat', 'keluar', 'பாதுகாப்']],
  ['temp', ['hot', 'temperature', 'weather', 'humid', 'degree', '多热', '温度', '天气', 'panas', 'suhu', 'சூடு', 'வெப்பநிலை']],
  ['water', ['water', 'drink', 'thirsty', '喝水', '水', 'air', 'minum', 'தண்ணீர்']],
  ['route', ['route', 'way', 'go to', 'get to', 'directions', '路线', '怎么去', 'laluan', 'jalan', 'வழி']],
  ['tips', ['what should', 'tip', 'advice', 'do', '怎么做', '建议', 'nasihat', 'buat', 'என்ன செய்']],
  ['hello', ['hi', 'hello', 'hey', '你好', 'helo', 'hai', 'வணக்கம்']],
];

/** Finds which intent a question matches, or null if none. */
export function detectIntent(question: string): Intent | null {
  const q = question.toLowerCase();
  for (const [intent, words] of KEYWORDS) {
    if (words.some((w) => matches(q, w))) return intent;
  }
  return null;
}

/**
 * English/Malay words must match as WHOLE words (so "hi" doesn't match "this").
 * Chinese and Tamil don't use spaces between words, so we just search inside the text.
 */
function matches(text: string, word: string): boolean {
  if (/^[a-z ]+$/.test(word)) return new RegExp(`\\b${word}\\b`).test(text);
  return text.includes(word);
}

type ChatContext = { reading: HeatReading | null; risk: RiskLevel | null; location: LatLng };

/** Returns the bot's reply to a question. */
export function answer(question: string, ctx: ChatContext): string {
  const intent = detectIntent(question);
  const levelText = ctx.risk ? t(`risk.${ctx.risk}`) : '?';

  switch (intent) {
    case 'emergency':
      return t('chat.a.emergency');
    case 'safe':
      return ctx.risk ? t(`chat.a.safe_${ctx.risk}`) : t('chat.a.noData');
    case 'nearest': {
      const spot = nearestSpot(ctx.location);
      return t('chat.a.nearest', {
        name: spot.name,
        type: t(`spots.types.${spot.type}`),
        dist: formatDistance(spot.distance),
        note: spot.note ?? '',
      });
    }
    case 'temp':
      if (!ctx.reading || ctx.reading.temperature === undefined) return t('chat.a.noData');
      return t('chat.a.temp', {
        station: ctx.reading.stationName ?? 'Singapore',
        temp: ctx.reading.temperature,
        hum: ctx.reading.humidity ?? '?',
        level: levelText,
      });
    case 'water':
      return t('chat.a.water');
    case 'route':
      return t('chat.a.route');
    case 'tips': {
      if (!ctx.risk) return t('chat.a.noData');
      const tips = tList(`tips.${ctx.risk}`);
      return `${t('risk.title')}: ${levelText}.\n• ${tips.join('\n• ')}`;
    }
    case 'hello':
      return t('chat.a.hello');
    default:
      return t('chat.a.unknown');
  }
}

