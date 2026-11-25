// Cloudflare Pages Function: GET /api/events
// Pulls upcoming events from Google Calendar for the Shoshone County Public Shooting Range.
// Supports both:
//   1) Public Google Calendar ICS feed (zero API key required — works out of the box)
//   2) Google Calendar API v3 (if GOOGLE_CALENDAR_API_KEY is set in environment variables)

const DEFAULT_CALENDAR_ID = 'scpsrange@gmail.com';
const DEFAULT_TIMEZONE = 'America/Los_Angeles';
const DAY_MAP = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

function unescapeIcsText(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatDateOnly(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function addDaysToYmd(year, month, day, deltaDays) {
  const d = new Date(Date.UTC(year, month - 1, day + deltaDays));
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate()
  };
}

function getTimeZoneOffsetMs(utcDate, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });
  const parts = {};
  for (const p of fmt.formatToParts(utcDate)) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  }
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour === 24 ? 0 : parts.hour,
    parts.minute,
    parts.second
  );
  return asUtc - utcDate.getTime();
}

function zonedWallTimeToUtc(year, month, day, hour, minute, second, timeZone) {
  const wallUtcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  if (!timeZone || timeZone === 'UTC') {
    return new Date(wallUtcGuess);
  }
  let offset = getTimeZoneOffsetMs(new Date(wallUtcGuess), timeZone);
  let adjusted = wallUtcGuess - offset;
  const secondOffset = getTimeZoneOffsetMs(new Date(adjusted), timeZone);
  if (secondOffset !== offset) {
    adjusted = wallUtcGuess - secondOffset;
  }
  return new Date(adjusted);
}

function parseIcsDateValue(rawValue, params, fallbackTz) {
  const val = String(rawValue || '').trim();
  const isDateOnly =
    (params.VALUE && params.VALUE.toUpperCase() === 'DATE') ||
    /^\d{8}$/.test(val);

  if (isDateOnly) {
    const m = val.match(/^(\d{4})(\d{2})(\d{2})/);
    if (!m) return null;
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    return {
      isAllDay: true,
      year,
      month,
      day,
      hour: 0,
      minute: 0,
      second: 0,
      tz: null,
      utcDate: new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
    };
  }

  const m = val.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = Number(m[6]);
  const isUtc = Boolean(m[7]);
  const tz = isUtc ? 'UTC' : (params.TZID || fallbackTz || DEFAULT_TIMEZONE);
  const utcDate = isUtc
    ? new Date(Date.UTC(year, month - 1, day, hour, minute, second))
    : zonedWallTimeToUtc(year, month, day, hour, minute, second, tz);

  return {
    isAllDay: false,
    year,
    month,
    day,
    hour,
    minute,
    second,
    tz,
    utcDate
  };
}

function parseRRule(ruleStr) {
  const out = {};
  for (const part of String(ruleStr || '').split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    out[part.slice(0, idx).toUpperCase()] = part.slice(idx + 1);
  }
  return out;
}

function parseByDayToken(token) {
  const m = String(token).trim().match(/^([+-]?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/i);
  if (!m) return null;
  return {
    nth: m[1] ? Number(m[1]) : null,
    dow: DAY_MAP[m[2].toUpperCase()]
  };
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function getNthWeekdayDatesInMonth(year, month, dow, nth) {
  const totalDays = daysInMonth(year, month);
  const matches = [];
  for (let d = 1; d <= totalDays; d++) {
    if (new Date(Date.UTC(year, month - 1, d)).getUTCDay() === dow) {
      matches.push(d);
    }
  }
  if (nth === null) return matches;
  if (nth > 0) return matches[nth - 1] ? [matches[nth - 1]] : [];
  const idx = matches.length + nth;
  return idx >= 0 && matches[idx] ? [matches[idx]] : [];
}

function buildOccurrenceDate(parsedStart, y, m, d) {
  if (parsedStart.isAllDay) {
    return {
      year: y,
      month: m,
      day: d,
      utcDate: new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
    };
  }
  return {
    year: y,
    month: m,
    day: d,
    utcDate: zonedWallTimeToUtc(
      y,
      m,
      d,
      parsedStart.hour,
      parsedStart.minute,
      parsedStart.second,
      parsedStart.tz
    )
  };
}

function getMonthWindowBounds(now, timeZone, monthsAhead = 0) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric'
  });
  const parts = {};
  for (const p of fmt.formatToParts(now)) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  }
  const year = parts.year;
  const month = parts.month;
  const totalEndMonths = (year * 12 + (month - 1)) + 1 + Math.max(parseInt(monthsAhead, 10) || 0, 0);
  const endYear = Math.floor(totalEndMonths / 12);
  const endMonth = (totalEndMonths % 12) + 1;

  const monthStartUtc = zonedWallTimeToUtc(year, month, 1, 0, 0, 0, timeZone);
  const nextMonthStartUtc = zonedWallTimeToUtc(endYear, endMonth, 1, 0, 0, 0, timeZone);
  const monthLabel = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone
  }).format(zonedWallTimeToUtc(year, month, 15, 12, 0, 0, timeZone));

  return {
    year,
    month,
    monthStartUtc,
    nextMonthStartUtc,
    monthStartYmd: formatDateOnly(year, month, 1),
    nextMonthStartYmd: formatDateOnly(endYear, endMonth, 1),
    monthLabel
  };
}

