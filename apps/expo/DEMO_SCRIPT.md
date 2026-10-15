# CoolDrift: 2-minute demo script 🎤

**Before judges arrive (setup checklist):**
- [ ] Phone charged, volume UP, **not on silent**, Do Not Disturb OFF
- [ ] App open in Expo Go, location + notifications **allowed**
- [ ] Settings: language **English**, Senior mode **OFF**, Demo "Simulate High heat" **OFF**, Outdoor worker mode **OFF**
- [ ] Cool Spots: add 3–4 hot spot reports near you so the heat map has colour
- [ ] If the venue Wi-Fi is bad, open the app once on good Wi-Fi first (it saves the weather data for offline use)
- [ ] Optional: mirror the phone screen to a projector
- [ ] **No phone mirroring? Use the desktop version.** Run `npm run desktop` on the laptop, allow location + notifications in the browser, and follow the same steps. The tabs are on the left and the map sits beside the list, which is easier to see on a projector. Volume up for "Read aloud". (There's no vibration on a laptop, so point at the pop-up and the red meter instead.)

---

### 0:00–0:15 · The problem (Speaker 1)
> "Singapore is getting hotter. Delivery riders and elderly people are most at risk from heat stress, but turning on more air-con makes the city even hotter. CoolDrift helps people **know** when heat is dangerous and **move smarter**, without extra air-con."

### 0:15–0:40 · Home: live heat risk (Speaker 1)
1. Show the **Home** tab.
> "This uses **live government data** from data.gov.sg: temperature, humidity and NEA's official heat stress measure, WBGT, from the station nearest to us."
2. Point at the meter, the numbers and the tips.
3. Tap **Read aloud** so judges hear the advice.

### 0:40–1:00 · High heat alert (Speaker 2)
1. Tap ⚙️ → turn ON **Simulate High heat** → go back.
> "Let's pretend it's a dangerous afternoon."
2. 📳 The phone **vibrates** and a **notification** appears. The meter turns **red**.
3. In Settings, turn ON **Outdoor worker mode** → tap **Test reminder now**.
> "For riders, it reminds them to rest and drink water, with sound, vibration **and voice**, so they never have to look at the phone while riding."

### 1:00–1:25 · Cool Spots + crowdsourced heat map (Speaker 2)
1. Open **Cool Spots**.
> "Here are nearby cool places to rest: libraries, community centres, hawker centres, parks with shelters and water points, sorted by distance."
2. Tap **Report hot spot** → **Use my location** → **🔥🔥🔥 Very hot**.
> "Anyone can report a hot spot. Reports build a heat map, so others know which areas to avoid."

### 1:25–1:45 · Cool Route (Speaker 3)
1. On a cool spot in the list, tap **Route** (or open **Routes** and tap a place on the map).
> "The **green route** passes cool spots, shown as turquoise rest stops. The **grey dashed line** is the normal fastest route. The cooler route takes only a few extra minutes."
2. Point at the "% near cool spots" and the red **High heat** reminder.

### 1:45–2:00 · Seniors + Ask + wrap-up (Speaker 3)
1. Open **Ask** → tap **"Is it safe to go out?"**
2. (If time) ⚙️ → **Senior mode** ON → Home shows huge text and reads aloud.
> "For seniors there's a simple mode with big text, voice, and a chat that answers in plain language. It works in **4 languages**, needs **no account**, keeps your location **on your phone**, works **offline**, and uses only **free** public data. CoolDrift: beat the heat without more air-con. Thank you!"

---

**After the demo:** turn **Simulate High heat** OFF again.

**If something goes wrong:**
- No internet → "It shows the last saved data. That's our offline mode!"
- Notification doesn't show → the phone may be on silent or Do Not Disturb. Show the vibration and the red meter instead.
- Route won't load → it falls back to a straight-line estimate, so explain the offline fallback.
