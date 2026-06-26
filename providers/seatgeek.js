export async function searchSeatGeek({ countryCode, city, category, startDate, endDate, keyword }) {
  const clientId = process.env.SEATGEEK_CLIENT_ID;
  const clientSecret = process.env.SEATGEEK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return [];
  }

  const today = new Date().toISOString().split("T")[0];
  const safeStartDate = startDate || today;
  const safeEndDate = endDate || safeStartDate;

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    "venue.city": city,
    "datetime_local.gte": `${safeStartDate}T00:00:00`,
    "datetime_local.lte": `${safeEndDate}T23:59:59`,
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

function seatGeekType(category) {
  switch (category) {
    case "sports": return "sports";
    case "concerts": return "concert";
    case "arts": return "theater";
    default: return "";
  }
}