function expandRecurringOccurrences(start, durationMs, durationDays, rruleStr, exdateKeys, windowStartMs, windowEndMs, windowStartYmd, windowEndYmd, maxSeriesMatches) {
  const rule = parseRRule(rruleStr);
  const freq = rule.FREQ;
  if (!freq) return [];

  const interval = Math.max(parseInt(rule.INTERVAL || '1', 10) || 1, 1);
  const countLimit = rule.COUNT ? parseInt(rule.COUNT, 10) : Infinity;
  let untilMs = windowEndMs;
  if (rule.UNTIL) {
    const parsedUntil = parseIcsDateValue(rule.UNTIL, {}, start.tz);
    if (parsedUntil) {
      const uMs = parsedUntil.isAllDay
        ? Date.UTC(parsedUntil.year, parsedUntil.month - 1, parsedUntil.day, 23, 59, 59)
        : parsedUntil.utcDate.getTime();
      untilMs = Math.min(untilMs, uMs);
    }
  }

  const results = [];
  let generatedCount = 0;
  const startUtcMs = start.utcDate.getTime();

  const tryAccept = (y, m, d) => {
    const occ = buildOccurrenceDate(start, y, m, d);
    const occStartMs = occ.utcDate.getTime();
    if (occStartMs < startUtcMs - 1000) return 'skip';

    if (start.isAllDay) {
      const occStartYmd = formatDateOnly(y, m, d);
      if (occStartYmd >= windowEndYmd) return 'stop';
    } else if (occStartMs >= windowEndMs) {
      return 'stop';
    }
    if (occStartMs > untilMs) return 'stop';

    generatedCount += 1;
    if (generatedCount > countLimit) return 'stop';

    const key = start.isAllDay
      ? formatDateOnly(y, m, d)
      : `${y}-${pad2(m)}-${pad2(d)}T${pad2(start.hour)}:${pad2(start.minute)}`;

    if (!exdateKeys.has(key)) {
      let overlapsWindow = false;
      if (start.isAllDay) {
        const occStartYmd = formatDateOnly(y, m, d);
        const endYmdObj = addDaysToYmd(y, m, d, durationDays);
        const occEndYmd = formatDateOnly(endYmdObj.year, endYmdObj.month, endYmdObj.day);
        overlapsWindow = occStartYmd < windowEndYmd && occEndYmd > windowStartYmd;
      } else {
        const occEndMs = occStartMs + durationMs;
        overlapsWindow = occStartMs < windowEndMs && occEndMs > windowStartMs;
      }

      if (overlapsWindow) {
        results.push({ ...occ, key });
        if (results.length >= maxSeriesMatches) return 'stop';
      }
    }
    return 'continue';
  };

  const maxIterations = 2000;

  if (freq === 'DAILY') {
    for (let step = 0; step < maxIterations; step++) {
      const ymd = addDaysToYmd(start.year, start.month, start.day, step * interval);
      const state = tryAccept(ymd.year, ymd.month, ymd.day);
      if (state === 'stop') break;
    }
  } else if (freq === 'WEEKLY') {
    const byDays = rule.BYDAY
      ? rule.BYDAY.split(',').map(parseByDayToken).filter(Boolean).map(t => t.dow)
      : [new Date(Date.UTC(start.year, start.month - 1, start.day)).getUTCDay()];
    const uniqueDows = [...new Set(byDays)].sort((a, b) => a - b);
    const startDow = new Date(Date.UTC(start.year, start.month - 1, start.day)).getUTCDay();
    const week0Sunday = addDaysToYmd(start.year, start.month, start.day, -startDow);

    outerWeekly: for (let w = 0; w < maxIterations; w++) {
      for (const dow of uniqueDows) {
        const ymd = addDaysToYmd(week0Sunday.year, week0Sunday.month, week0Sunday.day, w * interval * 7 + dow);
        const state = tryAccept(ymd.year, ymd.month, ymd.day);
        if (state === 'stop') break outerWeekly;
      }
    }
  } else if (freq === 'MONTHLY') {
    const byDayTokens = rule.BYDAY ? rule.BYDAY.split(',').map(parseByDayToken).filter(Boolean) : [];
    const byMonthDays = rule.BYMONTHDAY
      ? rule.BYMONTHDAY.split(',').map(n => parseInt(n, 10)).filter(n => !Number.isNaN(n))
      : [];

    outerMonthly: for (let step = 0; step < maxIterations; step++) {
      const totalMonths = (start.year * 12 + (start.month - 1)) + step * interval;
      const y = Math.floor(totalMonths / 12);
      const m = (totalMonths % 12) + 1;
      const maxD = daysInMonth(y, m);
      let candidateDays = [];

      if (byDayTokens.length > 0) {
        for (const t of byDayTokens) {
          candidateDays.push(...getNthWeekdayDatesInMonth(y, m, t.dow, t.nth));
        }
      } else if (byMonthDays.length > 0) {
        for (const md of byMonthDays) {
          const resolved = md > 0 ? md : maxD + 1 + md;
          if (resolved >= 1 && resolved <= maxD) candidateDays.push(resolved);
        }
      } else if (start.day <= maxD) {
        candidateDays.push(start.day);
      }

      candidateDays = [...new Set(candidateDays)].sort((a, b) => a - b);
      for (const d of candidateDays) {
        const state = tryAccept(y, m, d);
        if (state === 'stop') break outerMonthly;
      }
    }
  } else if (freq === 'YEARLY') {
    const byMonths = rule.BYMONTH
      ? rule.BYMONTH.split(',').map(n => parseInt(n, 10)).filter(n => n >= 1 && n <= 12)
      : [start.month];
    const byDayTokens = rule.BYDAY ? rule.BYDAY.split(',').map(parseByDayToken).filter(Boolean) : [];

    outerYearly: for (let step = 0; step < 50; step++) {
      const y = start.year + step * interval;
      for (const m of byMonths) {
        const maxD = daysInMonth(y, m);
        let candidateDays = [];
        if (byDayTokens.length > 0) {
          for (const t of byDayTokens) {
            candidateDays.push(...getNthWeekdayDatesInMonth(y, m, t.dow, t.nth));
          }
        } else if (start.day <= maxD) {
          candidateDays.push(start.day);
        }
        candidateDays = [...new Set(candidateDays)].sort((a, b) => a - b);
        for (const d of candidateDays) {
          const state = tryAccept(y, m, d);
          if (state === 'stop') break outerYearly;
        }
      }
    }
  }

  return results;
}

