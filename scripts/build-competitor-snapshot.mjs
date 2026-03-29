import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const competitorsPath = path.join(repoRoot, "seo", "competitors.json");
const outputPath = path.join(repoRoot, "seo", "competitor-snapshot.json");

const competitorConfig = JSON.parse(fs.readFileSync(competitorsPath, "utf8"));

const curatedBaseline = {
  chipstats: {
    mappedClusters: ["bankroll-tracker"],
    keywordSignals: [
      "live poker bankroll tracker",
      "track poker sessions",
      "poker ROI",
      "poker hourly",
      "poker session stats",
      "poker bankroll insights",
    ],
    positioningNotes: [
      "Leans hard into live-session speed and win-rate clarity.",
      "Useful reference for bankroll, ROI, and hourly language on player-facing pages.",
    ],
  },
  "check-replay": {
    mappedClusters: ["hand-replay", "hand-history"],
    keywordSignals: [
      "poker replayer",
      "poker hand replay",
      "poker hand history replay",
      "poker hand review",
      "accessible hand replays",
      "improve poker skills",
    ],
    positioningNotes: [
      "Frames the category directly as a poker replayer.",
      "Good reference for intuitive replay language and skill-improvement positioning.",
    ],
  },
  handhistory: {
    mappedClusters: ["hand-replay", "hand-history", "bankroll-tracker"],
    keywordSignals: [
      "poker tracking software",
      "poker hand replayer",
      "bankroll management",
      "poker leak finder",
      "poker statistics",
      "poker hand analysis",
    ],
    positioningNotes: [
      "Broad all-in-one tracking and analysis positioning.",
      "Strong source for analysis, statistics, and bankroll vocabulary.",
    ],
  },
  "edge-poker": {
    mappedClusters: ["bankroll-tracker", "hand-history", "table-read-luck"],
    keywordSignals: [
      "ai poker coach",
      "poker tracker",
      "tournament timer",
      "bankroll analytics",
      "hand logger",
      "study hub",
    ],
    positioningNotes: [
      "Emphasizes one-app convenience and AI-assisted workflows.",
      "Useful for product-category framing, but not for copying feature breadth.",
    ],
  },
  "poker-stack": {
    mappedClusters: ["bankroll-tracker"],
    keywordSignals: [
      "free poker bankroll tracker",
      "poker bankroll management",
      "track poker sessions",
      "poker session graphs",
      "poker stats",
      "ios and android poker app",
    ],
    positioningNotes: [
      "Very direct bankroll-tracker wording with cross-platform app language.",
      "Good reference for simple bankroll-management and graph/reporting phrasing.",
    ],
  },
};

const baselineKeywords = {
  "bankroll-tracker": [
    "live poker bankroll tracker",
    "free poker bankroll tracker",
    "poker bankroll management",
    "track poker sessions",
    "poker session tracker",
    "poker ROI",
    "poker hourly",
    "bankroll analytics",
  ],
  "hand-replay": [
    "poker hand replay",
    "poker replayer",
    "poker hand review",
    "poker hand history replay",
    "hand replayer",
    "accessible hand replays",
  ],
  "hand-history": [
    "poker hand history",
    "hand logger",
    "save poker hands",
    "poker hand analysis",
    "poker leak finder",
    "poker statistics",
  ],
  "table-read-luck": [
    "ai poker coach",
    "poker tools in one app",
    "pre-session planning",
    "session tracking",
    "study hub",
    "tournament timer",
  ],
};

async function main() {
  const snapshot = {
    capturedAt: new Date().toISOString(),
    refreshPolicy: {
      mode: "manual-only",
      notes: [
        "This file is a fixed competitor baseline for weekly SEO work.",
        "Weekly automation should read this snapshot and must not re-fetch competitor sites.",
        "Refresh only when you explicitly want to rebuild the competitor baseline.",
      ],
    },
    sourceWindowWeeks: competitorConfig.review_window_weeks,
    competitors: [],
    baselineKeywords,
  };

  for (const competitor of competitorConfig.competitors) {
    const response = await fetchPage(competitor.url);
    const extracted = extractSeoData(response.html);
    const curated = curatedBaseline[competitor.slug] || {
      mappedClusters: [],
      keywordSignals: [],
      positioningNotes: [],
    };

    snapshot.competitors.push({
      slug: competitor.slug,
      name: competitor.name,
      sourceUrl: competitor.url,
      finalUrl: response.finalUrl,
      status: response.status,
      primaryFocus: competitor.primary_focus,
      title: extracted.title,
      metaDescription: extracted.metaDescription,
      metaKeywords: extracted.metaKeywords,
      canonical: extracted.canonical,
      h1: extracted.h1,
      h2: extracted.h2,
      keywordSignals: curated.keywordSignals,
      mappedClusters: curated.mappedClusters,
      positioningNotes: curated.positioningNotes,
      sourceNotes: competitor.notes,
    });
  }

  fs.writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Competitor snapshot written to ${outputPath}`);
}

async function fetchPage(url) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent": "Mozilla/5.0 Codex SEO Baseline",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return {
    finalUrl: response.url,
    status: response.status,
    html: await response.text(),
  };
}

function extractSeoData(html) {
  return {
    title: decodeEntities(matchTag(html, "title")),
    metaDescription: decodeEntities(matchMeta(html, "description")),
    metaKeywords: splitKeywords(matchMeta(html, "keywords")),
    canonical: matchCanonical(html),
    h1: decodeEntities(matchFirstTag(html, "h1")),
    h2: matchAllTags(html, "h2", 5).map((value) => decodeEntities(value)),
  };
}

function matchTag(html, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = html.match(regex);
  return match ? stripTags(match[1]).trim() : "";
}

function matchFirstTag(html, tagName) {
  return matchTag(html, tagName);
}

function matchAllTags(html, tagName, limit) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "gi");
  const matches = [];
  let match = regex.exec(html);

  while (match && matches.length < limit) {
    const value = stripTags(match[1]).trim();

    if (value) {
      matches.push(value);
    }

    match = regex.exec(html);
  }

  return matches;
}

function matchMeta(html, name) {
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${escapeRegExp(name)}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${escapeRegExp(name)}["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+property=["']${escapeRegExp(name)}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match) {
      return match[1].trim();
    }
  }

  return "";
}

function matchCanonical(html) {
  const regex = /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i;
  const match = html.match(regex);
  return match ? match[1].trim() : "";
}

function splitKeywords(value) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => decodeEntities(entry).trim())
    .filter(Boolean);
}

function stripTags(value) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
