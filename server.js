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

    const apiKey = process.env.TICKETMASTER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Missing Ticketmaster API key. Add TICKETMASTER_API_KEY to your .env file."
      });
    }

    const params = new URLSearchParams({
      apikey: apiKey,
      countryCode,
      city,
      size: "40",
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

    const ticketmasterUrl =
      `https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`;

    const response = await fetch(ticketmasterUrl);
    const data = await response.json();

    if (!response.ok) {
      console.error("Ticketmaster error:", data);

      return res.status(response.status).json({
        error: "Ticketmaster search failed."
      });
    }

    const rawEvents = data?._embedded?.events || [];

let events = rawEvents.map((event) => {
  const venue = event?._embedded?.venues?.[0];

  return {
    id: event.id,
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

    res.json({
      events,
      googleFallbackLinks
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Event search failed."
    });
  }
});

function ticketmasterSegmentName(category) {
  switch (category) {
    case "all":
      return "";
    case "concerts":
      return "Music";
    case "sports":
      return "Sports";
    case "arts":
      return "Arts & Theatre";
    case "festivals":
      return "Miscellaneous";
    case "business":
      return "";
    default:
      return "";
  }
}

function buildGoogleFallbackLinks({ city, category, startDate, endDate, keyword }) {
  const categoryText = googleCategoryText(category);

  const searches = [
    `${categoryText} events in ${city}`,
    `${categoryText} in ${city} ${startDate || ""} ${endDate || ""}`,
    `things to do in ${city}`,
    keyword ? `${keyword} events in ${city}` : ""
  ].filter(Boolean);

  return searches.map((label) => ({
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
  const text = [
    event.title,
    event.venue,
    event.city
  ]
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