export function parseIcsToGoogleEvents(icsText, options = {}) {
  const timeZone = options.timeZone || DEFAULT_TIMEZONE;
  const maxResults = Math.min(Math.max(parseInt(options.maxResults || '50', 10) || 50, 1), 100);
  const now = options.now instanceof Date ? options.now : new Date();
  const bounds = getMonthWindowBounds(now, timeZone, options.monthsAhead || 0);
  const windowStartMs = bounds.monthStartUtc.getTime();
  const windowEndMs = bounds.nextMonthStartUtc.getTime();
  const windowStartYmd = bounds.monthStartYmd;
  const windowEndYmd = bounds.nextMonthStartYmd;
  const calendarId = options.calendarId || DEFAULT_CALENDAR_ID;

  // Unfold RFC 5545 continuation lines
  const unfolded = String(icsText || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n[ \t]/g, '');

  const lines = unfolded.split('\n');
  let calendarTz = timeZone;
  const rawEvents = [];
  let current = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = { exdates: [] };
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current) rawEvents.push(current);
      current = null;
      continue;
    }
    if (!current) {
      if (line.startsWith('X-WR-TIMEZONE:')) {
        calendarTz = line.slice('X-WR-TIMEZONE:'.length).trim() || calendarTz;
      }
      continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const left = line.slice(0, colonIdx);
    const value = line.slice(colonIdx + 1);
    const parts = left.split(';');
    const propName = parts[0].toUpperCase();
    const params = {};
    for (let i = 1; i < parts.length; i++) {
      const eq = parts[i].indexOf('=');
      if (eq !== -1) {
        params[parts[i].slice(0, eq).toUpperCase()] = parts[i].slice(eq + 1);
      }
    }

    if (propName === 'EXDATE') {
      for (const rawDate of value.split(',')) {
        const parsed = parseIcsDateValue(rawDate, params, calendarTz);
        if (parsed) current.exdates.push(parsed);
      }
    } else if (propName === 'DTSTART' || propName === 'DTEND' || propName === 'RECURRENCE-ID') {
      current[propName] = { value, params };
    } else {
      current[propName] = value;
    }
  }

  // Track overridden recurrence instances by UID + recurrence key
  const overrideKeysByUid = new Map();
  for (const ev of rawEvents) {
    if (ev.UID && ev['RECURRENCE-ID']) {
      const parsedRec = parseIcsDateValue(ev['RECURRENCE-ID'].value, ev['RECURRENCE-ID'].params, calendarTz);
      if (parsedRec) {
        const key = parsedRec.isAllDay
          ? formatDateOnly(parsedRec.year, parsedRec.month, parsedRec.day)
          : `${parsedRec.year}-${pad2(parsedRec.month)}-${pad2(parsedRec.day)}T${pad2(parsedRec.hour)}:${pad2(parsedRec.minute)}`;
        if (!overrideKeysByUid.has(ev.UID)) overrideKeysByUid.set(ev.UID, new Set());
        overrideKeysByUid.get(ev.UID).add(key);
      }
    }
  }

  const embedBase = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}&ctz=${encodeURIComponent(timeZone)}`;
  const outputEvents = [];

  for (const ev of rawEvents) {
    if ((ev.STATUS || '').toUpperCase() === 'CANCELLED') continue;
    if (!ev.DTSTART) continue;

    const start = parseIcsDateValue(ev.DTSTART.value, ev.DTSTART.params, calendarTz);
    if (!start) continue;

    const end = ev.DTEND
      ? parseIcsDateValue(ev.DTEND.value, ev.DTEND.params, calendarTz)
      : null;

    const durationMs = end && !start.isAllDay
      ? Math.max(end.utcDate.getTime() - start.utcDate.getTime(), 0)
      : 3600000;

    const durationDays = end && start.isAllDay
      ? Math.max(Math.round((end.utcDate.getTime() - start.utcDate.getTime()) / 86400000), 1)
      : 1;

    const summary = unescapeIcsText(ev.SUMMARY || 'Untitled Range Event').trim();
    const description = unescapeIcsText(ev.DESCRIPTION || '').trim();
    const location = unescapeIcsText(ev.LOCATION || '').trim();
    const htmlLink = ev.URL ? ev.URL.trim() : embedBase;

    if (ev.RRULE) {
      const exdateKeys = new Set(overrideKeysByUid.get(ev.UID) || []);
      for (const ex of ev.exdates) {
        exdateKeys.add(
          ex.isAllDay
            ? formatDateOnly(ex.year, ex.month, ex.day)
            : `${ex.year}-${pad2(ex.month)}-${pad2(ex.day)}T${pad2(ex.hour)}:${pad2(ex.minute)}`
        );
      }

      const occurrences = expandRecurringOccurrences(
        start,
        durationMs,
        durationDays,
        ev.RRULE,
        exdateKeys,
        windowStartMs,
        windowEndMs,
        windowStartYmd,
        windowEndYmd,
        maxResults
      );

      for (const occ of occurrences) {
        if (start.isAllDay) {
          const endYmd = addDaysToYmd(occ.year, occ.month, occ.day, durationDays);
          outputEvents.push({
            id: `${ev.UID || 'ics'}-${occ.key}`,
            summary,
            description,
            location,
            status: 'confirmed',
            htmlLink,
            start: { date: formatDateOnly(occ.year, occ.month, occ.day) },
            end: { date: formatDateOnly(endYmd.year, endYmd.month, endYmd.day) },
            _sortMs: Date.UTC(occ.year, occ.month - 1, occ.day, 0, 0, 0)
          });
        } else {
          const startIso = occ.utcDate.toISOString();
          const endIso = new Date(occ.utcDate.getTime() + durationMs).toISOString();
          outputEvents.push({
            id: `${ev.UID || 'ics'}-${occ.key}`,
            summary,
            description,
            location,
            status: 'confirmed',
            htmlLink,
            start: { dateTime: startIso },
            end: { dateTime: endIso },
            _sortMs: occ.utcDate.getTime()
          });
        }
      }
    } else {
      if (start.isAllDay) {
        const startYmd = formatDateOnly(start.year, start.month, start.day);
        const endYmdObj = end
          ? { year: end.year, month: end.month, day: end.day }
          : addDaysToYmd(start.year, start.month, start.day, durationDays);
        const endYmd = formatDateOnly(endYmdObj.year, endYmdObj.month, endYmdObj.day);

        if (!(startYmd < windowEndYmd && endYmd > windowStartYmd)) continue;

        outputEvents.push({
          id: ev.UID || `ics-${start.utcDate.getTime()}`,
          summary,
          description,
          location,
          status: 'confirmed',
          htmlLink,
          start: { date: startYmd },
          end: { date: endYmd },
          _sortMs: Date.UTC(start.year, start.month - 1, start.day, 0, 0, 0)
        });
      } else {
        const startMs = start.utcDate.getTime();
        const endMs = end ? end.utcDate.getTime() : startMs + durationMs;

        if (!(startMs < windowEndMs && endMs > windowStartMs)) continue;

        outputEvents.push({
          id: ev.UID || `ics-${startMs}`,
          summary,
          description,
          location,
          status: 'confirmed',
          htmlLink,
          start: { dateTime: start.utcDate.toISOString() },
          end: { dateTime: new Date(endMs).toISOString() },
          _sortMs: startMs
        });
      }
    }
  }

  outputEvents.sort((a, b) => a._sortMs - b._sortMs);
  return outputEvents.slice(0, maxResults).map(({ _sortMs, ...evt }) => evt);
}

export async function fetchGoogleCalendarEvents({ apiKey, calendarId, timeZone, maxResults, monthsAhead = 0 }) {
  const resolvedCalId = (calendarId || DEFAULT_CALENDAR_ID).trim();
  const resolvedTz = (timeZone || DEFAULT_TIMEZONE).trim();
  const resolvedMax = Math.min(Math.max(parseInt(maxResults || '50', 10) || 50, 1), 100);
  const now = new Date();
  const bounds = getMonthWindowBounds(now, resolvedTz, monthsAhead);

  if (apiKey && apiKey.trim()) {
    const params = new URLSearchParams({
      key: apiKey.trim(),
      timeMin: bounds.monthStartUtc.toISOString(),
      timeMax: bounds.nextMonthStartUtc.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: String(resolvedMax),
      timeZone: resolvedTz
    });

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(resolvedCalId)}/events?${params.toString()}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      const err = new Error(data?.error?.message || `Google Calendar API returned HTTP ${response.status}`);
      err.status = response.status;
      throw err;
    }

    return {
      configured: true,
      source: 'google-calendar-api',
      calendarId: resolvedCalId,
      timeZone: resolvedTz,
      monthLabel: bounds.monthLabel,
      events: Array.isArray(data.items) ? data.items : []
    };
  }

  // Default: fetch the public Google Calendar ICS feed (no API key or password needed)
  const icsUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(resolvedCalId)}/public/basic.ics`;
  const response = await fetch(icsUrl);

  if (!response.ok) {
    const err = new Error(
      response.status === 404
        ? `Public calendar feed not found for ${resolvedCalId}. Make sure "Make available to public" is enabled in Google Calendar settings.`
        : `Google Calendar feed returned HTTP ${response.status}`
    );
    err.status = response.status;
    throw err;
  }

  const icsText = await response.text();
  const events = parseIcsToGoogleEvents(icsText, {
    calendarId: resolvedCalId,
    timeZone: resolvedTz,
    maxResults: resolvedMax,
    monthsAhead,
    now
  });

  return {
    configured: true,
    source: 'google-calendar-ics',
    calendarId: resolvedCalId,
    timeZone: resolvedTz,
    monthLabel: bounds.monthLabel,
    events
  };
}

export async function onRequestGet(context) {
  const env = context.env || {};
  const jsonHeaders = {
    'Content-Type': 'application/json; charset=utf-8'
  };

  try {
    const result = await fetchGoogleCalendarEvents({
      apiKey: env.GOOGLE_CALENDAR_API_KEY || '',
      calendarId: env.GOOGLE_CALENDAR_ID || DEFAULT_CALENDAR_ID,
      timeZone: env.GOOGLE_CALENDAR_TIMEZONE || DEFAULT_TIMEZONE,
      maxResults: env.GOOGLE_CALENDAR_MAX_RESULTS || '50'
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...jsonHeaders,
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        configured: true,
        error: error.message || 'Unable to reach Google Calendar right now. Please try again later.'
      }),
      { status: error.status || 502, headers: jsonHeaders }
    );
  }
}
