export function mergeEvents(events) {
  const seen = new Set();

  return events.filter((event) => {
    const key = [
      normalizeText(event.title),
      normalizeText(event.venue),
      event.date
    ].join("|");

    if (seen.has(key)) {
      return false;
    }

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