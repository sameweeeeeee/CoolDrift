# CoolDrift 🌿

**Beat the heat without more air-con.**
A mobile app prototype for the **3M Innoscience Challenge (Urban Heat Mitigation)**.

CoolDrift helps **outdoor workers** (such as delivery riders) and **elderly people** in Singapore:
- know when the heat is dangerous,
- find cool places to rest,
- walk or cycle along cooler routes,
- and share hot spots with others.

It is software only. It uses free government weather data and has **no account, no login, and no paid services**.

---

## 1. How to run it

You need:
- A computer with **Node.js** (version 20 or newer): https://nodejs.org
- A phone with the **Expo Go** app (free on the App Store / Google Play)
- The phone and computer on the **same Wi-Fi**

Steps:

```bash
cd CoolDrift
npm install
npx expo start
```

Then:
- **iPhone:** open the Camera app and scan the QR code shown in the terminal.
- **Android:** open Expo Go and tap **Scan QR code**.

When the app asks, tap **Allow** for location and notifications.

> If the QR code doesn't connect (for example on school Wi-Fi), try `npx expo start --tunnel`.

### 💻 Desktop version (laptop or computer)

The same app also runs in a desktop web browser (Chrome, Edge, Safari or Firefox), so judges can try it on a laptop. It's the same code, with a wide-screen layout.

```bash
cd CoolDrift
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
| Layout | Tabs at the bottom | Tabs down the left side; map and list side by side |
| Map | Apple Maps / Google Maps | OpenStreetMap (via Leaflet, free, no key) |
| High heat alert | Notification + vibration | Browser pop-up notification (most laptops can't vibrate) |
| Rest reminders | Keep working when the app is closed | Only while the CoolDrift tab is open |
| Background heat checks | Yes (the phone decides how often) | No (checks every 15 min while the tab is open) |
| Read aloud | Phone voice | Browser voice |
| Location | Phone GPS | Browser location (Wi-Fi based, less exact) |

---

## 2. What each feature does

### 🌡️ Home: heat-risk meter
- Shows **LOW / MODERATE / HIGH** heat risk for where you are.
- Uses **live data from data.gov.sg** (free, no API key), from the station nearest to you:

| Data | API endpoint |
|---|---|
| Air temperature | `https://api-open.data.gov.sg/v2/real-time/api/air-temperature` |
| Relative humidity | `https://api-open.data.gov.sg/v2/real-time/api/relative-humidity` |
| WBGT heat stress | `https://api-open.data.gov.sg/v2/real-time/api/weather?api=wbgt` |

- **How the risk is decided:** we use NEA's **WBGT** (Wet Bulb Globe Temperature) levels: below 31°C = Low, 31–33°C = Moderate, 33°C and above = High. If WBGT isn't available, we work out a "feels like" **heat index** from temperature and humidity instead.
- Shows 3 safety tips for the current level, plus the nearest cool place.
- **Read aloud** speaks the advice using the phone's own voice.
- Pull down to refresh. The app checks again **every 15 minutes** while it's open.

### 🗺️ Cool Spots: map, list and crowdsourced heat map
- Green pins show cool places: community centres, libraries, malls, hawker centres, sheltered parks and water points.
- The list is **sorted by distance**. Tap a place to see it on the map, or tap **Route** to go there.
- **Report hot spot:** tap the map (or "Use my location"), then choose 🔥 Warm, 🔥🔥 Hot or 🔥🔥🔥 Very hot. Reports show as **coloured circles** (yellow, orange, red). Overlapping circles look stronger, like a heat map. Reports disappear after 24 hours.

### 🚶 Routes: cool routes
- Tap the map to pick where you're going (or use "Show route" from Home or Cool Spots).
- Choose **Walk** or **Cycle**, then **Find cool route**.
- **Green line** = the cool route through cool spots. **Turquoise pins** = rest stops. **Grey dashed line** = the normal fastest route, for comparison.
- The summary shows the time, distance, number of rest stops, the % of the route near a cool spot, and how many extra minutes the cooler route takes.

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
- **Ask tab:** a simple chat. Tap a big question button or type, e.g. *"Is it safe to go out?"*, *"Where is the nearest cool place?"*, *"How hot is it now?"*, *"I feel dizzy"*.
  - It is **rule-based** (keyword matching in `src/services/chatbot.ts`), not paid AI. It answers using the live heat data.
  - Tap any answer to hear it read aloud.

