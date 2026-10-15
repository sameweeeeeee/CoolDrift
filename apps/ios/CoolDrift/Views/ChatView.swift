// ChatView.swift — a simple chat. Answers come from rules in Chatbot.swift using the
// live heat data. Quick-question buttons help people who don't want to type.
// Tap any bot message to hear it read aloud.

import SwiftUI

struct ChatView: View {
    @Environment(SettingsStore.self) private var settings
    @Environment(HeatStore.self) private var heat

    private struct Message: Identifiable {
        let id = UUID()
        let fromBot: Bool
        let text: String
    }

    @State private var messages: [Message] = []
    @State private var input = ""
    @FocusState private var typing: Bool

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 10) {
                    bubble(Message(fromBot: true, text: t("chat.welcome")))
                    ForEach(messages) { bubble($0).id($0.id) }
                }
                .padding(16)
            }
            .scrollDismissesKeyboard(.interactively)
            .onChange(of: messages.count) {
                withAnimation { proxy.scrollTo(messages.last?.id, anchor: .bottom) }
            }
        }
        .background(Theme.background)
        .safeAreaInset(edge: .bottom) { composer }
    }

    private var canSend: Bool { !input.trimmingCharacters(in: .whitespaces).isEmpty }

    /// Quick questions + a glass text field with the send button inside it.
    /// It floats over the messages; the chips hide while you type.
    private var composer: some View {
        VStack(spacing: 10) {
            if !typing {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(["safe", "nearest", "temp", "tips"], id: \.self) { key in
                            Button(t("chat.q.\(key)")) { ask(t("chat.q.\(key)")) }
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(Theme.primary)
                                .glassButton()
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 2)
                }
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }

            HStack(alignment: .center, spacing: 8) {
                TextField(t("chat.placeholder"), text: $input)
                    .focused($typing)
                    .submitLabel(.send)
                    .onSubmit { ask(input) }
                    .padding(.leading, 18)
                    .padding(.vertical, 12)

                Button {
                    ask(input)
                } label: {
                    Image(systemName: "arrow.up")
                        .font(.body.weight(.bold))
                        .foregroundStyle(.white)
                        .frame(width: 36, height: 36)
                        .background(canSend ? Theme.primary : Color.gray.opacity(0.35), in: Circle())
                }
                .buttonStyle(.plain)
                .disabled(!canSend)
                .padding(.trailing, 6)
                .accessibilityLabel(t("chat.send"))
            }
            .glassBackground(in: Capsule())
            .padding(.horizontal, 16)
        }
        .padding(.bottom, 8)
        .animation(.snappy(duration: 0.25), value: typing)
        .animation(.snappy(duration: 0.2), value: canSend)
    }

    private func bubble(_ m: Message) -> some View {
        HStack {
            if !m.fromBot { Spacer(minLength: 40) }
            VStack(alignment: .trailing, spacing: 4) {
                Text(m.text)
                    .frame(maxWidth: .infinity, alignment: .leading)
                if m.fromBot {
                    Image(systemName: "speaker.wave.2.fill").font(.footnote).foregroundStyle(Theme.primary)
                }
            }
            .fixedSize(horizontal: false, vertical: true)
            .padding(12)
            .foregroundStyle(m.fromBot ? Theme.text : .white)
            .background(m.fromBot ? Color.white : Theme.primary, in: RoundedRectangle(cornerRadius: 16))
            .overlay {
                if m.fromBot { RoundedRectangle(cornerRadius: 16).stroke(Theme.border) }
            }
            .onTapGesture {
                if m.fromBot { Speech.speak(m.text, language: settings.value.language) }
            }
            if m.fromBot { Spacer(minLength: 40) }
        }
    }

    private func ask(_ question: String) {
        let q = question.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !q.isEmpty else { return }
        let reply = Chatbot.answer(
            q,
            reading: heat.reading,
            risk: heat.risk(demoHigh: settings.value.demoHigh),
            location: heat.location
        )
        messages.append(Message(fromBot: false, text: q))
        messages.append(Message(fromBot: true, text: reply))
        input = ""
        if settings.value.seniorMode { Speech.speak(reply, language: settings.value.language) } // seniors hear every answer
    }
}
