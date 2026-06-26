const searchButton = document.getElementById("searchButton");
const clearSavedButton = document.getElementById("clearSavedButton");

const resultsEl = document.getElementById("results");
const savedEventsEl = document.getElementById("savedEvents");
const resultCountEl = document.getElementById("resultCount");
const appBannerEl = document.getElementById("appBanner");

const countryCodeSelect = document.getElementById("countryCode");
const citySelect = document.getElementById("city");

const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");

let currentResults = [];
let currentFallbackLinks = [];
let currentPage = 1;
const eventsPerPage = 20;

const cityOptionsByCountry = {
  AU: ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Canberra", "Gold Coast"],

  AT: ["Vienna"],

  BE: ["Brussels"],

  CA: [
    "Calgary", "Edmonton", "Red Deer", "Lethbridge", "Fort McMurray",
    "Vancouver", "Surrey", "Burnaby", "Richmond", "Victoria", "Kelowna", "Abbotsford", "Nanaimo", "Whistler",
    "Winnipeg",
    "Saskatoon", "Regina",
    "Toronto", "Mississauga", "Brampton", "Hamilton", "Ottawa", "London", "Kitchener", "Waterloo", "Windsor",
    "Markham", "Vaughan", "Richmond Hill", "Oakville", "Burlington", "Oshawa", "Barrie", "Guelph", "Kingston",
    "Niagara Falls", "St. Catharines",
    "Montreal", "Quebec City", "Laval", "Gatineau", "Sherbrooke", "Trois-Rivières",
    "Halifax", "Moncton", "Fredericton", "Saint John", "Charlottetown", "St. John's"
  ],

  CH: ["Zurich"],

  CZ: ["Prague", "Brno"],

  DE: ["Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt"],

  DK: ["Copenhagen"],

  ES: [
    "Madrid", "Barcelona", "Valencia", "Seville", "Malaga", "Bilbao", "Zaragoza", "Alicante",
    "Granada", "Cordoba", "Murcia", "Palma", "San Sebastian", "Pamplona", "Valladolid",
    "Vigo", "A Coruña", "Santander", "Oviedo", "Gijon", "Tenerife", "Las Palmas"
  ],

  FI: ["Helsinki", "Tampere"],

  FR: ["Paris", "Lyon", "Marseille", "Toulouse", "Nice"],

  GB: [
    "London", "Manchester", "Birmingham", "Liverpool", "Leeds", "Sheffield", "Bristol",
    "Newcastle", "Nottingham", "Leicester", "Brighton", "Oxford", "Cambridge",
    "Southampton", "Portsmouth", "Glasgow", "Edinburgh", "Aberdeen", "Dundee",
    "Cardiff", "Swansea", "Belfast"
  ],

  IE: ["Dublin", "Cork", "Galway", "Limerick", "Waterford", "Kilkenny"],

  IT: ["Rome", "Milan"],

  MX: ["Mexico City", "Guadalajara", "Monterrey"],

  NL: ["Amsterdam", "Rotterdam"],

  NO: ["Oslo"],

  NZ: ["Auckland", "Wellington", "Christchurch", "Queenstown"],

  PL: ["Warsaw"],

  PT: ["Lisbon"],

  RO: ["Bucharest", "Cluj-Napoca", "Timișoara", "Iași", "Brașov", "Constanța"],

  SE: ["Stockholm"],

  US: [
    "New York", "Buffalo", "Rochester", "Albany", "Syracuse",
    "Newark", "Jersey City", "Atlantic City", "Camden", "Trenton",
    "Los Angeles", "San Diego", "San Jose", "San Francisco", "Sacramento", "Fresno", "Long Beach", "Oakland",
    "Bakersfield", "Anaheim", "Santa Ana", "Irvine", "Riverside", "Palm Springs",
    "Chicago", "Aurora", "Naperville", "Rockford",
    "Houston", "San Antonio", "Dallas", "Austin", "Fort Worth", "El Paso", "Arlington", "Corpus Christi", "Plano", "Frisco", "Irving",
    "Miami", "Orlando", "Tampa", "Jacksonville", "Fort Lauderdale", "St. Petersburg", "West Palm Beach", "Tallahassee",
    "Philadelphia", "Pittsburgh", "Allentown", "Harrisburg",
    "Phoenix", "Tucson", "Mesa", "Scottsdale", "Tempe",
    "Columbus", "Cleveland", "Cincinnati", "Toledo", "Dayton",
    "Charlotte", "Raleigh", "Durham", "Greensboro", "Winston-Salem", "Asheville", "Wilmington",
    "Atlanta", "Savannah", "Augusta", "Athens",
    "Seattle", "Tacoma", "Spokane", "Bellevue",
    "Denver", "Colorado Springs", "Boulder", "Fort Collins",
    "Boston", "Cambridge", "Worcester", "Springfield",
    "Washington",
    "Nashville", "Memphis", "Knoxville", "Chattanooga",
    "Detroit", "Grand Rapids", "Ann Arbor", "Lansing",
    "Portland", "Eugene", "Salem", "Bend",
    "Las Vegas", "Reno",
    "Kansas City", "St. Louis", "Columbia",
    "Baltimore", "Annapolis",
    "Milwaukee", "Madison", "Green Bay",
    "Minneapolis", "Saint Paul", "Duluth",
    "New Orleans", "Baton Rouge", "Lafayette",
    "Virginia Beach", "Richmond", "Norfolk", "Alexandria", "Charlottesville",
    "Charleston", "Greenville", "Myrtle Beach",
    "Indianapolis", "Fort Wayne", "South Bend",
    "Louisville", "Lexington",
    "Oklahoma City", "Tulsa",
    "Birmingham", "Huntsville", "Mobile", "Montgomery",
    "Salt Lake City", "Park City", "Provo",
    "Albuquerque", "Santa Fe",
    "Omaha", "Lincoln",
    "Wichita", "Overland Park", "Topeka",
    "Des Moines", "Cedar Rapids", "Iowa City",
    "Little Rock", "Fayetteville",
    "Hartford", "New Haven", "Stamford",
    "Providence", "Manchester", "Burlington", "Boise", "Honolulu", "Anchorage"
  ]
};

