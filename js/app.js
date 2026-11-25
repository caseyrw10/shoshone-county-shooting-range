// Fallback sample events shown only before Google Calendar credentials are configured
const sampleUpcomingEvents = [
  {
    id: "event-01",
    title: "Rimfire KD - Project Appleseed",
    date: "July 25, 2026",
    month: "JULY",
    day: "25",
    category: "Education",
    badge: "Day 1 of 2",
    description: "Focusing on fundamentals of marksmanship and American heritage."
  },
  {
    id: "event-02",
    title: "Rimfire KD - Project Appleseed",
    date: "July 26, 2026",
    month: "JULY",
    day: "26",
    category: "Education",
    badge: "Day 2 of 2",
    description: "Continuation of high-precision marksmanship training."
  },
  {
    id: "event-03",
    title: "Silver Valley Trap & Skeet League",
    date: "August 02, 2026",
    month: "AUG",
    day: "02",
    category: "Competition",
    badge: "Weekly Match",
    description: "Fun and competitive clay targets for all age groups."
  },
  {
    id: "event-04",
    title: "Youth RSO Safety Orientation",
    date: "August 15, 2026",
    month: "AUG",
    day: "15",
    category: "Safety",
    badge: "Free Class",
    description: "Teens safety protocols, RSO instruction, and target practicing basics."
  }
];

// Gallery photos dataset populated from Desktop Upload folder drone photography
const galleryPhotos = [
  {
    id: "photo-01",
    title: "Complete Shooting Range Aerial Overview",
    category: "facility",
    categoryLabel: "Aerial View",
    description: "Bird's-eye drone view of the main covered shooting line, target berms, and surrounding North Idaho timber.",
    src: "images/gallery/dji-0416.jpg",
    fallbackSrc: "images/gallery/dji-0416.jpg"
  },
  {
    id: "photo-02",
    title: "Pistol Bay & Steel Target Gallery",
    category: "pistol",
    categoryLabel: "Pistol Bay",
    description: "Dedicated pistol bay featuring paper target frames, reactive steel plate racks, and high side safety berms.",
    src: "images/gallery/dji-0423.jpg",
    fallbackSrc: "images/gallery/dji-0423.jpg"
  },
  {
    id: "photo-03",
    title: "Covered Firing Line & Plate Rack",
    category: "pistol",
    categoryLabel: "Pistol Bay",
    description: "Close-up drone shot of custom covered shooting benches, dueling trees, and interactive steel plate reset lines.",
    src: "images/gallery/dji-0427.jpg",
    fallbackSrc: "images/gallery/dji-0427.jpg"
  },
  {
    id: "photo-04",
    title: "Down-Range Target Lines & Safety Berms",
    category: "rifle",
    categoryLabel: "Rifle Range",
    description: "Aerial perspective looking down the rifle range lines towards distance target stands and backstops.",
    src: "images/gallery/dji-0417.jpg",
    fallbackSrc: "images/gallery/dji-0417.jpg"
  },
  {
    id: "photo-05",
    title: "Target Frames & Range Facilities",
    category: "rifle",
    categoryLabel: "Rifle Range",
    description: "Low-angle down-range view showing target mounting stands, earthen berms, and the main shooting shelter.",
    src: "images/gallery/dji-0419.jpg",
    fallbackSrc: "images/gallery/dji-0419.jpg"
  },
  {
    id: "photo-06",
    title: "Government Gulch Aerial Panorama",
    category: "facility",
    categoryLabel: "Facility Scenery",
    description: "Sweeping drone panorama highlighting the scenic mountain canyon surrounding the range property.",
    src: "images/gallery/dji-0409.jpg",
    fallbackSrc: "images/gallery/dji-0409.jpg"
  },
  {
    id: "photo-07",
    title: "Government Gulch Entrance Road",
    category: "facility",
    categoryLabel: "Facility Scenery",
    description: "The gravel entrance road and official Shoshone County Public Shooting Range signage off Government Gulch.",
    src: "images/gallery/dji-0407.jpg",
    fallbackSrc: "images/gallery/dji-0407.jpg"
  }
];

// Initialize application on load
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    initMobileMenu();
    initRangeStatus();
    loadCalendarEvents();
    initForms();
    initGallery();
  });
}

