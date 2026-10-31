function normalized(value) {
  return String(value || "").trim().toLocaleLowerCase();
}

function descriptionText(value, fallback) {
  const text = String(value || "").trim();
  return text ? text.slice(0, 180) : fallback;
}

export function makeGlobalSearchEntry({
  id,
  title,
  category,
  description,
  path,
  externalUrl,
  searchText,
  saved = false,
}) {
  return {
    id: `${category}:${id}`,
    title: String(title || "").trim(),
    category,
    description: descriptionText(description, "Open this item to view more details."),
    path,
    externalUrl,
    saved,
    searchText: normalized(`${title} ${category} ${description} ${searchText || ""}`),
  };
}

export function searchGlobalEntries(entries, query) {
  const term = normalized(query);
  if (!term) return [];

  const queryTerms = term.split(/\s+/).filter(Boolean);
  const savedQuery = queryTerms.includes("saved");
  const savedCategory = queryTerms.some((word) => /^internships?$/.test(word))
    ? "Saved internship"
    : queryTerms.some((word) => /^hackathons?$/.test(word))
      ? "Saved hackathon"
      : null;
  const searchTerms = queryTerms.filter((word) =>
    word !== "saved" && !((word === "internship" || word === "internships") && savedCategory === "Saved internship") &&
    !((word === "hackathon" || word === "hackathons") && savedCategory === "Saved hackathon")
  );
  const matchingEntries = entries.filter((entry) => {
    if (savedQuery && (!entry.saved || (savedCategory && entry.category !== savedCategory))) {
      return false;
    }
    return searchTerms.every((word) => entry.searchText.includes(word));
  });

  const unique = new Map();
  matchingEntries.forEach((entry) => {
    if (!unique.has(entry.id)) unique.set(entry.id, entry);
  });
  const rankingTerm = searchTerms.join(" ");
  return [...unique.values()]
    .sort((left, right) =>
      Number(right.saved) - Number(left.saved) ||
      Number(normalized(right.title).startsWith(rankingTerm)) - Number(normalized(left.title).startsWith(rankingTerm)) ||
      left.title.localeCompare(right.title)
    )
    .slice(0, 10);
}
