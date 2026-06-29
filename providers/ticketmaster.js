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
    MX: {
      "Mexico City": "Mexico City",
      Guadalajara: "Guadalajara",
      Monterrey: "Monterrey",
      Puebla: "Puebla"
    },
    IE: {
      Dublin: "Dublin",
      Cork: "Cork",
      Galway: "Galway",
      Limerick: "Limerick",
      Waterford: "Waterford",
      Kilkenny: "Kilkenny"
    },
    FR: {
      Paris: "Paris",
      Lyon: "Lyon",
      Marseille: "Marseille",
      Toulouse: "Toulouse",
      Nice: "Nice",
      Nantes: "Nantes",
      Lille: "Lille",
      Bordeaux: "Bordeaux",
      Strasbourg: "Strasbourg"
    },
    DE: {
      Berlin: "Berlin",
      Hamburg: "Hamburg",
      Munich: "München",
      Cologne: "Köln",
      Frankfurt: "Frankfurt",
      Düsseldorf: "Düsseldorf",
      Stuttgart: "Stuttgart",
      Leipzig: "Leipzig",
      Dortmund: "Dortmund"
    },
    ES: {
      Madrid: "Madrid",
      Barcelona: "Barcelona",
      Valencia: "Valencia",
      Seville: "Sevilla",
      Malaga: "Málaga",
      Bilbao: "Bilbao",
      Zaragoza: "Zaragoza",
      Alicante: "Alicante",
      Granada: "Granada",
      Cordoba: "Córdoba",
      Murcia: "Murcia",
      Palma: "Palma",
      "San Sebastian": "San Sebastián",
      Pamplona: "Pamplona",
      Valladolid: "Valladolid",
      Vigo: "Vigo",
      "A Coruña": "La Coruña",
      Santander: "Santander",
      Oviedo: "Oviedo",
      Gijon: "Gijón",
      Tenerife: "Santa Cruz de Tenerife",
      "Las Palmas": "Las Palmas"
    },
    NL: {
      Amsterdam: "Amsterdam",
      Rotterdam: "Rotterdam"
    },
    SE: {
      Stockholm: "Stockholm"
    },
    DK: {
      Copenhagen: "Copenhagen"
    },
    NO: {
      Oslo: "Oslo"
    },
    AT: {
      Vienna: "Vienna",
      Graz: "Graz"
    },
    BE: {
      Brussels: "Brussels",
      Antwerp: "Antwerp"
    },
    CZ: {
      Prague: "Prague",
      Brno: "Brno"
    },
    FI: {
      Helsinki: "Helsinki",
      Tampere: "Tampere"
    },
    PL: {
      Warsaw: "Warsaw",
      Krakow: "Krakow"
    },
    IT: {
      Rome: "Roma",
      Milan: "Milano",
      Naples: "Napoli",
      Turin: "Torino",
      Florence: "Firenze"
    },
    PT: {
      Lisbon: "Lisboa"
    },
    CH: {
      Zurich: "Zurich",
      Geneva: "Geneva",
      Basel: "Basel",
      Lausanne: "Lausanne",
      Bern: "Bern"
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

      return ticketmasterCityMatches({
        eventCity: event.city,
        selectedCity: city,
        searchCity,
        countryCode
      });
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

function ticketmasterCityMatches({ eventCity, selectedCity, searchCity, countryCode }) {
  const event = normalizeCityName(eventCity);
  const aliases = ticketmasterCityMatchAliases({
    countryCode,
    selectedCity,
    searchCity
  });

  return aliases.some((alias) => {
    const normalizedAlias = normalizeCityName(alias);

    return (
      event === normalizedAlias ||
      event.includes(normalizedAlias) ||
      normalizedAlias.includes(event)
    );
  });
}

function ticketmasterCityMatchAliases({ countryCode, selectedCity, searchCity }) {
  const aliases = new Set([selectedCity, searchCity]);

  const cityAliases = {
    MX: {
      "Mexico City": [
        "Mexico",
        "México",
        "Ciudad de México",
        "Ciudad de Mexico",
        "Mexico City",
        "México City",
        "CDMX",
        "Mexico CDMX",
        "México CDMX",
        "Distrito Federal",
        "D.F.",
        "DF"
      ],
      Guadalajara: [
        "Guadalajara",
        "Guadalajara, Jalisco",
        "Guadalajara Jalisco",
        "Zapopan"
      ],
      Monterrey: [
        "Monterrey",
        "Monterrey, Nuevo León",
        "Monterrey, Nuevo Leon",
        "Monterrey Nuevo Leon",
        "Guadalupe",
        "San Nicolás de los Garza",
        "San Nicolas de los Garza",
        "Col. Centro Monterrey"
      ],
      Puebla: [
        "Puebla",
        "Puebla City"
      ]
    },
    IE: {
      Dublin: ["Baile Átha Cliath"],
      Cork: ["Corcaigh"],
      Galway: ["Gaillimh"],
      Limerick: ["Luimneach"],
      Waterford: ["Port Láirge"],
      Kilkenny: ["Cill Chainnigh"]
    },
    FR: {
      Marseille: ["Marseille", "Marseilles"],
      Nice: ["Nice"],
      Strasbourg: ["Strasbourg"]
    },
    DE: {
      Munich: ["München", "Munchen"],
      Cologne: ["Köln", "Koln"],
      Frankfurt: ["Frankfurt am Main"],
      Düsseldorf: ["Dusseldorf", "Duesseldorf"],
      Nuremberg: ["Nürnberg", "Nurnberg"],
      Hanover: ["Hannover"]
    },
    ES: {
      Seville: ["Sevilla"],
      Malaga: ["Málaga"],
      Cordoba: ["Córdoba"],
      "San Sebastian": ["San Sebastián", "Donostia", "Donostia-San Sebastián"],
      "A Coruña": ["La Coruña", "Coruna"],
      Gijon: ["Gijón"],
      Tenerife: ["Santa Cruz de Tenerife"]
    },
    IT: {
      Rome: ["Roma"],
      Milan: ["Milano"],
      Naples: ["Napoli"],
      Turin: ["Torino"],
      Florence: ["Firenze"]
    },
    PT: {
      Lisbon: ["Lisboa"]
    },
    CH: {
      Zurich: ["Zürich", "Zurigo"],
      Geneva: ["Genève", "Ginevra"],
      Basel: ["Basle", "Bâle"],
      Lausanne: ["Lausanne"],
      Bern: ["Berne"]
    },
    AT: {
      Vienna: ["Wien"],
      Graz: ["Graz"]
    },
    BE: {
      Brussels: ["Bruxelles", "Brussel"],
      Antwerp: ["Antwerpen", "Anvers"]
    },
    CZ: {
      Prague: ["Praha"],
      Brno: ["Brno"]
    },
    FI: {
      Helsinki: ["Helsingfors"],
      Tampere: ["Tammerfors"]
    },
    PL: {
      Warsaw: ["Warszawa"],
      Krakow: ["Kraków", "Cracow"]
    },
    DK: {
      Copenhagen: ["København", "Kobenhavn"]
    },
    NO: {
      Oslo: ["Oslo"]
    },
    SE: {
      Stockholm: ["Stockholm"]
    },
    NL: {
      Amsterdam: ["Amsterdam"],
      Rotterdam: ["Rotterdam"]
    },
    RO: {
      Bucharest: ["București", "Bucuresti"],
      "Cluj-Napoca": ["Cluj"],
      "Timișoara": ["Timisoara"],
      "Iași": ["Iasi"],
      "Brașov": ["Brasov"],
      "Constanța": ["Constanta"]
    }
  };

  for (const alias of cityAliases[countryCode]?.[selectedCity] || []) {
    aliases.add(alias);
  }

  return [...aliases];
}

function normalizeCityName(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}