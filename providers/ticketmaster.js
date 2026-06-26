export async function searchTicketmaster({ countryCode, city, category, startDate, endDate, keyword }) {
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
    const extendedEnd = addDays(endDate, 1);
    params.set("endDateTime", `${extendedEnd}T23:59:59Z`);
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

  return rawEvents
    .map((event) => {
      const venue = event?._embedded?.venues?.[0];

      return {
  id: `ticketmaster-${event.id}`,
  provider: "Ticketmaster",
  title: event.name || "Untitled Event",
  date: event.dates?.start?.localDate || "",
  time: event.dates?.start?.localTime
    ? event.dates.start.localTime.slice(0, 5)
    : "",
  venue: venue?.name || "",
  address: venue?.address?.line1 || "",
  city: venue?.city?.name || city,
  country: venue?.country?.countryCode || countryCode,
  url: event.url || "",
  image: event.images?.[0]?.url || ""
};
    })
    .filter((event) => {
      if (!startDate || !endDate || !event.date) {
        return true;
      }

      return event.date >= startDate && event.date <= endDate;
    });
}

function ticketmasterSegmentName(category) {
  switch (category) {
    case "concerts": return "Music";
    case "sports": return "Sports";
    case "arts": return "Arts & Theatre";
    case "festivals": return "Miscellaneous";
    default: return "";
  }
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split("T")[0];
}