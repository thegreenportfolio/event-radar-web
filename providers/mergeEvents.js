export function mergeEvents(events) {
  const uniqueEvents = [];

  for (const event of events) {
    const duplicateIndex = uniqueEvents.findIndex((existing) =>
      isLikelyDuplicate(existing, event)
    );

    if (duplicateIndex >= 0) {
      uniqueEvents[duplicateIndex] = betterEvent(uniqueEvents[duplicateIndex], event);
    } else {
      uniqueEvents.push(event);
    }
  }

  return uniqueEvents;
}

function isLikelyDuplicate(first, second) {
  if (normalizeText(first.city) !== normalizeText(second.city)) {
    return false;
  }

  if (first.date !== second.date) {
    return false;
  }

  const firstTitle = normalizeTitle(first.title);
  const secondTitle = normalizeTitle(second.title);

  const firstVenue = normalizeVenue(first.venue);
  const secondVenue = normalizeVenue(second.venue);

  const sameVenue =
    firstVenue === secondVenue ||
    firstVenue.includes(secondVenue) ||
    secondVenue.includes(firstVenue);

  if (!sameVenue) {
    return false;
  }

  const titleScore = wordSimilarity(firstTitle, secondTitle);

  if (titleScore >= 0.45) {
    return true;
  }

  if (firstTitle.includes(secondTitle) || secondTitle.includes(firstTitle)) {
    return true;
  }

  return false;
}

function betterEvent(existing, newer) {
  const existingScore = eventScore(existing);
  const newScore = eventScore(newer);

  return newScore > existingScore ? newer : existing;
}

function eventScore(event) {
  let score = 0;

  if (event.time && !event.time.toLowerCase().includes("tba")) {
    score += 100;
  }

  if (event.url) {
    score += 20;
  }

  if (event.provider === "Ticketmaster") {
    score += 10;
  }

  return score;
}

function normalizeTitle(value) {
  const stopWords = new Set([
    "ticket", "tickets", "live", "tour", "world", "presented", "by",
    "powered", "free", "rsvp", "with", "w", "and", "more", "the",
    "a", "an", "at", "in", "on", "for", "to", "of", "all", "ages",
    "age", "plus", "special", "guest", "guests", "official",
    "event", "events", "friday", "saturday", "sunday"
  ]);

  return normalizeText(value)
    .split(" ")
    .filter((word) => word && !stopWords.has(word) && !isMostlyNumber(word))
    .join(" ");
}

function normalizeVenue(value) {
  const stopWords = new Set([
    "the", "at", "in", "of", "and", "by", "theater", "theatre",
    "hall", "club", "bar", "lounge", "arena", "stadium", "centre",
    "center", "events", "event", "room", "main", "stage"
  ]);

  return normalizeText(value)
    .split(" ")
    .filter((word) => word && !stopWords.has(word))
    .join(" ");
}

function wordSimilarity(first, second) {
  const firstWords = new Set(first.split(" ").filter(Boolean));
  const secondWords = new Set(second.split(" ").filter(Boolean));

  if (firstWords.size === 0 || secondWords.size === 0) {
    return 0;
  }

  const shared = [...firstWords].filter((word) => secondWords.has(word)).length;
  const total = new Set([...firstWords, ...secondWords]).size;

  return shared / total;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isMostlyNumber(word) {
  const digits = word.replace(/\D/g, "").length;
  return digits > 0 && digits >= word.length / 2;
}