### ⚙️ Settings (gear icon, top right)
- Language: English, 中文, Bahasa Melayu, தமிழ்
- Large text, Senior mode
- High heat alert on/off, Outdoor worker mode, reminder interval, "Test reminder now"
- **Demo: Simulate High heat** (for presentations)
- Delete my hot spot reports
- All settings are saved on the phone (AsyncStorage).

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
├── app.json                 App name, permissions, plugins
├── package.json             List of libraries used
├── README.md                This file
├── DEMO_SCRIPT.md           2-minute demo for judges
└── src/
    ├── app/                 SCREENS (each file = one screen, using Expo Router)
    │   ├── _layout.tsx        Wraps the app, sets up notifications + reminder voice
    │   ├── settings.tsx       Settings screen
    │   └── (tabs)/            The 4 bottom tabs
    │       ├── _layout.tsx      Tab bar + settings gear button
    │       ├── index.tsx        Home (heat meter, tips, Senior mode)
    │       ├── spots.tsx        Cool Spots map + list + heat reports
    │       ├── routes.tsx       Cool Routes
    │       └── chat.tsx         Ask (chatbot)
    ├── components/          REUSABLE PIECES
    │   ├── map/               The map, with one version per device:
    │   │   ├── CoolMap.tsx        phones (react-native-maps)
    │   │   ├── CoolMap.web.tsx    computers (Leaflet + OpenStreetMap)
    │   │   └── mapTypes.ts        what you can draw on either map
    │   ├── AppText.tsx        Text that grows in large-text mode
    │   ├── BigButton.tsx      Big, easy-to-tap button
    │   ├── RiskMeter.tsx      The Low/Moderate/High meter
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
    │   └── coolSpots.json     ⭐ The 33 sample cool places, in ONE file
    ├── i18n/                LANGUAGES
    │   ├── index.ts           Translation setup
    │   ├── en.ts              English (main file)
    │   ├── zh.ts / ms.ts / ta.ts   Chinese / Malay / Tamil (placeholders)
    ├── utils/
    │   ├── geo.ts             Distance maths
    │   ├── useIsDesktop.ts    Is the screen wide? (switches to the desktop layout)
    │   └── summary.ts         Builds the sentence for "Read aloud"
    └── theme.ts             Colours and font sizes (green + white)
```

**About the `.web.ts` files:** when a file has a twin ending in `.web.ts` or `.web.tsx`, Expo uses the `.web` one on computers and the normal one on phones. The rest of the app doesn't need to know which one it's using.

## 6. How to change things

- **Use a real list of cool places:** replace the `spots` list in `src/data/coolSpots.json` with the same fields (`id, name, type, latitude, longitude, note`). Good sources are data.gov.sg datasets for community clubs, libraries, hawker centres and parks.
- **Share hot spot reports between phones:** fill in `syncReportToBackend()` and `fetchSharedReports()` at the bottom of `src/services/reports.ts` (e.g. with Firebase). ⚠️ This needs a Firebase project and API key, so check with the team first.
- **Fix a translation:** edit `src/i18n/zh.ts`, `ms.ts` or `ta.ts`. The Chinese, Malay and Tamil text are **placeholder translations**, so please ask a native speaker to check them. Missing lines show in English.
- **Teach the chatbot new questions:** add keywords to `KEYWORDS` in `src/services/chatbot.ts`, and an answer in `src/i18n/en.ts` under `chat.a`.
- **Change the colours:** edit `src/theme.ts`.

## 7. Libraries used (all free)
Expo SDK 57, Expo Router, react-native-maps, expo-location, expo-notifications, expo-speech, expo-background-task, AsyncStorage, i18n-js, expo-localization. On computers: react-native-web, Leaflet and react-leaflet.

**Free outside services:** data.gov.sg real-time weather APIs, the OSRM routing server at routing.openstreetmap.de, and OpenStreetMap map tiles on the desktop version. These are community-run and fair use, so don't spam them. No API keys are needed.

## 8. Known limits (good to mention to judges)
- The cool spot coordinates are **approximate sample data**.
- iOS controls when background checks run, so alerts are most reliable while the app is open.
- The map heat layer uses circles (they work on both iPhone and Android in Expo Go) instead of a true blurred heat map, which needs Google Maps.
- The text-to-speech voices for Tamil and Malay depend on what the phone has installed.
- Desktop version: reminders and alerts only work while the browser tab is open. OpenStreetMap's free map server is meant for light use, so a real launch with many users should switch to a paid or self-hosted tile server (ask first).