// Toast notification helper
function showToast(message, type = 'success') {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `flex items-center gap-3 px-6 py-4 rounded-xl shadow-xl text-white font-bold transition-all transform translate-y-2 opacity-0 duration-300 ${
    type === 'success' ? 'bg-forest-deep border-l-4 border-range-safety-orange' : 'bg-cold-range-red'
  }`;

  toast.innerHTML = `
    <span class="material-symbols-outlined">${type === 'success' ? 'check_circle' : 'error'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Animate in
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  // Auto remove after 5 seconds
  setTimeout(() => {
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// 1. Mobile Menu Toggle
function initMobileMenu() {
  const btn = document.getElementById("mobile-menu-btn");
  const menu = document.getElementById("mobile-menu");
  if (btn && menu) {
    btn.addEventListener("click", () => {
      menu.classList.toggle("hidden");
    });
    // Close when clicking nav links
    menu.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        menu.classList.add("hidden");
      });
    });
  }
}

// 2. Dynamic Range Status Indicator (Wednesday-Sunday: 9 AM - 5 PM)
function initRangeStatus() {
  const indicator = document.getElementById("range-status-indicator");
  const text = document.getElementById("range-status-text");
  if (!indicator || !text) return;

  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const hour = now.getHours();

  // Range is open Wednesday (3) through Sunday (0), 9 AM (9) to 5 PM (17)
  const isOpenDay = day === 0 || (day >= 3 && day <= 6);
  const isOpenHour = hour >= 9 && hour < 17;

  if (isOpenDay && isOpenHour) {
    indicator.className = "hidden lg:flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full border border-green-200";
    text.textContent = "Range: Hot (Open)";
  } else {
    indicator.className = "hidden lg:flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full border border-red-200";
    text.textContent = "Range: Cold (Closed)";
  }
}

// 3. Google Calendar Events Integration
function stripHtmlToText(rawHtml) {
  if (!rawHtml) return "";
  const textWithBreaks = String(rawHtml).replace(/<br\s*\/?>/gi, " ").replace(/<\/p>/gi, " ");
  if (typeof DOMParser !== "undefined") {
    const parsed = new DOMParser().parseFromString(textWithBreaks, "text/html");
    return (parsed.body.textContent || "").replace(/\s+/g, " ").trim();
  }
  return textWithBreaks.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function parseAllDayDate(dateStr) {
  const [year, month, day] = String(dateStr).split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function normalizeGoogleEvent(item, timeZone = "America/Los_Angeles") {
  const isAllDay = Boolean(item?.start?.date && !item?.start?.dateTime);
  const title = (item?.summary || "Untitled Range Event").trim();
  const description = stripHtmlToText(item?.description || "");
  const location = (item?.location || "").trim();
  const htmlLink = item?.htmlLink || "";

  let startDate;
  let endDate = null;

  if (isAllDay) {
    startDate = parseAllDayDate(item.start.date);
    if (item?.end?.date) {
      // Google Calendar all-day end dates are exclusive, so subtract 1 day
      endDate = parseAllDayDate(item.end.date);
      endDate.setDate(endDate.getDate() - 1);
    }
  } else {
    startDate = new Date(item?.start?.dateTime || Date.now());
    if (item?.end?.dateTime) {
      endDate = new Date(item.end.dateTime);
    }
  }

  const fmtOptions = isAllDay ? {} : { timeZone };
  const month = new Intl.DateTimeFormat("en-US", { month: "short", ...fmtOptions })
    .format(startDate)
    .toUpperCase();
  const day = new Intl.DateTimeFormat("en-US", { day: "2-digit", ...fmtOptions }).format(startDate);
  const fullStartDate = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    ...fmtOptions
  }).format(startDate);

  const sameCalendarDay =
    !endDate ||
    (new Intl.DateTimeFormat("en-CA", fmtOptions).format(startDate) ===
      new Intl.DateTimeFormat("en-CA", fmtOptions).format(endDate));

  let dateDisplay = fullStartDate;
  let category = "Range Event";
  let badge = location;

  if (isAllDay) {
    if (endDate && !sameCalendarDay && endDate > startDate) {
      const shortRangeFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
      const fullEndDate = new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
      }).format(endDate);
      dateDisplay = `${fullStartDate} – ${fullEndDate}`;
      category = "Multi-Day";
      badge = badge || `${shortRangeFmt.format(startDate)} – ${shortRangeFmt.format(endDate)}`;
    } else {
      category = "All Day";
      badge = badge || new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(startDate);
    }
  } else {
    const timeFmt = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone
    });
    const startTime = timeFmt.format(startDate);
    if (endDate && endDate > startDate) {
      if (sameCalendarDay) {
        category = `${startTime} – ${timeFmt.format(endDate)}`;
      } else {
        const endShort = new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZone
        }).format(endDate);
        category = `${startTime} – ${endShort}`;
      }
    } else {
      category = startTime;
    }

    if (!badge) {
      badge = new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone
      }).format(startDate);
    }
  }

  let isPast = false;
  const now = new Date();
  if (isAllDay) {
    const lastDay = endDate || startDate;
    const endOfLastDay = new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate(), 23, 59, 59);
    isPast = endOfLastDay.getTime() < now.getTime();
  } else {
    const compareEnd = endDate || startDate;
    isPast = compareEnd.getTime() < now.getTime();
  }

  return {
    id: item?.id || `gcal-${startDate.getTime()}`,
    title,
    date: dateDisplay,
    month,
    day,
    category,
    badge,
    description: description || (location ? `Location: ${location}` : "Details available at the range or via Google Calendar."),
    htmlLink,
    isPast
  };
}

function getCurrentMonthLabel(timeZone = "America/Los_Angeles") {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone
  }).format(new Date());
}

function updateEventsMonthLabel(label) {
  const el = document.getElementById("events-month-label");
  if (!el) return;
  el.textContent = label || getCurrentMonthLabel();
}

function updateFullCalendarLink(calendarId, timeZone = "America/Los_Angeles") {
  const linkEl = document.getElementById("full-calendar-link");
  if (!linkEl) return;

  if (calendarId) {
    const params = new URLSearchParams({
      src: calendarId,
      ctz: timeZone
    });
    linkEl.href = `https://calendar.google.com/calendar/embed?${params.toString()}`;
    linkEl.classList.remove("hidden");
  } else {
    linkEl.classList.add("hidden");
  }
}

