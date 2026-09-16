import type { Destination, Festival } from "./guide-types";
import { SITE_NAME, SITE_URL } from "./site";

export const festivalImagePath = (slug: string) => `/tournaments/${slug}/guide-image`;
export const festivalContentUpdated = (festival: Festival, destination: Destination) =>
  [festival.updatedAt, destination.updatedAt].sort().at(-1)!;

// These pages are editorial overviews of a festival's separately entered events,
// not individual bookable events. Do not turn selected buy-ins into ticket offers.
export function festivalArticle(festival: Festival, destination: Destination) {
  const url = `${SITE_URL}/tournaments/${festival.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#guide`,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: festival.name,
    description: festival.description,
    inLanguage: "en",
    articleSection: "Poker festival guides",
    image: {
      "@type": "ImageObject",
      url: SITE_URL + festivalImagePath(festival.slug),
      width: 1200,
      height: 630,
      caption: `${festival.name} — independent festival guide`,
    },
    author: { "@type": "Organization", name: SITE_NAME, url: `${SITE_URL}/about` },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    dateModified: festivalContentUpdated(festival, destination),
    // No reliable original publication timestamp is recorded in the content data.
    // Neither a festival start date nor a routine source check is datePublished.
  };
}

export function festivalBreadcrumbs(items: { label: string; href?: string }[]) {
  const trail = [{ label: "Home", href: "/" }, ...items];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: SITE_URL + item.href } : {}),
    })),
  };
}
