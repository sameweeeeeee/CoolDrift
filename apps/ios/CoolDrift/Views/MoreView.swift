// MoreView.swift — the "More" tab (far right). A short menu; each group of settings
// opens on its own page, so no single list gets too long:
//   Language · Display · Alerts & reminders · Demo · Privacy · Ask Siri · Coming soon
// Everything is saved on the phone automatically (see SettingsStore).

import SwiftUI

struct MoreView: View {
    @Environment(SettingsStore.self) private var settings

    var body: some View {
        List {
            Section(t("common.settings")) {
                NavigationLink {
                    LanguagePage()
                } label: {
                    row(t("settings.language"), icon: "globe", color: .blue, value: settings.value.language.label)
                }
                NavigationLink {
                    DisplayPage()
                } label: {
                    row(t("settings.display"), icon: "textformat.size", color: .indigo)
                }
                NavigationLink {
                    AlertsPage()
                } label: {
                    row(t("settings.alerts"), icon: "bell.badge.fill", color: Theme.risk(.high))
                }
                NavigationLink {
                    DemoPage()
                } label: {
                    row(t("settings.demo"), icon: "flask.fill", color: .orange)
                }
                NavigationLink {
                    PrivacyPage()
                } label: {
                    row(t("settings.privacyTitle"), icon: "hand.raised.fill", color: Theme.primary)
                }
            }

            Section {
                NavigationLink {
                    SiriPage()
                } label: {
                    row(t("more.siri"), icon: "mic.fill", color: .purple)
                }
            }

            Section(t("more.soonTitle")) {
                Label(t("more.soon"), systemImage: "sparkles")
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle(t("tabs.more"))
        .tint(Theme.primary)
    }

    /// A menu row with a coloured square icon, like the iPhone Settings app.
    private func row(_ title: String, icon: String, color: Color, value: String? = nil) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.white)
                .frame(width: 30, height: 30)
                .background(color, in: RoundedRectangle(cornerRadius: 7))
            Text(title)
            Spacer()
            if let value { Text(value).foregroundStyle(.secondary) }
        }
    }
}

// MARK: - Pages

private struct LanguagePage: View {
    @Environment(SettingsStore.self) private var settings

    var body: some View {
        @Bindable var settings = settings
        Form {
            Picker(t("settings.language"), selection: $settings.value.language) {
                ForEach(Language.allCases) { Text($0.label).tag($0) }
            }
            .pickerStyle(.inline)
            .labelsHidden()
        }
        .navigationTitle(t("settings.language"))
    }
}

private struct DisplayPage: View {
    @Environment(SettingsStore.self) private var settings

    var body: some View {
        @Bindable var settings = settings
        Form {
            Toggle(t("settings.largeText"), isOn: $settings.value.largeText)
            Toggle(isOn: $settings.value.seniorMode) {
                labelled(t("settings.seniorMode"), t("settings.seniorDesc"))
            }
        }
        .navigationTitle(t("settings.display"))
    }
}

private struct AlertsPage: View {
    @Environment(SettingsStore.self) private var settings
    @State private var notice: String?
    private static let intervals = [15, 20, 30, 45, 60] // minutes

    var body: some View {
        @Bindable var settings = settings
        Form {
            if let notice {
                Section { Text(notice).bold() }
            }
            Section {
                Toggle(isOn: $settings.value.highAlerts) {
                    labelled(t("settings.highAlert"), t("settings.highAlertDesc"))
                }
            }
            Section {
                Toggle(isOn: $settings.value.workerMode) {
                    labelled(t("settings.workerMode"), t("settings.workerDesc"))
                }
                if settings.value.workerMode {
                    Picker(t("settings.interval"), selection: $settings.value.workerInterval) {
                        ForEach(Self.intervals, id: \.self) { n in
                            Text(t("settings.minutes", ["n": n])).tag(n)
                        }
                    }
                    Button(t("settings.testReminder"), systemImage: "bell") {
                        Task {
                            if !(await Notifier.sendTestReminder()) { notice = t("settings.notifDenied") }
                        }
                    }
                }
            }
        }
        .navigationTitle(t("settings.alerts"))
        // Turning on an alert asks for notification permission first.
        .onChange(of: settings.value.highAlerts) { _, on in checkPermission(on) }
        .onChange(of: settings.value.workerMode) { _, on in checkPermission(on) }
    }

    private func checkPermission(_ turnedOn: Bool) {
        guard turnedOn else { return }
        Task {
            if !(await Notifier.ensurePermission()) { notice = t("settings.notifDenied") }
        }
    }
}

private struct DemoPage: View {
    @Environment(SettingsStore.self) private var settings
    @State private var cleared = false

    var body: some View {
        @Bindable var settings = settings
        Form {
            Toggle(isOn: $settings.value.demoHigh) {
                labelled(t("settings.demoHigh"), t("settings.demoDesc"))
            }
            Section {
                Button(t("settings.clearReports"), systemImage: "trash", role: .destructive) {
                    ReportStore.clear()
                    cleared = true
                }
            } footer: {
                if cleared { Text(t("settings.reportsCleared")) }
            }
        }
        .navigationTitle(t("settings.demo"))
    }
}

private struct PrivacyPage: View {
    var body: some View {
        Form {
            Text(t("settings.privacy"))
        }
        .navigationTitle(t("settings.privacyTitle"))
    }
}

/// Shows what to say to Siri (see App/Shortcuts.swift).
private struct SiriPage: View {
    var body: some View {
        Form {
            Section {
                Text(t("more.siriHint"))
                Label("“\(t("more.siriSafe"))”", systemImage: "thermometer.sun.fill")
                Label("“\(t("more.siriNearest"))”", systemImage: "map.fill")
            }
        }
        .navigationTitle(t("more.siri"))
    }
}

private func labelled(_ title: String, _ description: String) -> some View {
    VStack(alignment: .leading, spacing: 2) {
        Text(title)
        Text(description).font(.footnote).foregroundStyle(.secondary)
    }
}
