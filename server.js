import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { searchTicketmaster } from "./providers/ticketmaster.js";
import { searchSeatGeek } from "./providers/seatgeek.js";
import { mergeEvents } from "./providers/mergeEvents.js";

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

    let events = mergeEvents([...ticketmasterEvents, ...seatGeekEvents]);

if (category === "business") {
  events = events.filter(isBusinessEvent);
}

events = events
  .map(cleanEventTime)
  .sort((a, b) => {
    const first = new Date(`${a.date}T${a.time || "00:00"}`);
    const second = new Date(`${b.date}T${b.time || "00:00"}`);
    return first - second;
  });

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
function cleanEventTime(event) {
  return {
    ...event,
    time: event.time ? event.time.slice(0, 5) : ""
  };
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

  return searches.filter(Boolean).map((label) => ({
    label,
    url: `https://www.google.com/search?q=${encodeURIComponent(label)}`
  }));
}

function googleCategoryText(category) {
  switch (category) {
    case "concerts": return "concerts";
    case "sports": return "sports";
    case "arts": return "arts theatre comedy";
    case "festivals": return "festivals community events";
    case "business": return "business networking conferences";
    default: return "events";
  }
}

function isBusinessEvent(event) {
  const text = [event.title, event.venue, event.city].join(" ").toLowerCase();

  const businessWords = [
    "business", "networking", "conference", "expo", "summit", "workshop",
    "seminar", "career", "job fair", "trade show", "entrepreneur", "startup",
    "investment", "marketing", "leadership", "professional"
  ];

  return businessWords.some((word) => text.includes(word));
}

app.listen(PORT, () => {
  console.log(`Event Radar Web running at http://localhost:${PORT}`);
});