const today = new Date();
const nextWeek = new Date();
nextWeek.setDate(today.getDate() + 7);

startDateInput.value = formatDateInput(today);
endDateInput.value = formatDateInput(nextWeek);
endDateInput.min = startDateInput.value;

startDateInput.addEventListener("change", syncEndDateWithStartDate);
endDateInput.addEventListener("change", syncEndDateWithStartDate);

searchButton.addEventListener("click", searchEvents);
clearSavedButton.addEventListener("click", clearSavedEvents);
countryCodeSelect.addEventListener("change", updateCityOptions);

updateCityOptions();
renderSavedEvents();

function formatDateInput(date) {
  return date.toISOString().split("T")[0];
}
function syncEndDateWithStartDate() {
  endDateInput.min = startDateInput.value;

  if (!endDateInput.value || endDateInput.value < startDateInput.value) {
    const newEndDate = new Date(`${startDateInput.value}T00:00:00`);
    newEndDate.setDate(newEndDate.getDate() + 7);
    endDateInput.value = formatDateInput(newEndDate);
  }
}
function updateCityOptions() {
  const cities = cityOptionsByCountry[countryCodeSelect.value] || [];

  citySelect.innerHTML = cities
    .map((city) => `<option value="${escapeHtml(city)}">${escapeHtml(city)}</option>`)
    .join("");
}

async function searchEvents() {
  const countryCode = countryCodeSelect.value;
  const city = citySelect.value;
  const category = document.getElementById("category").value;
  const keyword = document.getElementById("keyword").value.trim();
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;

  if (!city) {
    resultsEl.innerHTML = `<div class="empty">Please select a city.</div>`;
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
    const googleFallbackLinks = data.googleFallbackLinks || [];

    resultCountEl.textContent =
      `${events.length} event${events.length === 1 ? "" : "s"}`;

    currentResults = events;
    currentFallbackLinks = googleFallbackLinks;
    currentPage = 1;

    renderResults(currentResults, currentFallbackLinks);
    renderAppBanner();
  } catch (error) {
    console.error(error);
    resultsEl.innerHTML =
      `<div class="empty">Could not search events. Check your API key or server.</div>`;
    resultCountEl.textContent = "0 events";
  }
}

