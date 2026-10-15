// DraggablePanel.swift — a panel at the bottom of a map that you drag up and down,
// like in Apple Maps. It snaps to 3 heights: collapsed, half and full.
//
// Why not a normal iOS sheet? A sheet covers the tab bar, so you couldn't switch tabs.
// Only the header (grabber + title) drags the panel; the content below scrolls.

import SwiftUI

enum PanelDetent { case collapsed, half, full }

struct DraggablePanel<Header: View, Content: View>: View {
    @Binding var detent: PanelDetent
    var collapsedHeight: CGFloat = 150
    @ViewBuilder var header: Header
    @ViewBuilder var content: Content

    @State private var dragOffset: CGFloat = 0

    var body: some View {
        GeometryReader { geo in
            let heights: [PanelDetent: CGFloat] = [
                .collapsed: collapsedHeight,
                .half: max(collapsedHeight, geo.size.height * 0.5),
                .full: geo.size.height - 8,
            ]
            let resting = heights[detent]!
            let height = min(max(resting - dragOffset, heights[.collapsed]! - 40), heights[.full]! + 20)
            let bottomInset = geo.safeAreaInsets.bottom // the floating tab bar sits here
            let shape = UnevenRoundedRectangle(topLeadingRadius: 28, topTrailingRadius: 28)

            VStack(spacing: 0) {
                VStack(spacing: 10) {
                    Capsule()
                        .fill(.secondary.opacity(0.5))
                        .frame(width: 40, height: 5)
                        .padding(.top, 8)
                    header
                }
                .frame(maxWidth: .infinity)
                .contentShape(Rectangle())
                .gesture(
                    DragGesture()
                        .onChanged { dragOffset = $0.translation.height }
                        .onEnded { value in
                            // Snap to the height closest to where the flick would end.
                            let target = resting - value.predictedEndTranslation.height
                            let next = heights.min { abs($0.value - target) < abs($1.value - target) }!.key
                            withAnimation(.snappy(duration: 0.3)) {
                                detent = next
                                dragOffset = 0
                            }
                        }
                )
                .accessibilityAction(named: "Expand") { withAnimation { detent = .full } }
                .accessibilityAction(named: "Collapse") { withAnimation { detent = .collapsed } }

                content
                    .frame(maxHeight: .infinity, alignment: .top)
                    .opacity(height > collapsedHeight + 30 ? 1 : 0) // hide the list when collapsed
            }
            .padding(.bottom, bottomInset)
            .frame(height: height + bottomInset, alignment: .top)
            .frame(maxWidth: .infinity)
            .clipShape(shape)
            .glassBackground(in: shape)
            .shadow(color: .black.opacity(0.12), radius: 16, y: -2)
            .frame(maxHeight: .infinity, alignment: .bottom)
            .ignoresSafeArea(edges: .bottom)
        }
        .animation(.snappy(duration: 0.3), value: detent)
    }
}
