// Optional client-side Google Calendar configuration.
//
// By default, the site automatically fetches live upcoming events for
// `scpsrange@gmail.com` through `/api/events` (served locally by `server.js`
// and on Cloudflare Pages by `functions/api/events.js`) using Google's public
// ICS feed — no Google API key or password required.
//
// Only fill in apiKey + calendarId below if you deploy purely statically
// without Cloudflare Pages Functions or `server.js` (e.g., GitHub Pages).
window.GOOGLE_CALENDAR_CONFIG = {
  apiKey: "",
  calendarId: "",
  maxResults: 10,
  timeZone: "America/Los_Angeles"
};
