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

  return uniqueEvents.sort((a, b) => {
    const first = `${a.date || ""}T${a.time || "00:00"}`;
    const second = `${b.date || ""}T${b.time || "00:00"}`;
    return first.localeCompare(second);
  });
}

function isLikelyDuplicate(first, second) {
  if (normalizeText(first.city) !== normalizeText(second.city)) {
    return false;
  }

  if (first.date !== second.date) {
    return false;
  }

  const sameTime =
    first.time &&
    second.time &&
    first.time.slice(0, 5) === second.time.slice(0, 5);

  // If same day/place but different real hours, keep both.
  if (!sameTime && hasRealTime(first) && hasRealTime(second)) {
    return false;
  }

  const sameAddress = samePlace(first.address, second.address);
  const sameVenue = samePlace(first.venue, second.venue);

  if (!sameAddress && !sameVenue) {
    return false;
  }

  const firstTitle = normalizeTitle(first.title);
  const secondTitle = normalizeTitle(second.title);
  const titleScore = wordSimilarity(firstTitle, secondTitle);

  if (titleScore >= 0.45) return true;

  if (
    firstTitle.length >= 4 &&
    secondTitle.length >= 4 &&
    (firstTitle.includes(secondTitle) || secondTitle.includes(firstTitle))
  ) {
    return true;
  }

  const firstMainWord = firstTitle.split(" ")[0];
  const secondMainWord = secondTitle.split(" ")[0];

  return sameTime && firstMainWord && firstMainWord === secondMainWord;
}

function samePlace(first, second) {
  const a = normalizeVenue(first);
  const b = normalizeVenue(second);

  if (!a || !b) return false;

  return a === b || a.includes(b) || b.includes(a);
}

function hasRealTime(event) {
  return event.time && !event.time.toLowerCase().includes("tba");
}

function betterEvent(existing, newer) {
  return eventScore(newer) > eventScore(existing) ? newer : existing;
}

function eventScore(event) {
  let score = 0;

  if (hasRealTime(event)) score += 100;
  if (event.address) score += 30;
  if (event.url) score += 20;
  if (event.provider === "Ticketmaster") score += 10;

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

  if (firstWords.size === 0 || secondWords.size === 0) return 0;

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