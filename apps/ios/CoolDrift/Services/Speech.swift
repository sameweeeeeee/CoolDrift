// Speech.swift — reads text out loud with the phone's built-in voice.
// Free and works offline. If the phone has no voice for a language (e.g. Tamil),
// it uses its default voice.

import AVFoundation

enum Speech {
    private static let synth = AVSpeechSynthesizer()

    static func speak(_ text: String, language: Language) {
        synth.stopSpeaking(at: .immediate) // stop anything already being read
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: language.speechCode)
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate * 0.9 // a bit slower = clearer
        synth.speak(utterance)
    }
}
