// importOfficialData.mjs — downloads REAL places from data.gov.sg and puts them
// into src/data/coolSpots.json, sorted into 3 cooling types:
//
//   ❄️ aircon  — Community Clubs (People's Association)
//   ⛱️ shaded  — Hawker Centres (NEA): roofed, open-air, with fans
//   🌳 green   — Parks (NParks): trees and shelters
//
// Run it with:   npm run update:data
//
// All three datasets use the Singapore Open Data Licence v1.0 (free to use, with credit).
// Libraries, malls and water points are NOT touched: they stay as sample data.

import { readFile, writeFile } from 'node:fs/promises';

const FILE = new URL('../src/data/coolSpots.json', import.meta.url);

// ---------- Helpers ----------

/** Downloads a data.gov.sg dataset (they give us a temporary link first). */
async function download(datasetId) {
  const poll = await (await fetch(`https://api-open.data.gov.sg/v1/public/api/datasets/${datasetId}/poll-download`)).json();
  if (poll.code !== 0) throw new Error(`No download link for ${datasetId}: ${JSON.stringify(poll)}`);
  return (await fetch(poll.data.url)).json();
}

/** "Punggol 21 CC" → "punggol-21-cc" */
const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** GeoJSON stores points as [longitude, latitude]. Round to ~10 cm. */
const point = (f) => ({
  latitude: Math.round(f.geometry.coordinates[1] * 1e6) / 1e6,
  longitude: Math.round(f.geometry.coordinates[0] * 1e6) / 1e6,
});

/** Builds "80 Punggol Field, S828815" from the address fields. */
function address(p) {
  const street = [p.ADDRESSBLOCKHOUSENUMBER, p.ADDRESSSTREETNAME].filter(Boolean).join(' ');
  return p.ADDRESSPOSTALCODE ? `${street}, S${p.ADDRESSPOSTALCODE}` : street;
}

// Short forms used in NParks names → full words, so they're easy to read aloud.
const ABBREVIATIONS = {
  PK: 'Park', JLN: 'Jalan', RD: 'Road', AVE: 'Avenue', DR: 'Drive', ST: 'Street', STH: 'South',
  NTH: 'North', TG: 'Tanjong', BT: 'Bukit', LOR: 'Lorong', CRES: 'Crescent', CL: 'Close', PL: 'Place',
  CTRL: 'Central', PCN: 'Park Connector', NR: 'Nature Reserve', UPP: 'Upper', LWR: 'Lower',
};

/** "JLN KEBAYA PK" → "Jalan Kebaya Park" */
function tidyParkName(raw) {
  return raw
    .split(/\s+/)
    .map((word) => ABBREVIATIONS[word.replace(/[().]/g, '')] ?? word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

// ---------- The three datasets ----------

/** ❄️ Community Clubs — air-conditioned lobbies and halls. */
async function communityClubs() {
  const geo = await download('d_9de02d3fb33d96da1855f4fbef549a0f');
  return geo.features
    .filter((f) => f.properties.DESCRIPTION === 'CC') // skip "PAssion WaVe" water-sports outlets
    .map((f) => ({
      id: 'cc-' + slug(f.properties.NAME),
      name: f.properties.NAME,
      type: 'community_centre',
      cooling: 'aircon',
      ...point(f),
      note: address(f.properties),
    }));
}

/** ⛱️ Hawker Centres — roofed, with fans and drinks. */
async function hawkerCentres() {
  const geo = await download('d_4a086da0a5553be1d89383cd90d07ecd');
  return geo.features
    .filter((f) => f.properties.STATUS !== 'Under Construction') // only ones you can visit now
    .map((f) => ({
      id: 'hc-' + slug(f.properties.NAME),
      name: f.properties.NAME,
      type: 'hawker',
      cooling: 'shaded',
      ...point(f),
      note: address(f.properties),
    }));
}

/** 🌳 Parks — skip playgrounds, open fields and fitness corners (usually no shade). */
async function parks() {
  const geo = await download('d_0542d48f0991541706b58059381a6eca');
  const NOT_COOL = /\b(PG|PLAYGROUND|OS|FC|FCP)\b/; // PG = playground, OS = open space, FC = fitness corner
  return geo.features
    .filter((f) => !NOT_COOL.test(f.properties.NAME.replace(/[()]/g, '')))
    .filter((f) => !/^(PULAU|BETING|TERUMBU)\b/.test(f.properties.NAME)) // offshore islands: you can't walk there
    .map((f) => ({
      id: 'pk-' + slug(f.properties.NAME),
      name: tidyParkName(f.properties.NAME),
      type: 'park',
      cooling: 'green',
      ...point(f),
      note: 'Trees and shelters (NParks)',
    }));
}

// ---------- Put it all together ----------

/** Makes ids unique (some places share a name), e.g. "pk-sunrise-park-2". */
function uniqueIds(spots) {
  const seen = new Map();
  return spots.map((s) => {
    const n = (seen.get(s.id) ?? 0) + 1;
    seen.set(s.id, n);
    return n === 1 ? s : { ...s, id: `${s.id}-${n}` };
  });
}

async function main() {
  const [ccs, hawkers, greens] = await Promise.all([communityClubs(), hawkerCentres(), parks()]);
  const official = [...ccs, ...hawkers, ...greens].sort((a, b) => a.name.localeCompare(b.name));

  // Keep the hand-made sample spots that aren't one of the official types.
  const data = JSON.parse(await readFile(FILE, 'utf8'));
  const OFFICIAL_TYPES = ['community_centre', 'hawker', 'park'];
  const samples = data.spots.filter((s) => !OFFICIAL_TYPES.includes(s.type));
  data.spots = uniqueIds([...samples, ...official]);

  // Write one spot per line so the file is easy to read and edit by hand.
  const lines = data.spots.map((s) => '    ' + JSON.stringify(s));
  await writeFile(FILE, `{\n  "_about": ${JSON.stringify(data._about)},\n  "spots": [\n${lines.join(',\n')}\n  ]\n}\n`);

  console.log(`Community clubs: ${ccs.length} · Hawker centres: ${hawkers.length} · Parks: ${greens.length} · Sample spots kept: ${samples.length}`);
  console.log(`Total cool spots: ${data.spots.length}`);
}

main().catch((err) => {
  console.error('Import failed:', err.message);
  process.exit(1);
});
