const searchButton = document.getElementById("searchButton");
const clearSavedButton = document.getElementById("clearSavedButton");

const resultsEl = document.getElementById("results");
const savedEventsEl = document.getElementById("savedEvents");
const resultCountEl = document.getElementById("resultCount");

const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");

const today = new Date();
const nextWeek = new Date();
nextWeek.setDate(today.getDate() + 7);

startDateInput.value = formatDateInput(today);
endDateInput.value = formatDateInput(nextWeek);

searchButton.addEventListener("click", searchEvents);
clearSavedButton.addEventListener("click", clearSavedEvents);

renderSavedEvents();

function formatDateInput(date) {
  return date.toISOString().split("T")[0];
}

async function searchEvents() {
  const countryCode = document.getElementById("countryCode").value;
  const city = document.getElementById("city").value.trim();
  const category = document.getElementById("category").value;
  const keyword = document.getElementById("keyword").value.trim();
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;

  if (!city) {
    resultsEl.innerHTML = `<div class="empty">Please enter a city.</div>`;
    return;
  }

  resultsEl.innerHTML = `<div class="empty">Searching events...</div>`;
  resultCountEl.textContent = "Searching...";

  const params = new URLSearchParams({
    countryCode,
    city,
    category,
    keyword,
    startDate,
    endDate
  });

  try {
    const response = await fetch(`/api/events?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Search failed");
    }

    const events = data.events || [];

    resultCountEl.textContent =
      `${events.length} event${events.length === 1 ? "" : "s"}`;

    renderResults(events);
  } catch (error) {
    console.error(error);
    resultsEl.innerHTML =
      `<div class="empty">Could not search events. Check your API key or server.</div>`;
    resultCountEl.textContent = "0 events";
  }
}

function renderResults(events) {
  if (events.length === 0) {
    resultsEl.innerHTML = `<div class="empty">No events found. Try another date range or city.</div>`;
    return;
  }

  resultsEl.innerHTML = events.map((event) => eventCard(event, false)).join("");

  document.querySelectorAll("[data-save-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const event = events.find((item) => item.id === button.dataset.saveId);
      saveEvent(event);
    });
  });

  attachCalendarButtons(events);
}

function eventCard(event, isSaved) {
  const dateText = [event.date, event.time].filter(Boolean).join(" at ");

  return `
    <article class="event-card">
      <h3>${escapeHtml(event.title)}</h3>
      <p>${escapeHtml(event.provider || "Event Provider")}</p>
      <p>${escapeHtml(dateText || "Date unavailable")}</p>
      <p>${escapeHtml(event.venue || "Venue unavailable")}</p>
      <p>${escapeHtml(event.city || "")}, ${escapeHtml(event.country || "")}</p>

      <div class="event-actions">
        ${
          event.url
            ? `<a href="${event.url}" target="_blank" rel="noopener">Open Website</a>`
            : ""
        }

        <button data-calendar-id="${event.id}">Add to Calendar</button>

        ${
          isSaved
            ? `<button class="secondary-button" data-remove-id="${event.id}">Remove</button>`
            : `<button class="secondary-button" data-save-id="${event.id}">Save Event</button>`
        }
      </div>
    </article>
  `;
}

function getSavedEvents() {
  return JSON.parse(localStorage.getItem("eventRadarSavedEvents") || "[]");
}

function setSavedEvents(events) {
  localStorage.setItem("eventRadarSavedEvents", JSON.stringify(events));
}

function saveEvent(event) {
  const saved = getSavedEvents();

  const alreadySaved = saved.some((item) => item.id === event.id);

  if (!alreadySaved) {
    saved.push(event);
    setSavedEvents(saved);
    renderSavedEvents();
  }
}

function renderSavedEvents() {
  const saved = getSavedEvents();

  if (saved.length === 0) {
    savedEventsEl.innerHTML = `<div class="empty">No saved events yet.</div>`;
    return;
  }

  savedEventsEl.innerHTML = saved.map((event) => eventCard(event, true)).join("");

  document.querySelectorAll("[data-remove-id]").forEach((button) => {
    button.addEventListener("click", () => {
      removeSavedEvent(button.dataset.removeId);
    });
  });

  attachCalendarButtons(saved);
}

function removeSavedEvent(eventId) {
  const saved = getSavedEvents().filter((event) => event.id !== eventId);
  setSavedEvents(saved);
  renderSavedEvents();
}

function clearSavedEvents() {
  setSavedEvents([]);
  renderSavedEvents();
}

function attachCalendarButtons(events) {
  document.querySelectorAll("[data-calendar-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const event = events.find((item) => item.id === button.dataset.calendarId);
      downloadICS(event);
    });
  });
}

function downloadICS(event) {
  const start = makeICSDate(event.date, event.time);
  const endDate = new Date(start.rawDate);
  endDate.setHours(endDate.getHours() + 2);

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Event Radar//Event Radar Web//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@eventradar`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${start.icsDate}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${cleanICS(event.title)}`,
    `LOCATION:${cleanICS([event.venue, event.city, event.country].filter(Boolean).join(", "))}`,
    `DESCRIPTION:${cleanICS(event.url || "Saved from Event Radar")}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFileName(event.title)}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function makeICSDate(dateString, timeString) {
  const date = dateString || new Date().toISOString().split("T")[0];
  const time = timeString || "09:00:00";
  const rawDate = new Date(`${date}T${time}`);

  return {
    rawDate,
    icsDate: formatICSDate(rawDate)
  };
}

function formatICSDate(date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function cleanICS(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function safeFileName(value) {
  return String(value || "event")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}