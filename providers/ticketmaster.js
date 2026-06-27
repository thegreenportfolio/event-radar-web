export async function searchTicketmaster({ countryCode, city, category, startDate, endDate, keyword }) {
  const apiKey = process.env.TICKETMASTER_API_KEY;

  if (!apiKey) {
    console.error("Missing Ticketmaster API key.");
    return [];
  }

  const params = new URLSearchParams({
    apikey: apiKey,
    countryCode,
    size: "200",
    sort: "date,asc",
    locale: "*"
  });

  const citySearchCountries = ["CA", "US", "GB"];

  const ticketmasterKeywordCityAliases = {
    ES: {
      Seville: "Sevilla",
      Cordoba: "Córdoba",
      "A Coruña": "La Coruña",
      Gijon: "Gijón",
      Malaga: "Málaga",
      "San Sebastian": "San Sebastián"
    },
    IT: {
      Rome: "Roma",
      Milan: "Milano",
      Florence: "Firenze"
    },
    PT: {
      Lisbon: "Lisboa"
    },
    RO: {
      Bucharest: "Bucuresti",
      "Cluj-Napoca": "Cluj",
      "Timișoara": "Timisoara",
      "Iași": "Iasi",
      "Brașov": "Brasov",
      "Constanța": "Constanta"
    }
  };

  const searchCity =
    ticketmasterKeywordCityAliases[countryCode]?.[city] || city;

  if (citySearchCountries.includes(countryCode)) {
    params.set("city", city);

    if (keyword.trim()) {
      params.set("keyword", keyword.trim());
    } else if (category === "business") {
      params.set("keyword", "business networking conference expo workshop summit");
    }
  } else {
    if (category === "business" && !keyword.trim()) {
      params.set("keyword", `${searchCity} business networking conference expo workshop summit`);
    } else {
      params.set("keyword", keyword.trim() || searchCity);
    }
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

  let rawEvents = [];

  for (let page = 0; page < 3; page++) {
    params.set("page", String(page));

    const url = `https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error("Ticketmaster error:", data);
      continue;
    }

    rawEvents.push(...(data?._embedded?.events || []));
  }

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
      if (citySearchCountries.includes(countryCode)) {
        return true;
      }

      return event.city
        .toLowerCase()
        .includes(searchCity.toLowerCase());
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