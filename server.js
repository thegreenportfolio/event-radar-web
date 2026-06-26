import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/events", async (req, res) => {
  try {
    const {
      countryCode = "CA",
      city = "Calgary",
      category = "all",
      startDate,
      endDate,
      keyword = ""
    } = req.query;

    const [ticketmasterEvents, seatGeekEvents] = await Promise.all([
      searchTicketmaster({ countryCode, city, category, startDate, endDate, keyword }),
      searchSeatGeek({ countryCode, city, category, startDate, endDate, keyword })
    ]);

    let events = dedupeEvents([...ticketmasterEvents, ...seatGeekEvents]);

    if (category === "business") {
      events = events.filter(isBusinessEvent);
    }

    const googleFallbackLinks = buildGoogleFallbackLinks({
      city,
      category,
      startDate,
      endDate,
      keyword
    });

    res.json({ events, googleFallbackLinks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Event search failed." });
  }
});

async function searchTicketmaster({ countryCode, city, category, startDate, endDate, keyword }) {
  const apiKey = process.env.TICKETMASTER_API_KEY;

  if (!apiKey) {
    console.error("Missing Ticketmaster API key.");
    return [];
  }

  const params = new URLSearchParams({
    apikey: apiKey,
    countryCode,
    city,
    size: "200",
    sort: "date,asc"
  });

  if (keyword.trim()) {
    params.set("keyword", keyword.trim());
  } else if (category === "business") {
    params.set("keyword", "business networking conference expo workshop summit");
  }

  if (startDate) {
    params.set("startDateTime", `${startDate}T00:00:00Z`);
  }

  if (endDate) {
    params.set("endDateTime", `${endDate}T23:59:59Z`);
  }

  const segmentName = ticketmasterSegmentName(category);

  if (segmentName) {
    params.set("segmentName", segmentName);
  }

  const url = `https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`;
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    console.error("Ticketmaster error:", data);
    return [];
  }

  const rawEvents = data?._embedded?.events || [];

  return rawEvents.map((event) => {
    const venue = event?._embedded?.venues?.[0];

    return {
      id: `ticketmaster-${event.id}`,
      provider: "Ticketmaster",
      title: event.name || "Untitled Event",
      date: event.dates?.start?.localDate || "",
      time: event.dates?.start?.localTime || "",
      venue: venue?.name || "",
      city: venue?.city?.name || city,
      country: venue?.country?.countryCode || countryCode,
      url: event.url || "",
      image: event.images?.[0]?.url || ""
    };
  });
}

async function searchSeatGeek({ countryCode, city, category, startDate, endDate, keyword }) {
  const clientId = process.env.SEATGEEK_CLIENT_ID;
  const clientSecret = process.env.SEATGEEK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return [];
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    "venue.city": city,
    "datetime_utc.gte": `${startDate}T00:00:00Z`,
    "datetime_utc.lte": `${endDate}T23:59:59Z`,
    per_page: "50",
    sort: "datetime_utc.asc"
  });

  const type = seatGeekType(category);

  if (type) {
    params.set("type", type);
  }

  if (keyword.trim()) {
    params.set("q", keyword.trim());
  }

  const url = `https://api.seatgeek.com/2/events?${params.toString()}`;
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    console.error("SeatGeek error:", data);
    return [];
  }

  return (data.events || []).map((event) => ({
    id: `seatgeek-${event.id}`,
    provider: "SeatGeek",
    title: event.title || "Untitled Event",
    date: event.datetime_local ? event.datetime_local.split("T")[0] : "",
    time: event.datetime_local ? event.datetime_local.split("T")[1] : "",
    venue: event.venue?.name || "",
    city: event.venue?.city || city,
    country: countryCode,
    url: event.url || "",
    image: event.performers?.[0]?.image || ""
  }));
}

function ticketmasterSegmentName(category) {
  switch (category) {
    case "concerts":
      return "Music";
    case "sports":
      return "Sports";
    case "arts":
      return "Arts & Theatre";
    case "festivals":
      return "Miscellaneous";
    default:
      return "";
  }
}

function seatGeekType(category) {
  switch (category) {
    case "sports":
      return "sports";
    case "concerts":
      return "concert";
    case "arts":
      return "theater";
    default:
      return "";
  }
}

function dedupeEvents(events) {
  const seen = new Set();

  return events.filter((event) => {
    const key = [
      normalizeText(event.title),
      normalizeText(event.venue),
      event.date
    ].join("|");

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildGoogleFallbackLinks({ city, category, startDate, endDate, keyword }) {
  const categoryText = googleCategoryText(category);

  const searches =
    category === "all"
      ? [
          `events in ${city}`,
          `things to do in ${city}`,
          `events in ${city} ${startDate || ""} ${endDate || ""}`,
          keyword ? `${keyword} events in ${city}` : ""
        ]
      : [
          `${categoryText} events in ${city}`,
          `${categoryText} in ${city} ${startDate || ""} ${endDate || ""}`,
          `things to do in ${city}`,
          keyword ? `${keyword} events in ${city}` : ""
        ];

  return searches
    .filter(Boolean)
    .map((label) => ({
      label,
      url: `https://www.google.com/search?q=${encodeURIComponent(label)}`
    }));
}

function googleCategoryText(category) {
  switch (category) {
    case "concerts":
      return "concerts";
    case "sports":
      return "sports";
    case "arts":
      return "arts theatre comedy";
    case "festivals":
      return "festivals community events";
    case "business":
      return "business networking conferences";
    default:
      return "events";
  }
}

function isBusinessEvent(event) {
  const text = [event.title, event.venue, event.city]
    .join(" ")
    .toLowerCase();

  const businessWords = [
    "business",
    "networking",
    "conference",
    "expo",
    "summit",
    "workshop",
    "seminar",
    "career",
    "job fair",
    "trade show",
    "entrepreneur",
    "startup",
    "investment",
    "marketing",
    "leadership",
    "professional"
  ];

  return businessWords.some((word) => text.includes(word));
}

app.listen(PORT, () => {
  console.log(`Event Radar Web running at http://localhost:${PORT}`);
});