function renderResults(events, googleFallbackLinks = []) {
  const shouldShowFallback = events.length < 3;
  const startIndex = (currentPage - 1) * eventsPerPage;
  const pageEvents = events.slice(startIndex, startIndex + eventsPerPage);

  let html = "";

  if (events.length === 0) {
    html += `<div class="empty">No events found. Try another date range or city.</div>`;
  } else {
    html += `<div class="empty">Showing ${startIndex + 1}-${Math.min(startIndex + eventsPerPage, events.length)} of ${events.length} events</div>`;
    html += pageEvents.map((event) => eventCard(event, false)).join("");
    html += paginationControls(events.length);
  }

  if (shouldShowFallback && googleFallbackLinks.length > 0) {
    html += googleFallbackSection(googleFallbackLinks);
  }

  resultsEl.innerHTML = html;

  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      currentPage = Number(button.dataset.page);
      renderResults(currentResults, currentFallbackLinks);
      resultsEl.scrollIntoView({ behavior: "smooth" });
    });
  });

  document.querySelectorAll("[data-save-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const event = events.find((item) => item.id === button.dataset.saveId);

      if (event) {
        saveEvent(event);
      }
    });
  });

  attachCalendarButtons(events);
}

function paginationControls(totalEvents) {
  const totalPages = Math.ceil(totalEvents / eventsPerPage);

  if (totalPages <= 1) return "";

  return `
    <div class="pagination">
      ${Array.from({ length: totalPages }, (_, index) => {
        const page = index + 1;

        return `
          <button
            class="${page === currentPage ? "active-page" : ""}"
            data-page="${page}">
            ${page}
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function googleFallbackSection(links) {
  return `
    <article class="event-card fallback-card">
      <h3>Search More Places</h3>
      <p>Not many results found from Ticketmaster. Try these Google searches for local event pages.</p>

      <div class="event-actions">
        ${links
          .map((link) => `
            <a href="${link.url}" target="_blank" rel="noopener">
              ${escapeHtml(link.label)}
            </a>
          `)
          .join("")}
      </div>
    </article>
  `;
}

function renderAppBanner() {
  if (!appBannerEl) return;

  appBannerEl.innerHTML = `
    <section class="apps-banner">
      <div class="apps-banner-header">
        <div>
          <h2>More from The Green Portfolio</h2>
          <p>Explore more simple apps made for everyday fun and activity.</p>
        </div>
      </div>

      <div class="apps-grid">
        <a class="app-card" href="https://apps.apple.com/app/bike-ride-green/id6753626587" target="_blank" rel="noopener">
          <div class="app-icon">
            <img src="images/bike-ride-green.png" alt="Bike Ride Green app icon">
          </div>
          <h3>Bike Ride Green</h3>
          <span>Track rides, progress, and personal cycling history.</span>
          <strong>View on App Store</strong>
        </a>

        <a class="app-card" href="https://apps.apple.com/app/trivia-maze/id6757496312" target="_blank" rel="noopener">
          <div class="app-icon">
            <img src="images/trivia-maze.png" alt="Trivia Maze app icon">
          </div>
          <h3>Trivia Maze</h3>
          <span>Trivia meets maze gameplay with solo and party modes.</span>
          <strong>View on App Store</strong>
        </a>

        <a class="app-card" href="https://apps.apple.com/app/goal-goal-goal/id6756977094" target="_blank" rel="noopener">
          <div class="app-icon">
            <img src="images/goal-goal-goal.png" alt="GOAL! GOAL! GOAL! app icon">
          </div>
          <h3>GOAL! GOAL! GOAL!</h3>
          <span>A simple football game for quick casual play.</span>
          <strong>View on App Store</strong>
        </a>
      </div>
    </section>
  `;
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

      if (event) {
        downloadICS(event);
      }
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