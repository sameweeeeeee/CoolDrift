// speech.ts — reads text out loud using the phone's built-in voice (expo-speech).
// Free and works offline. Some phones may not have a Tamil or Malay voice
// installed; then the phone uses its default voice.

import * as Speech from 'expo-speech';
import { Language, SPEECH_LANGUAGE } from '../i18n';

export function speak(text: string, language: Language) {
  Speech.stop(); // stop anything already being read
  Speech.speak(text, { language: SPEECH_LANGUAGE[language], rate: 0.9 }); // a bit slower = clearer
}

export function stopSpeaking() {
  Speech.stop();
}
