import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchGoogleCalendarEvents } from '../functions/api/events.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.resolve(__dirname, '../data/events.json');

const calendarId = process.env.GOOGLE_CALENDAR_ID || 'scpsrange@gmail.com';
const timeZone = process.env.GOOGLE_CALENDAR_TIMEZONE || 'America/Los_Angeles';

const result = await fetchGoogleCalendarEvents({
  apiKey: process.env.GOOGLE_CALENDAR_API_KEY || '',
  calendarId,
  timeZone,
  maxResults: '100',
  monthsAhead: 3
});

const payload = {
  ...result,
  syncedAt: new Date().toISOString()
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');

console.log(`Synced ${payload.events.length} events for ${calendarId} to ${outPath}`);