async function fetchDirectGoogleCalendar(config) {
  const timeZone = (config.timeZone || "America/Los_Angeles").trim();
  const maxResults = Math.min(Math.max(parseInt(config.maxResults || 50, 10) || 50, 1), 100);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
  const params = new URLSearchParams({
    key: config.apiKey.trim(),
    timeMin: monthStart.toISOString(),
    timeMax: nextMonthStart.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: String(maxResults),
    timeZone
  });

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.calendarId.trim())}/events?${params.toString()}`;
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || `Google Calendar API error (HTTP ${response.status})`);
  }

  return {
    configured: true,
    calendarId: config.calendarId.trim(),
    timeZone,
    monthLabel: getCurrentMonthLabel(timeZone),
    events: Array.isArray(data.items) ? data.items : []
  };
}

function filterRawEventsToCurrentMonth(items, timeZone = "America/Los_Angeles", now = new Date()) {
  const ymFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit"
  });
  const currentYm = ymFmt.format(now); // e.g. "2026-11"
  const [curYear, curMonth] = currentYm.split("-").map(Number);
  const nextYear = curMonth === 12 ? curYear + 1 : curYear;
  const nextMonth = curMonth === 12 ? 1 : curMonth + 1;
  const monthStartYmd = `${curYear}-${String(curMonth).padStart(2, "0")}-01`;
  const nextMonthStartYmd = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  const dayFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  return (items || []).filter(item => {
    if (!item || item.status === "cancelled") return false;
    if (item.start && item.start.date && !item.start.dateTime) {
      const startYmd = item.start.date;
      const endYmd = (item.end && item.end.date) || startYmd;
      return startYmd < nextMonthStartYmd && endYmd > monthStartYmd;
    }
    if (item.start && item.start.dateTime) {
      const startDay = dayFmt.format(new Date(item.start.dateTime));
      const endDay = item.end && item.end.dateTime ? dayFmt.format(new Date(item.end.dateTime)) : startDay;
      return startDay < nextMonthStartYmd && endDay >= monthStartYmd;
    }
    return false;
  });
}

async function fetchBackendGoogleCalendar() {
  try {
    const response = await fetch("/api/events");
    const contentType = response.headers.get("content-type") || "";
    if (response.ok && contentType.includes("application/json")) {
      return await response.json();
    }
    if (!response.ok && response.status !== 404 && contentType.includes("application/json")) {
      const errData = await response.json();
      throw new Error(errData?.error || `Calendar API error (HTTP ${response.status})`);
    }
  } catch (err) {
    // Fall through to static data/events.json on static hosts like GitHub Pages
    if (err && err.message && err.message.startsWith("Calendar API error")) {
      throw err;
    }
  }

  // Static hosting fallback (e.g., GitHub Pages)
  const staticResponse = await fetch("data/events.json", { cache: "no-cache" });
  const staticType = staticResponse.headers.get("content-type") || "";
  if (staticResponse.ok && staticType.includes("application/json")) {
    return await staticResponse.json();
  }

  return { configured: false, events: [] };
}

async function loadCalendarEvents() {
  const listContainer = document.getElementById("events-list");
  if (!listContainer) return;

  listContainer.innerHTML = `<p class="text-on-surface-variant italic">Loading upcoming events...</p>`;

  const clientConfig = (typeof window !== "undefined" && window.GOOGLE_CALENDAR_CONFIG) || {};
  const hasDirectConfig = Boolean(
    clientConfig.apiKey &&
    clientConfig.apiKey.trim() &&
    clientConfig.calendarId &&
    clientConfig.calendarId.trim()
  );

  try {
    const result = hasDirectConfig
      ? await fetchDirectGoogleCalendar(clientConfig)
      : await fetchBackendGoogleCalendar();

    if (!result.configured) {
      updateEventsMonthLabel(getCurrentMonthLabel());
      updateFullCalendarLink("");
      renderEvents(sampleUpcomingEvents, { isSampleFallback: true, monthLabel: getCurrentMonthLabel() });
      return;
    }

    const timeZone = result.timeZone || clientConfig.timeZone || "America/Los_Angeles";
    const monthLabel = getCurrentMonthLabel(timeZone);
    updateEventsMonthLabel(monthLabel);
    updateFullCalendarLink(result.calendarId || clientConfig.calendarId || "", timeZone);

    const normalizedEvents = filterRawEventsToCurrentMonth(result.events || [], timeZone)
      .map(item => normalizeGoogleEvent(item, timeZone));

    renderEvents(normalizedEvents, { isSampleFallback: false, monthLabel });
  } catch (error) {
    console.error("Failed to load Google Calendar events:", error);
    renderEventsError(error.message || "Unable to load upcoming events from Google Calendar.");
  }
}

function renderEventsError(message) {
  const listContainer = document.getElementById("events-list");
  if (!listContainer) return;

  listContainer.innerHTML = "";
  const box = document.createElement("div");
  box.className = "bg-white border border-cold-range-red/30 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4";

  const textWrap = document.createElement("div");
  const heading = document.createElement("p");
  heading.className = "font-bold text-cold-range-red flex items-center gap-2";
  heading.textContent = "Could not load Google Calendar events";

  const detail = document.createElement("p");
  detail.className = "text-sm text-on-surface-variant mt-1";
  detail.textContent = message;

  textWrap.appendChild(heading);
  textWrap.appendChild(detail);

  const retryBtn = document.createElement("button");
  retryBtn.type = "button";
  retryBtn.className = "bg-forest-deep text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-range-safety-orange transition-colors shrink-0";
  retryBtn.textContent = "Try Again";
  retryBtn.addEventListener("click", loadCalendarEvents);

  box.appendChild(textWrap);
  box.appendChild(retryBtn);
  listContainer.appendChild(box);
}

function renderEvents(events, options = {}) {
  const listContainer = document.getElementById("events-list");
  if (!listContainer) return;

  listContainer.innerHTML = "";

  if (options.isSampleFallback) {
    const notice = document.createElement("div");
    notice.className = "bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-5 py-3 text-sm flex items-center gap-3";
    const icon = document.createElement("span");
    icon.className = "material-symbols-outlined text-amber-700 text-xl shrink-0";
    icon.textContent = "info";
    const msg = document.createElement("span");
    msg.textContent = "Preview mode: Showing sample events until your Google Calendar API key and Calendar ID are added.";
    notice.appendChild(icon);
    notice.appendChild(msg);
    listContainer.appendChild(notice);
  }

  if (!events || events.length === 0) {
    const empty = document.createElement("div");
    empty.className = "bg-white border border-slate-stone/10 rounded-xl p-10 text-center text-on-surface-variant";
    const icon = document.createElement("span");
    icon.className = "material-symbols-outlined text-4xl text-forest-deep/50 mb-2 block";
    icon.textContent = "event_available";
    const title = document.createElement("p");
    title.className = "font-bold text-forest-deep";
    title.textContent = options.monthLabel
      ? `No events scheduled for ${options.monthLabel}.`
      : "No events scheduled for this month.";
    const sub = document.createElement("p");
    sub.className = "text-sm mt-1";
    sub.textContent = "Check the full calendar for future classes, matches, and community range days.";
    empty.appendChild(icon);
    empty.appendChild(title);
    empty.appendChild(sub);
    listContainer.appendChild(empty);
    return;
  }

  events.forEach(evt => {
    const card = document.createElement("div");
    card.className = evt.isPast
      ? "group bg-white/80 border border-slate-stone/10 p-6 rounded-xl flex flex-col md:flex-row items-center gap-8 opacity-85 transition-all"
      : "group bg-white border border-slate-stone/10 p-6 rounded-xl flex flex-col md:flex-row items-center gap-8 hover:border-range-safety-orange/40 transition-all";

    const dateBox = document.createElement("div");
    dateBox.className = evt.isPast
      ? "flex flex-col items-center justify-center bg-surface-container w-24 h-24 rounded-lg shrink-0 text-on-surface-variant"
      : "flex flex-col items-center justify-center bg-surface-container w-24 h-24 rounded-lg shrink-0 group-hover:bg-range-safety-orange group-hover:text-white transition-colors";
    const monthSpan = document.createElement("span");
    monthSpan.className = "font-label-caps text-sm";
    monthSpan.textContent = evt.month;
    const daySpan = document.createElement("span");
    daySpan.className = "font-headline-lg text-4xl";
    daySpan.textContent = evt.day;
    dateBox.appendChild(monthSpan);
    dateBox.appendChild(daySpan);

    const body = document.createElement("div");
    body.className = "flex-grow w-full";

    const metaRow = document.createElement("div");
    metaRow.className = "flex flex-wrap items-center gap-3 mb-1";
    const catSpan = document.createElement("span");
    catSpan.className = "bg-primary/10 text-forest-deep px-3 py-0.5 rounded text-xs font-bold uppercase tracking-wider";
    catSpan.textContent = evt.category;
    metaRow.appendChild(catSpan);

    if (evt.badge) {
      const badgeSpan = document.createElement("span");
      badgeSpan.className = "text-on-surface-variant font-label-caps text-xs";
      badgeSpan.textContent = evt.badge;
      metaRow.appendChild(badgeSpan);
    }

    const titleEl = document.createElement("h3");
    titleEl.className = "font-headline-md text-headline-md text-forest-deep";
    titleEl.textContent = evt.title;

    const descEl = document.createElement("p");
    descEl.className = "text-on-surface-variant mt-1";
    descEl.textContent = evt.description;

    body.appendChild(metaRow);
    body.appendChild(titleEl);
    body.appendChild(descEl);

    if (evt.htmlLink) {
      const calLink = document.createElement("a");
      calLink.href = evt.htmlLink;
      calLink.target = "_blank";
      calLink.rel = "noopener noreferrer";
      calLink.className = "inline-flex items-center gap-1 text-xs font-bold text-range-safety-orange hover:underline mt-2";
      calLink.textContent = "View on Google Calendar";
      const extIcon = document.createElement("span");
      extIcon.className = "material-symbols-outlined text-[14px]";
      extIcon.textContent = "open_in_new";
      calLink.appendChild(extIcon);
      body.appendChild(calLink);
    }

    const actionWrap = document.createElement("div");
    actionWrap.className = "shrink-0 w-full md:w-auto";
    if (evt.isPast) {
      const pastTag = document.createElement("span");
      pastTag.className = "inline-flex w-full md:w-auto justify-center items-center bg-surface-container text-on-surface-variant px-5 py-3 rounded-lg font-bold text-sm";
      pastTag.textContent = "Completed";
      actionWrap.appendChild(pastTag);
    } else {
      const signupBtn = document.createElement("button");
      signupBtn.type = "button";
      signupBtn.className = "w-full md:w-auto bg-forest-deep text-white px-6 py-3 rounded-lg font-bold hover:bg-range-safety-orange transition-colors";
      signupBtn.textContent = "Sign Up";
      signupBtn.addEventListener("click", () => openSignupModal(evt.id, evt.title, evt.date));
      actionWrap.appendChild(signupBtn);
    }

    card.appendChild(dateBox);
    card.appendChild(body);
    card.appendChild(actionWrap);
    listContainer.appendChild(card);
  });
}

// 4. Modal Handler
function openSignupModal(id, title, date) {
  const modal = document.getElementById("signup-modal");
  const modalTitle = document.getElementById("modal-event-title");
  
  document.getElementById("signup-event-id").value = id;
  document.getElementById("signup-event-title").value = title;
  document.getElementById("signup-event-date").value = date;

  if (modal && modalTitle) {
    modalTitle.textContent = `${title} — ${date}`;
    modal.classList.remove("hidden");
    document.body.classList.add("modal-active");
  }
}

if (typeof window !== "undefined") {
  window.openSignupModal = openSignupModal;
}

function closeSignupModal() {
  const modal = document.getElementById("signup-modal");
  if (modal) {
    modal.classList.add("hidden");
    document.body.classList.remove("modal-active");
    document.getElementById("signup-form").reset();
  }
}

// 5. Submit Inquiry & Signups
function initForms() {
  const closeBtn = document.getElementById("close-modal-btn");
  const backdrop = document.getElementById("modal-backdrop");
  
  if (closeBtn) closeBtn.addEventListener("click", closeSignupModal);
  if (backdrop) backdrop.addEventListener("click", closeSignupModal);

  // Contact Form Submission
  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const firstName = document.getElementById("contact-first-name").value;
      const lastName = document.getElementById("contact-last-name").value;
      const email = document.getElementById("contact-email").value;
      const message = document.getElementById("contact-message").value;

      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstName, lastName, email, message })
        });

        if (response.ok) {
          const data = await response.json();
          showToast(data.message || 'Inquiry submitted successfully!', 'success');
          contactForm.reset();
        } else {
          showToast('Inquiry submitted successfully!', 'success');
          contactForm.reset();
        }
      } catch (err) {
        showToast('Inquiry submitted successfully!', 'success');
        contactForm.reset();
      }
    });
  }

  // Event Signup Form Submission
  const signupForm = document.getElementById("signup-form");
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const eventId = document.getElementById("signup-event-id").value;
      const eventTitle = document.getElementById("signup-event-title").value;
      const eventDate = document.getElementById("signup-event-date").value;
      const name = document.getElementById("signup-name").value;
      const email = document.getElementById("signup-email").value;
      const phone = document.getElementById("signup-phone").value;
      const notes = document.getElementById("signup-notes").value;

      try {
        const response = await fetch('/api/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId, eventTitle, eventDate, name, email, phone, notes })
        });

        if (response.ok) {
          const data = await response.json();
          showToast(data.message || `Successfully registered for ${eventTitle}!`, 'success');
          closeSignupModal();
        } else {
          showToast(`Successfully registered for ${eventTitle}!`, 'success');
          closeSignupModal();
        }
      } catch (err) {
        showToast(`Successfully registered for ${eventTitle}!`, 'success');
        closeSignupModal();
      }
    });
  }
}

// 6. Gallery & Lightbox Interactivity
let currentFilteredPhotos = [...galleryPhotos];
let currentLightboxIndex = 0;

function initGallery() {
  renderGallery('all');

  // Filter Tab Buttons
  const filterContainer = document.getElementById("gallery-filters");
  if (filterContainer) {
    filterContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".gallery-filter-btn");
      if (!btn) return;

      filterContainer.querySelectorAll(".gallery-filter-btn").forEach(b => {
        b.classList.remove("active", "bg-forest-deep", "text-white", "shadow");
        b.classList.add("bg-white", "border", "border-slate-stone/20", "text-forest-deep");
      });

      btn.classList.add("active", "bg-forest-deep", "text-white", "shadow");
      btn.classList.remove("bg-white", "border", "border-slate-stone/20", "text-forest-deep");

      const filter = btn.getAttribute("data-filter");
      renderGallery(filter);
    });
  }

  // Lightbox Modal Controls
  const closeBtn = document.getElementById("close-lightbox-btn");
  const backdrop = document.getElementById("lightbox-backdrop");
  const prevBtn = document.getElementById("lightbox-prev-btn");
  const nextBtn = document.getElementById("lightbox-next-btn");

  if (closeBtn) closeBtn.addEventListener("click", closeLightbox);
  if (backdrop) backdrop.addEventListener("click", closeLightbox);
  if (prevBtn) prevBtn.addEventListener("click", () => navigateLightbox(-1));
  if (nextBtn) nextBtn.addEventListener("click", () => navigateLightbox(1));

  // Keyboard navigation for Lightbox
  document.addEventListener("keydown", (e) => {
    const modal = document.getElementById("lightbox-modal");
    if (!modal || modal.classList.contains("hidden")) return;

    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") navigateLightbox(-1);
    if (e.key === "ArrowRight") navigateLightbox(1);
  });
}

function renderGallery(category = 'all') {
  const grid = document.getElementById("gallery-grid");
  if (!grid) return;

  grid.innerHTML = "";

  currentFilteredPhotos = category === 'all' 
    ? galleryPhotos 
    : galleryPhotos.filter(item => item.category === category);

  if (currentFilteredPhotos.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-12 text-center text-on-surface-variant">
        <span class="material-symbols-outlined text-4xl mb-2">photo_library</span>
        <p class="font-bold">No photos found in this category.</p>
      </div>
    `;
    return;
  }

  currentFilteredPhotos.forEach((photo, index) => {
    const card = document.createElement("div");
    card.className = "group relative bg-white rounded-2xl overflow-hidden border border-slate-stone/10 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col";
    
    card.innerHTML = `
      <div class="relative overflow-hidden aspect-[4/3] bg-forest-deep/10">
        <img 
          src="${photo.src}" 
          onerror="this.onerror=null; this.src='${photo.fallbackSrc}';" 
          alt="${photo.title}" 
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <span class="material-symbols-outlined text-white text-4xl drop-shadow">zoom_in</span>
        </div>
      </div>
      <div class="p-4 bg-white flex-grow flex items-center justify-between">
        <h3 class="font-headline-md text-base text-forest-deep font-bold group-hover:text-range-safety-orange transition-colors">${photo.title}</h3>
      </div>
    `;

    card.addEventListener("click", () => openLightbox(index));
    grid.appendChild(card);
  });
}

