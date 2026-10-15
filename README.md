# CoolDrift 🌿

**Beat the heat without more air-con.**
A mobile app prototype for the **3M Innoscience Challenge (Urban Heat Mitigation)**.

CoolDrift helps **outdoor workers** (such as delivery riders) and **elderly people** in Singapore:
- know when the heat is dangerous,
- find cool places to rest,
- walk or cycle along cooler routes,
- and share hot spots with others.

It is software only. It uses free government weather data and has **no account, no login, and no paid services**.

There are two versions of the app in this repo:

| Folder | What it is | Runs on |
|---|---|---|
| `apps/expo` | The original app, built with Expo (React Native) | iPhone and Android (via Expo Go), and computers (web browser) |
| `apps/ios` | A native rewrite in Swift and SwiftUI | iPhone and iPad (iOS 18+; Liquid Glass tab bar on iOS 26+) |

Both have the same features (section 2).

---

## 1. How to run it

### Expo app (phone)

You need:
- A computer with **Node.js** (version 20 or newer): https://nodejs.org
- A phone with the **Expo Go** app (free on the App Store / Google Play)
- The phone and computer on the **same Wi-Fi**

Steps:

```bash
cd CoolDrift/apps/expo
npm install
npx expo start
```

Then:
- **iPhone:** open the Camera app and scan the QR code shown in the terminal.
- **Android:** open Expo Go and tap **Scan QR code**.

When the app asks, tap **Allow** for location and notifications.

> If the QR code doesn't connect (for example on school Wi-Fi), try `npx expo start --tunnel`.

### 💻 Expo app on a computer (desktop version)

The same app also runs in a desktop web browser (Chrome, Edge, Safari or Firefox), so judges can try it on a laptop. It's the same code, with a wide-screen layout.

```bash
cd CoolDrift/apps/expo
npm install
npm run desktop
```

Your browser opens at **http://localhost:8081**. When the browser asks, allow **location** and **notifications**.

**To make a finished website** you can put online (e.g. GitHub Pages, Netlify or Vercel, all with free plans):

```bash
npm run build:desktop
```

This creates a `dist-web/` folder. Upload that folder to any static web host. Tell the host to send all pages to `index.html` (a "single-page app" setting) so links like `/spots` work.

**What's different on a computer:**

