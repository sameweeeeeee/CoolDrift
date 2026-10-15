// MoreView.swift — the "More" tab (far right): all the settings (language, display,
// alerts, worker mode, demo, privacy), and room for features that are coming later.
// Everything is saved on the phone automatically (see SettingsStore).

import SwiftUI

struct MoreView: View {
    @Environment(SettingsStore.self) private var settings
    @State private var notice: String?

    private static let intervals = [15, 20, 30, 45, 60] // minutes

    var body: some View {
        @Bindable var settings = settings

        Form {
            if let notice {
                Section { Text(notice).bold() }
            }

            Section(t("settings.language")) {
                Picker(t("settings.language"), selection: $settings.value.language) {
                    ForEach(Language.allCases) { Text($0.label).tag($0) }
                }
                .pickerStyle(.inline)
                .labelsHidden()
            }

            Section(t("settings.display")) {
                Toggle(t("settings.largeText"), isOn: $settings.value.largeText)
                Toggle(isOn: $settings.value.seniorMode) {
                    labelled(t("settings.seniorMode"), t("settings.seniorDesc"))
                }
            }

            Section(t("settings.alerts")) {
                Toggle(isOn: $settings.value.highAlerts) {
                    labelled(t("settings.highAlert"), t("settings.highAlertDesc"))
                }
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

            Section(t("settings.demo")) {
                Toggle(isOn: $settings.value.demoHigh) {
                    labelled(t("settings.demoHigh"), t("settings.demoDesc"))
                }
                Button(t("settings.clearReports"), systemImage: "trash", role: .destructive) {
                    ReportStore.clear()
                    notice = t("settings.reportsCleared")
                }
            }

            Section(t("settings.privacyTitle")) {
                Text(t("settings.privacy"))
            }

            Section(t("more.soonTitle")) {
                Label(t("more.soon"), systemImage: "sparkles")
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle(t("tabs.more"))
        .tint(Theme.primary)
        // Turning on an alert asks for notification permission first.
        .onChange(of: settings.value.highAlerts) { _, on in checkPermission(on) }
        .onChange(of: settings.value.workerMode) { _, on in checkPermission(on) }
    }

    private func labelled(_ title: String, _ description: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
            Text(description).font(.footnote).foregroundStyle(.secondary)
        }
    }

    private func checkPermission(_ turnedOn: Bool) {
        guard turnedOn else { return }
        Task {
            if !(await Notifier.ensurePermission()) { notice = t("settings.notifDenied") }
        }
    }
}