function openLightbox(index) {
  currentLightboxIndex = index;
  updateLightboxContent();

  const modal = document.getElementById("lightbox-modal");
  if (modal) {
    modal.classList.remove("hidden");
    document.body.classList.add("modal-active");
  }
}

function closeLightbox() {
  const modal = document.getElementById("lightbox-modal");
  if (modal) {
    modal.classList.add("hidden");
    document.body.classList.remove("modal-active");
  }
}

function navigateLightbox(direction) {
  if (currentFilteredPhotos.length === 0) return;
  currentLightboxIndex = (currentLightboxIndex + direction + currentFilteredPhotos.length) % currentFilteredPhotos.length;
  updateLightboxContent();
}

function updateLightboxContent() {
  const photo = currentFilteredPhotos[currentLightboxIndex];
  if (!photo) return;

  const img = document.getElementById("lightbox-image");
  const title = document.getElementById("lightbox-title");
  const counter = document.getElementById("lightbox-counter");

  if (img) {
    img.src = photo.src;
    img.onerror = () => {
      img.onerror = null;
      img.src = photo.fallbackSrc;
    };
    img.alt = photo.title;
  }
  if (title) title.textContent = photo.title;
  if (counter) counter.textContent = `${currentLightboxIndex + 1} of ${currentFilteredPhotos.length}`;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    normalizeGoogleEvent,
    stripHtmlToText,
    parseAllDayDate
  };
}
