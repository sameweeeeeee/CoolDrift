// RootView.swift — the 5 tabs: Home, Cool Spots, Routes, Ask, and More (settings).
// The system TabView gives the floating Liquid Glass tab bar on iOS 26+
// (and the normal tab bar on older iOS).
// It also keeps the heat data fresh: on launch, every 15 minutes, and when you come back to the app.

import SwiftUI

struct RootView: View {
    @Environment(SettingsStore.self) private var settings
    @Environment(HeatStore.self) private var heat
    @Environment(AppRouter.self) private var router
    @Environment(\.scenePhase) private var scenePhase

    private var risk: RiskLevel? { heat.risk(demoHigh: settings.value.demoHigh) }

    /// Outdoor worker mode: rest reminders only when risk is Moderate or High.
    private var reminderKey: String {
        let remind = settings.value.workerMode && (risk == .moderate || risk == .high)
        return "\(remind)-\(settings.value.workerInterval)-\(settings.value.language.rawValue)"
    }

    var body: some View {
        @Bindable var router = router

        TabView(selection: $router.tab) {
            Tab(t("tabs.home"), systemImage: "thermometer.sun.fill", value: AppRouter.TabID.home) {
                screen("CoolDrift") { HomeView() }
            }
            Tab(t("tabs.spots"), systemImage: "map.fill", value: AppRouter.TabID.spots) {
                screen(t("tabs.spots"), overMap: true) { SpotsView() }
            }
            Tab(t("tabs.routes"), systemImage: "figure.walk", value: AppRouter.TabID.routes) {
                screen(t("tabs.routes"), overMap: true) { RoutesView() }
            }
            Tab(t("tabs.chat"), systemImage: "bubble.left.and.bubble.right.fill", value: AppRouter.TabID.chat) {
                screen(t("tabs.chat")) { ChatView() }
            }
            Tab(t("tabs.more"), systemImage: "square.grid.2x2.fill", value: AppRouter.TabID.more) {
                NavigationStack { MoreView() }
            }
        }
        .tint(Theme.primary)
        .minimizeTabBarOnScroll()
        .dynamicTypeSize(settings.bigText ? .xxxLarge ... .accessibility5 : .xSmall ... .accessibility5)
        .task {
            // First check, then every 15 minutes while the app is open.
            await heat.refresh()
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(15 * 60))
                await heat.refresh()
            }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { Task { await heat.refresh() } }
            if phase == .background { BackgroundCheck.schedule() }
        }
        .onChange(of: risk) { _, risk in
            guard let risk else { return }
            Task { await Notifier.alertIfRiskBecameHigh(risk, alertsOn: settings.value.highAlerts) }
        }
        .task(id: reminderKey) {
            if reminderKey.hasPrefix("true") {
                await Notifier.startWorkerReminders(every: settings.value.workerInterval)
            } else {
                Notifier.stopWorkerReminders()
            }
        }
    }

    /// Each tab has its own title bar. Over a full-screen map there's no bar at all.
    private func screen(_ title: String, overMap: Bool = false, @ViewBuilder content: () -> some View) -> some View {
        NavigationStack {
            content()
                .navigationTitle(title) // still read out by VoiceOver
                .navigationBarTitleDisplayMode(.inline)
                .toolbar(overMap ? .hidden : .automatic, for: .navigationBar)
        }
    }
}