| | Phone (Expo Go) | Computer (browser) |
|---|---|---|
| Layout | Floating glass tab bar at the bottom | Tabs down the left side; map and list side by side |
| Map | Apple Maps / Google Maps | OpenStreetMap (via Leaflet, free, no key) |
| High heat alert | Notification + vibration | Browser pop-up notification (most laptops can't vibrate) |
| Rest reminders | Keep working when the app is closed | Only while the CoolDrift tab is open |
| Background heat checks | Yes (the phone decides how often) | No (checks every 15 min while the tab is open) |
| Read aloud | Phone voice | Browser voice |
| Location | Phone GPS | Browser location (Wi-Fi based, less exact) |

### 📱 Native iOS app (Swift)

You need a Mac with **Xcode 26** or newer.

```bash
open CoolDrift/apps/ios/CoolDrift.xcodeproj
```

Pick an iPhone simulator (or your own iPhone) at the top of Xcode and press **Run**. On a real iPhone, first choose your Apple team under **Signing & Capabilities**.

The Xcode project is generated from `apps/ios/project.yml` with XcodeGen. After adding or removing Swift files, regenerate it:

```bash
brew install xcodegen
cd CoolDrift/apps/ios
xcodegen generate
```

**What's different from the Expo app:**

| | Expo app | Native iOS app |
|---|---|---|
| Tab bar | Real iOS tab bar on iPhone, glass-style imitation on Android and web | Real iOS tab bar (Liquid Glass on iOS 26+, shrinks when you scroll) |
| Map | react-native-maps | Apple Maps (MapKit) |
| Settings screen | Custom screen | Standard iOS settings list |
| Large text | App setting only | App setting, and also follows the iPhone's text size |
| Android / computer | Yes | No (iPhone and iPad only) |

---

## 2. What each feature does

### 🌡️ Home: heat-risk meter
- Shows **LOW / MODERATE / HIGH** heat risk for where you are, with the most important tip right under it.
- Uses **live data from data.gov.sg** (free, no API key), from the station nearest to you:

| Data | API endpoint |
|---|---|
| Air temperature | `https://api-open.data.gov.sg/v2/real-time/api/air-temperature` |
| Relative humidity | `https://api-open.data.gov.sg/v2/real-time/api/relative-humidity` |
| WBGT heat stress | `https://api-open.data.gov.sg/v2/real-time/api/weather?api=wbgt` |

- **How the risk is decided:** we use NEA's **WBGT** (Wet Bulb Globe Temperature) levels: below 31°C = Low, 31–33°C = Moderate, 33°C and above = High. If WBGT isn't available, we work out a "feels like" **heat index** from temperature and humidity instead.
- Shows the live numbers (feels like, heat stress, temperature, humidity), the safety tips for the current level, and the **nearest Air-con, Shaded and Green place**. Tap one for a cool route.
- **Read aloud** speaks the advice using the phone's own voice.
- Pull down to refresh. The app checks again **every 15 minutes** while it's open.

### 🗺️ Cool Spots: map, list and crowdsourced heat map
- **533 cool places**, each sorted into one of **3 cooling types** (as our mentor suggested):

| Cooling type | Colour | What's in it | Source |
|---|---|---|---|
| ❄️ **Air-con** | Blue | 122 Community Clubs, plus sample libraries and malls | Community Clubs: **real data** (People's Association) |
| ⛱️ **Shaded** | Brown | 123 Hawker Centres (roofed, with fans), sheltered water point | Hawker Centres: **real data** (NEA) |
| 🌳 **Green area** | Green | 272 Parks with trees and shelters (no air-con used!) | Parks: **real data** (NParks) |

- The map shows the 80 nearest places, coloured by cooling type. The list below has all of them, **sorted by distance**.
- Tap a place to see it on the map, or tap **Route** to go there.
- **Report hot spot:** tap the map (or "Use my location"), then choose **Warm**, **Hot** or **Very hot** (shown as 1, 2 or 3 bars). Reports show as **coloured circles** (yellow, orange, red). Overlapping circles look stronger, like a heat map. Reports disappear after 24 hours.

### 🚶 Routes: cool routes
- Tap the map to pick where you're going (or use "Show route" from Home or Cool Spots).
- Choose **Walk** or **Cycle**, then **Find cool route**.
- **Green line** = the cool route through cool spots. **Turquoise pins** = rest stops. **Grey dashed line** = the normal fastest route, for comparison.
- The summary shows the time, distance, number of rest stops, the % of the route near a cool spot, and how many extra minutes the cooler route takes.
- **iOS app only: Go.** Turn-by-turn directions like Apple Maps: a list of every turn and rest stop, then a banner with the next turn and its distance, a map that follows you, each turn read aloud, and your arrival time. Directions come from the same free OSRM server, so unnamed footpaths just say "Turn right".

**The trade-off we chose (and why):**
We don't have data on every shady path in Singapore, so true "shade-aware" routing isn't possible yet. Instead:
1. We ask a **free OSRM routing server** (`routing.openstreetmap.de`, from the OpenStreetMap community, no API key) for the fastest route.
2. We find cool spots near the straight line from start to end, one roughly every 1.5 km (max 3).
3. We ask OSRM for a route **through those cool spots**, so they become rest stops.
4. If that makes the trip more than 50% longer, we use fewer stops.

✅ Real walking/cycling paths, free, and simple enough to explain.
❌ It only knows the cool spots in our list, not every tree or covered walkway. A future version could add NParks tree data or LTA covered-linkway data.
📴 **Offline:** it draws straight lines and estimates the time (marked "approximate").

### ⏰ Alerts and rider break reminders
- **High heat alert:** a notification, sound and strong vibration when risk **changes** to High (once, not every 15 minutes).
- **Outdoor worker mode** (Settings): when risk is Moderate or High, a repeating **"Time for a break, drink water"** reminder every 15/20/30/45/60 minutes. It uses **sound + vibration** so riders don't need to look at the phone. If the app is open, the reminder is also **spoken aloud**.
- **Background checks:** the app also asks the phone to check the heat in the background. Android allows this about every 15 minutes at most. iOS decides for itself and may check much less often. While the app is open, it checks every 15 minutes for sure.

### 👵 Senior mode and Ask (chatbot)
- **Senior mode** (Settings) gives a much simpler Home screen: a huge meter, a giant **Read aloud** button, one main tip, and the nearest cool place. It reads the advice aloud when opened, and all text gets bigger.
- **Ask tab:** a simple chat. Tap a question button or type, e.g. *"Is it safe to go out?"*, *"Where is the nearest cool place?"*, *"How hot is it now?"*, *"I feel dizzy"*.
  - It understands cooling types too, e.g. *"Nearest air-con place?"*, *"Any parks near me?"*, *"Where's some shade?"*
  - It is **rule-based** (keyword matching), not paid AI. It answers using the live heat data.
  - Tap any answer to hear it read aloud.

### ⚙️ Settings (gear icon in the Expo app; the **More** tab in the iOS app)
- Language: English, 中文, Bahasa Melayu, தமிழ்
- Large text, Senior mode
- High heat alert on/off, Outdoor worker mode, reminder interval, "Test reminder now"
- **Demo: Simulate High heat** (for presentations)
- Delete my hot spot reports
- All settings are saved on the phone.

---

## 3. Privacy 🔒
- No account and no login.
- Your **location stays on your phone**. It is only used to pick the nearest weather station and sort cool spots.
- The only time a location leaves the phone is when **you ask for a route**: the start and end points go to the free OSRM routing server.
- Hot spot reports are saved **only on your phone** for now.

## 4. Offline and errors
| Problem | What the app does |
|---|---|
| No internet | Shows the last saved weather (with a "No internet" notice). Cool spots are built in, so they always work. Routes become straight-line estimates. |
| Location permission denied | Uses central Singapore (or your last known spot) and shows a notice. |
| Weather API fails | Each of the 3 APIs is tried separately. If WBGT fails, temperature + humidity are used. If all fail, the saved data is used. |
| Nothing saved yet and offline | Shows a clear message with a **Try again** button. |

---

## 5. Folder structure

```
CoolDrift/
├── README.md                This file
└── apps/
    ├── expo/                THE EXPO APP (phones + computers)
    └── ios/                 THE NATIVE iOS APP (Swift + SwiftUI)
```

### Expo app (`apps/expo`)

```
apps/expo/
├── app.json                 App name, permissions, plugins
├── package.json             List of libraries used
├── DEMO_SCRIPT.md           2-minute demo for judges
├── scripts/
│   └── importOfficialData.mjs   Downloads real CCs, hawker centres and parks (npm run update:data)
└── src/
    ├── app/                 SCREENS (each file = one screen, using Expo Router)
    │   ├── _layout.tsx        Wraps the app, sets up notifications + reminder voice
    │   ├── settings.tsx       Settings screen
    │   └── (tabs)/            The 4 tabs
    │       ├── _layout.tsx      Tab bar on Android + computers (glass bar / side bar)
    │       ├── _layout.ios.tsx  Tab bar on iPhone (the real iOS tab bar)
    │       ├── index.tsx        Home (heat meter, tips, Senior mode)
    │       ├── spots.tsx        Cool Spots map + list + heat reports
    │       ├── routes.tsx       Cool Routes
    │       └── chat.tsx         Ask (chatbot)
    ├── components/          REUSABLE PIECES
    │   ├── ui/                Design building blocks (use these for new screens!):
    │   │   ├── Card.tsx           White card with a thin border, fades in
    │   │   ├── FadeIn.tsx         Fade + slide-in animation
    │   │   ├── ScalePressable.tsx Button that squishes when pressed + haptic buzz
    │   │   ├── GlassTabBar.tsx    Floating frosted-glass tab bar (Android + phone browsers)
    │   │   ├── TabBarSafeArea.tsx Keeps bottom content above the tab bar
    │   │   └── HeaderBackground.tsx  Green title bar
    │   ├── CoolingBadge.tsx   ❄️/⛱️/🌳 coloured label + round icon
    │   ├── CoolingFilter.tsx  All / Air-con / Shaded / Green filter buttons
    │   ├── map/               The map, with one version per device:
    │   │   ├── CoolMap.tsx        phones (react-native-maps)
    │   │   ├── CoolMap.web.tsx    computers (Leaflet + OpenStreetMap)
    │   │   └── mapTypes.ts        what you can draw on either map
    │   ├── AppText.tsx        Text that grows in large-text mode
    │   ├── BigButton.tsx      Big, easy-to-tap button
    │   ├── RiskMeter.tsx      The Low/Moderate/High heat card
    │   └── StatusBanners.tsx  Offline / location / demo notices
    ├── context/             SHARED DATA for all screens
    │   ├── SettingsContext.tsx  Settings (saved on phone) + translation hook
    │   └── HeatContext.tsx      Location + weather + risk, refreshes every 15 min
    ├── services/            THE LOGIC (no screens here)
    │   ├── weather.ts         data.gov.sg APIs, risk calculation, offline cache
    │   ├── location.ts        GPS + permission handling
    │   ├── coolSpots.ts       Loads + sorts the cool spots
    │   ├── routing.ts         Cool route planning (OSRM)
    │   ├── reports.ts         Hot spot reports (+ 🔌 backend hook for Firebase later)
    │   ├── notifications.ts   High heat alerts + worker reminders (phones)
    │   ├── notifications.web.ts  Same, using browser pop-ups (computers)
    │   ├── backgroundCheck.ts Heat check while the app is in the background (phones)
    │   ├── backgroundCheck.web.ts  Does nothing (browsers can't do this)
    │   ├── speech.ts          Read aloud (text-to-speech)
    │   └── chatbot.ts         Rule-based chatbot
    ├── data/
    │   └── coolSpots.json     ⭐ All 533 cool places, in ONE file (one per line)
    ├── i18n/                LANGUAGES
    │   ├── index.ts           Translation setup
    │   ├── en.ts              English (main file)
    │   ├── zh.ts / ms.ts / ta.ts   Chinese / Malay / Tamil (placeholders)
    ├── utils/
    │   ├── geo.ts             Distance maths
    │   ├── motion.ts          Animation helpers + "Reduce Motion" check
    │   ├── useIsDesktop.ts    Is the screen wide? (switches to the desktop layout)
    │   ├── useTabBarSpace.ts  How much room the floating tab bar covers
    │   └── summary.ts         Builds the sentence for "Read aloud"
    └── theme.ts             Colours, shadows and font sizes (green + white)
```

**About the `.web.ts` and `.ios.tsx` files:** when a file has a twin ending in `.web.ts(x)` or `.ios.tsx`, Expo uses that one on computers (or iPhones) and the normal one everywhere else. The rest of the app doesn't need to know which one it's using.

### Native iOS app (`apps/ios`)

```
apps/ios/
├── project.yml              Xcode project settings (run `xcodegen generate` after changes)
├── CoolDrift.xcodeproj      Generated from project.yml; open this in Xcode
└── CoolDrift/
    ├── Info.plist             Generated from project.yml (permissions, background check)
    ├── App/
    │   ├── CoolDriftApp.swift   Starts the app, notifications, background check
    │   ├── Theme.swift          Colours + Liquid Glass button helpers
    │   └── L10n.swift           Translations (t("risk.high"))
    ├── Models/
    │   ├── Geo.swift            Distance maths + map camera helper
    │   ├── RouteStep.swift      One turn-by-turn instruction (text + arrow icon)
    │   └── CoolSpot.swift       Loads + sorts the cool spots
    ├── Services/            THE LOGIC (same rules as the Expo app)
    │   ├── WeatherService.swift   data.gov.sg APIs, risk calculation, offline cache
    │   ├── LocationService.swift  GPS + permission handling
    │   ├── RoutingService.swift   Cool route planning (OSRM)
    │   ├── ReportStore.swift      Hot spot reports (+ backend hook)
    │   ├── Notifier.swift         High heat alerts + worker reminders
    │   ├── BackgroundCheck.swift  Heat check while the app is in the background
    │   ├── Speech.swift           Read aloud
    │   └── Chatbot.swift          Rule-based chatbot
    ├── State/
    │   ├── SettingsStore.swift    Settings (saved on phone)
    │   └── HeatStore.swift        Location + weather + risk; which tab is open
    ├── Views/               SCREENS
    │   ├── RootView.swift         The 4 tabs + Settings sheet
    │   ├── HomeView.swift         Home (heat card, tips, Senior mode)
    │   ├── SpotsView.swift        Cool Spots: full-screen map + draggable list + heat reports
    │   ├── RoutesView.swift       Cool Routes + turn-by-turn directions (Go)
    │   ├── ChatView.swift         Ask (chatbot)
    │   ├── MoreView.swift         More tab: settings + "coming soon"
    │   └── Components/            Heat card, draggable map panel, heat bars, icons, banners
    └── Resources/
        ├── coolSpots.json         Copy of apps/expo/src/data/coolSpots.json
        ├── Strings/*.json         Translations, exported from apps/expo/src/i18n
        └── Assets.xcassets        App icon + accent colour
```

## 6. How to change things

- **Refresh the real data** (community clubs, hawker centres, parks): in `apps/expo`, run `npm run update:data`. It downloads the latest lists from data.gov.sg and updates `src/data/coolSpots.json`. Libraries, malls and water points are hand-made samples. Edit them in the same file using the same fields (`id, name, type, cooling, latitude, longitude, note`). `cooling` must be `aircon`, `shaded` or `green`. **Then copy the file** to `apps/ios/CoolDrift/Resources/coolSpots.json` so the iOS app gets it too.
- **Design and animations (Expo):** colours, shadows and corner sizes are all in `apps/expo/src/theme.ts`. To make something animate in, wrap it in `<FadeIn delay={200}>`. For a white box, use `<Card>`. For a button that squishes, use `<ScalePressable>`. All animations switch off automatically if the phone has **Reduce Motion** turned on (some seniors feel dizzy with moving screens).
- **Design (iOS):** colours are in `apps/ios/CoolDrift/App/Theme.swift`.
- **Share hot spot reports between phones:** fill in `syncReportToBackend()` and `fetchSharedReports()` at the bottom of `apps/expo/src/services/reports.ts`, and `syncToBackend()` / `fetchShared()` in `apps/ios/CoolDrift/Services/ReportStore.swift` (e.g. with Firebase). ⚠️ This needs a Firebase project and API key, so check with the team first.
- **Fix a translation:** edit `apps/expo/src/i18n/zh.ts`, `ms.ts` or `ta.ts`. The Chinese, Malay and Tamil text are **placeholder translations**, so please ask a native speaker to check them. Missing lines show in English. The iOS app has the same text in `apps/ios/CoolDrift/Resources/Strings/*.json` (same keys, e.g. `"risk.low"`), so update those too.
- **Teach the chatbot new questions:** add keywords to `KEYWORDS` in `apps/expo/src/services/chatbot.ts` (and `keywords` in `apps/ios/CoolDrift/Services/Chatbot.swift`), and an answer under `chat.a` in the translations.

## 7. Libraries used (all free)
**Expo app:** Expo SDK 57, Expo Router, react-native-maps, expo-location, expo-notifications, expo-speech, expo-background-task, AsyncStorage, i18n-js, expo-localization. On computers: react-native-web, Leaflet and react-leaflet.

**iOS app:** only Apple's own frameworks (SwiftUI, MapKit, Core Location, UserNotifications, BackgroundTasks, AVFoundation). No third-party libraries. XcodeGen is used to generate the Xcode project.

**Data credits:** Contains information from *Community Club / PAssion WaVe Outlet* (People's Association), *Hawker Centres* (NEA) and *Parks* (NParks), accessed from data.gov.sg and made available under the [Singapore Open Data Licence v1.0](https://data.gov.sg/open-data-licence).

**Free outside services:** data.gov.sg real-time weather APIs, the OSRM routing server at routing.openstreetmap.de, and OpenStreetMap map tiles on the desktop version. These are community-run and fair use, so don't spam them. No API keys are needed.

## 8. Known limits (good to mention to judges)
- Libraries, malls and water points are **approximate sample data**. Community clubs, hawker centres and parks are real.
- Community clubs are counted as "Air-con" because they have air-conditioned lobbies and halls, but opening hours vary.
- iOS controls when background checks run, so alerts are most reliable while the app is open.
- The map heat layer uses circles (they work on iPhone and Android) instead of a true blurred heat map, which needs Google Maps.
- The text-to-speech voices for Tamil and Malay depend on what the phone has installed.
- Desktop version: reminders and alerts only work while the browser tab is open. OpenStreetMap's free map server is meant for light use, so a real launch with many users should switch to a paid or self-hosted tile server (ask first).
- The cool spots and translations are copied into the iOS app, so they must be updated in both places.
