import type { Category } from "./types";

// Per-category search URL + label. Kept deterministic (no affiliate keys, no tracking)
// so a rec always resolves to SOMETHING the user can actually act on.
export function findLink(
  category: Category,
  title: string,
  creator?: string,
): { href: string; label: string } {
  const q = creator ? `${title} ${creator}` : title;
  const enc = encodeURIComponent(q);
  switch (category) {
    case "film":
      return { href: `https://letterboxd.com/search/${enc}/`, label: "Letterboxd" };
    case "show":
      return { href: `https://www.justwatch.com/us/search?q=${enc}`, label: "JustWatch" };
    case "book":
      return { href: `https://www.goodreads.com/search?q=${enc}`, label: "Goodreads" };
    case "music":
      return { href: `https://open.spotify.com/search/${enc}`, label: "Spotify" };
    case "podcast":
      return { href: `https://podcasts.apple.com/us/search?term=${enc}`, label: "Apple Podcasts" };
    case "game":
      return { href: `https://store.steampowered.com/search/?term=${enc}`, label: "Steam" };
    case "place":
      return {
        href: `https://www.google.com/maps/search/?api=1&query=${enc}`,
        label: "Google Maps",
      };
    case "food":
      return {
        href: `https://www.google.com/search?q=${encodeURIComponent(`${q} recipe`)}`,
        label: "Recipe search",
      };
  }
}
