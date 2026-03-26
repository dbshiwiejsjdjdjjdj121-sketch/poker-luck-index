import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleAuth } from "google-auth-library";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const reportDir = path.join(repoRoot, "reports", "seo");
const reportMarkdownPath = path.join(reportDir, "latest.md");
const reportJsonPath = path.join(reportDir, "latest.json");
const relevantEvents = [
  "fortune_form_submitted",
  "home_tool_cta_clicked",
  "bankroll_record_added",
  "hand_saved",
  "checkout_started",
  "checkout_completed",
  "hand_analysis_started",
  "hand_analysis_refreshed",
];

loadEnvFile(path.join(repoRoot, ".env.local"));
loadEnvFile(path.join(repoRoot, ".env"));

const config = {
  gaPropertyId: process.env.GA4_PROPERTY_ID?.trim() || "",
  gscSiteUrl: process.env.GSC_SITE_URL?.trim() || "",
  googleKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH?.trim() || "",
  googleCredentialsJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim() || "",
  googleCredentialsBase64: process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64?.trim() || "",
  vercelToken: process.env.VERCEL_TOKEN?.trim() || "",
  vercelProjectId: process.env.VERCEL_PROJECT_ID?.trim() || "",
  vercelTeamId: process.env.VERCEL_TEAM_ID?.trim() || "",
};

const googleCredentials = resolveGoogleCredentials();

const missing = [
  ["GA4_PROPERTY_ID", config.gaPropertyId],
  ["GSC_SITE_URL", config.gscSiteUrl],
  ["GOOGLE_SERVICE_ACCOUNT", googleCredentials ? "configured" : ""],
].filter(([, value]) => !value);

if (missing.length > 0) {
  throw new Error(
    `Missing required SEO automation environment variables: ${missing.map(([key]) => key).join(", ")}`,
  );
}

const now = new Date();
const currentRange = getDateRange(28, now);
const previousRange = getDateRange(28, new Date(currentRange.startDate));

const googleAuth = new GoogleAuth({
  ...(googleCredentials.kind === "file"
    ? {
        keyFile: googleCredentials.value,
      }
    : {
        credentials: googleCredentials.value,
      }),
  scopes: [
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/webmasters.readonly",
  ],
});

async function main() {
  fs.mkdirSync(reportDir, { recursive: true });

  console.log("Loading Google access token...");
  let googleToken = "";
  const sourceErrors = {};

  try {
    googleToken = await getGoogleAccessToken(googleAuth);
  } catch (error) {
    sourceErrors.googleAuth = toErrorMessage(error);
  }

  console.log("Fetching GA4, Search Console, and Vercel summaries...");
  const [
    gaLandingResult,
    gaEventsResult,
    gscPagesResult,
    gscPrevPagesResult,
    gscQueriesResult,
    vercelResult,
  ] = await Promise.all([
    googleToken ? fetchGaLandingPages(googleToken) : Promise.resolve([]),
    googleToken ? fetchGaEventCounts(googleToken) : Promise.resolve([]),
    googleToken ? fetchSearchConsoleRows(googleToken, ["page"], currentRange) : Promise.resolve([]),
    googleToken ? fetchSearchConsoleRows(googleToken, ["page"], previousRange) : Promise.resolve([]),
    googleToken ? fetchSearchConsoleRows(googleToken, ["query"], currentRange) : Promise.resolve([]),
    fetchVercelSummary(),
  ].map((promise, index) =>
    settle(
      promise,
      index === 5
        ? {
            linked: false,
            note: "Unable to verify Vercel project access.",
          }
        : [],
    ),
  ));

  if (gaLandingResult.error || gaEventsResult.error) {
    sourceErrors.ga4 = gaLandingResult.error || gaEventsResult.error || "";
  }

  if (gscPagesResult.error || gscPrevPagesResult.error || gscQueriesResult.error) {
    sourceErrors.searchConsole =
      gscPagesResult.error || gscPrevPagesResult.error || gscQueriesResult.error || "";
  }

  if (vercelResult.error) {
    sourceErrors.vercel = vercelResult.error;
  }

  const gaSummary = buildGaSummary(gaLandingResult.value, gaEventsResult.value);
  const gscSummary = buildGscSummary(
    gscPagesResult.value,
    gscPrevPagesResult.value,
    gscQueriesResult.value,
  );
  const vercelSummary = vercelResult.value;
  const recommendations = buildRecommendations({ gaSummary, gscSummary, vercelSummary, sourceErrors });

  const report = {
    generatedAt: now.toISOString(),
    window: {
      current: currentRange,
      previous: previousRange,
    },
    config: {
      gaPropertyId: config.gaPropertyId,
      gscSiteUrl: config.gscSiteUrl,
      googleCredentialSource:
        googleCredentials.kind === "file"
          ? path.basename(googleCredentials.value)
          : googleCredentials.kind,
      vercelProjectLinked: Boolean(config.vercelToken && config.vercelProjectId),
    },
    sourceErrors,
    ga4: gaSummary,
    searchConsole: gscSummary,
    vercel: vercelResult.value,
    recommendations,
  };

  fs.writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(reportMarkdownPath, buildMarkdownReport(report));

  console.log(`SEO report written to ${reportMarkdownPath}`);
  console.log(`SEO report JSON written to ${reportJsonPath}`);
}

async function settle(promise, fallbackValue) {
  try {
    return {
      value: await promise,
      error: "",
    };
  } catch (error) {
    return {
      value: fallbackValue,
      error: toErrorMessage(error),
    };
  }
}

function toErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^"(.*)"$/u, "$1");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function resolveGoogleCredentials() {
  if (config.googleKeyPath) {
    if (!fs.existsSync(config.googleKeyPath)) {
      throw new Error(`Google service account key file not found at ${config.googleKeyPath}`);
    }

    return {
      kind: "file",
      value: config.googleKeyPath,
    };
  }

  if (config.googleCredentialsJson) {
    return {
      kind: "env_json",
      value: JSON.parse(config.googleCredentialsJson),
    };
  }

  if (config.googleCredentialsBase64) {
    return {
      kind: "env_base64",
      value: JSON.parse(Buffer.from(config.googleCredentialsBase64, "base64").toString("utf8")),
    };
  }

  return null;
}

function getDateRange(days, endExclusiveDate) {
  const end = new Date(endExclusiveDate);
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));

  return {
    startDate: toDateString(start),
    endDate: toDateString(end),
  };
}

function toDateString(date) {
  return date.toISOString().slice(0, 10);
}

async function getGoogleAccessToken(auth) {
  const client = await withTimeout(
    auth.getClient(),
    20_000,
    "Timed out while initializing the Google auth client.",
  );
  const tokenResponse = await withTimeout(
    client.getAccessToken(),
    20_000,
    "Timed out while requesting a Google access token. Check outbound access to oauth2.googleapis.com.",
  );
  const token = typeof tokenResponse === "string" ? tokenResponse : tokenResponse?.token;

  if (!token) {
    throw new Error("Unable to obtain a Google access token for SEO reporting.");
  }

  return token;
}

async function withTimeout(promise, timeoutMs, message) {
  let timeoutId;

  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  let response;

  try {
    response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timed out after 30s for ${url}`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(
      `Request failed (${response.status}) for ${url}: ${
        typeof data === "string" ? data : JSON.stringify(data)
      }`,
    );
  }

  return data;
}

async function fetchGaLandingPages(accessToken) {
  const data = await fetchJson(
    `https://analyticsdata.googleapis.com/v1beta/properties/${config.gaPropertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [currentRange],
        dimensions: [{ name: "landingPagePlusQueryString" }, { name: "sessionSourceMedium" }],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "engagedSessions" },
        ],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 25,
      }),
    },
  );

  return (data.rows || []).map((row) => ({
    landingPage: row.dimensionValues?.[0]?.value || "/",
    sourceMedium: row.dimensionValues?.[1]?.value || "(not set)",
    sessions: Number(row.metricValues?.[0]?.value || 0),
    users: Number(row.metricValues?.[1]?.value || 0),
    engagedSessions: Number(row.metricValues?.[2]?.value || 0),
  }));
}

async function fetchGaEventCounts(accessToken) {
  const data = await fetchJson(
    `https://analyticsdata.googleapis.com/v1beta/properties/${config.gaPropertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [currentRange],
        dimensions: [{ name: "pagePath" }, { name: "eventName" }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          filter: {
            fieldName: "eventName",
            inListFilter: {
              values: relevantEvents,
            },
          },
        },
        orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
        limit: 200,
      }),
    },
  );

  return (data.rows || []).map((row) => ({
    pagePath: row.dimensionValues?.[0]?.value || "/",
    eventName: row.dimensionValues?.[1]?.value || "",
    eventCount: Number(row.metricValues?.[0]?.value || 0),
  }));
}

async function fetchSearchConsoleRows(accessToken, dimensions, dateRange) {
  const data = await fetchJson(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(config.gscSiteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        dimensions,
        rowLimit: 25,
      }),
    },
  );

  return (data.rows || []).map((row) => ({
    key: row.keys?.[0] || "",
    clicks: Number(row.clicks || 0),
    impressions: Number(row.impressions || 0),
    ctr: Number(row.ctr || 0),
    position: Number(row.position || 0),
  }));
}

async function fetchVercelSummary() {
  if (!config.vercelToken || !config.vercelProjectId) {
    return {
      linked: false,
      note: "Add VERCEL_TOKEN and VERCEL_PROJECT_ID to include project verification in the report.",
    };
  }

  const searchParams = new URLSearchParams();

  if (config.vercelTeamId) {
    searchParams.set("teamId", config.vercelTeamId);
  }

  const query = searchParams.toString();
  const projectUrl = `https://api.vercel.com/v9/projects/${config.vercelProjectId}${query ? `?${query}` : ""}`;
  const deploymentsUrl = `https://api.vercel.com/v6/deployments?projectId=${encodeURIComponent(config.vercelProjectId)}&limit=1${query ? `&${query}` : ""}`;

  try {
    const [project, deployments] = await Promise.all([
      fetchJson(projectUrl, {
        headers: {
          Authorization: `Bearer ${config.vercelToken}`,
        },
      }),
      fetchJson(deploymentsUrl, {
        headers: {
          Authorization: `Bearer ${config.vercelToken}`,
        },
      }),
    ]);

    const latestDeployment = deployments.deployments?.[0];

    return {
      linked: true,
      projectName: project.name || config.vercelProjectId,
      framework: project.framework || "",
      latestDeployment: latestDeployment
        ? {
            url: latestDeployment.url || "",
            state: latestDeployment.state || "",
            createdAt: latestDeployment.createdAt || null,
          }
        : null,
      note: "Web Analytics and Speed Insights are enabled in the app. Dashboard metrics still need to be reviewed from Vercel unless you later add a supported export path.",
    };
  } catch (error) {
    return {
      linked: false,
      note:
        error instanceof Error
          ? error.message
          : "Unable to verify Vercel project access.",
    };
  }
}

function buildGaSummary(landingRows, eventRows) {
  const totals = Object.fromEntries(
    relevantEvents.map((eventName) => [eventName, 0]),
  );
  const pageEvents = new Map();

  for (const row of eventRows) {
    totals[row.eventName] = (totals[row.eventName] || 0) + row.eventCount;
    const current = pageEvents.get(row.pagePath) || {};
    current[row.eventName] = row.eventCount;
    pageEvents.set(row.pagePath, current);
  }

  return {
    topLandingPages: landingRows,
    eventTotals: totals,
    pageEvents: Object.fromEntries(pageEvents),
  };
}

function buildGscSummary(currentPageRows, previousPageRows, queryRows) {
  const previousByPage = new Map(previousPageRows.map((row) => [row.key, row]));
  const pageRows = currentPageRows.map((row) => {
    const previous = previousByPage.get(row.key);

    return {
      ...row,
      clickDelta: row.clicks - (previous?.clicks || 0),
      impressionDelta: row.impressions - (previous?.impressions || 0),
    };
  });

  return {
    topPages: pageRows,
    topQueries: queryRows,
  };
}

function buildRecommendations({ gaSummary, gscSummary, vercelSummary, sourceErrors }) {
  const recommendations = [];

  if (sourceErrors.googleAuth) {
    recommendations.push({
      type: "ops",
      priority: "high",
      target: "google-auth",
      reason: `Google auth could not initialize: ${sourceErrors.googleAuth}`,
      action: "Verify the service account JSON, the workflow secret, and outbound access to Google APIs.",
    });
  }

  if (sourceErrors.ga4) {
    recommendations.push({
      type: "ops",
      priority: "high",
      target: "ga4",
      reason: `GA4 data could not be fetched: ${sourceErrors.ga4}`,
      action: "Confirm the service account has at least Analyst access on this GA4 property.",
    });
  }

  if (sourceErrors.searchConsole) {
    recommendations.push({
      type: "ops",
      priority: "high",
      target: "search-console",
      reason: `Search Console data could not be fetched: ${sourceErrors.searchConsole}`,
      action: "Confirm the service account has access to the Search Console property and the property ID is correct.",
    });
  }

  for (const page of gscSummary.topPages) {
    if (page.impressions >= 75 && page.ctr < 0.02) {
      recommendations.push({
        type: "ctr",
        priority: "high",
        target: page.key,
        reason: `High impressions (${page.impressions}) but weak CTR (${formatPercent(page.ctr)}).`,
        action: "Refresh title tag, meta description, and first-screen copy for this page.",
      });
    }
  }

  for (const query of gscSummary.topQueries) {
    if (query.impressions >= 40 && query.position >= 8 && query.position <= 20) {
      recommendations.push({
        type: "query",
        priority: "medium",
        target: query.key,
        reason: `Query is close to page one at average position ${query.position.toFixed(1)}.`,
        action: "Support this query with a dedicated FAQ section, internal links, or a tighter landing page section.",
      });
    }
  }

  const homeEvents = gaSummary.pageEvents["/"] || {};
  const homeClicks = Number(homeEvents.home_tool_cta_clicked || 0);
  const homeFortunes = Number(homeEvents.fortune_form_submitted || 0);

  if (homeFortunes > 0 && homeClicks < Math.max(5, homeFortunes * 0.35)) {
    recommendations.push({
      type: "homepage",
      priority: "medium",
      target: "/",
      reason: `Home page tool CTA clicks (${homeClicks}) trail fortune submissions (${homeFortunes}).`,
      action: "Make the free bankroll and replay paths even more prominent above the fold.",
    });
  }

  const bankrollLanding = gaSummary.topLandingPages.find((row) => row.landingPage.startsWith("/bankroll"));
  const bankrollAdds = Number((gaSummary.pageEvents["/bankroll"] || {}).bankroll_record_added || 0);

  if (bankrollLanding && bankrollLanding.sessions >= 20 && bankrollAdds < Math.max(3, bankrollLanding.sessions * 0.1)) {
    recommendations.push({
      type: "activation",
      priority: "high",
      target: "/bankroll",
      reason: `Bankroll page sessions (${bankrollLanding.sessions}) are not turning into enough saved records (${bankrollAdds}).`,
      action: "Tighten onboarding copy, add a stronger empty-state example, and reduce first-entry friction.",
    });
  }

  const replayLanding = gaSummary.topLandingPages.find((row) => row.landingPage.startsWith("/hand-review"));
  const handsSaved = Number((gaSummary.pageEvents["/hand-review"] || {}).hand_saved || 0);

  if (replayLanding && replayLanding.sessions >= 20 && handsSaved < Math.max(3, replayLanding.sessions * 0.08)) {
    recommendations.push({
      type: "activation",
      priority: "high",
      target: "/hand-review",
      reason: `Replay traffic (${replayLanding.sessions}) is not creating enough saved hands (${handsSaved}).`,
      action: "Simplify the first manual replay step and make the free path clearer than the premium gates.",
    });
  }

  const checkoutStarted = Number(gaSummary.eventTotals.checkout_started || 0);
  const checkoutCompleted = Number(gaSummary.eventTotals.checkout_completed || 0);

  if (checkoutStarted >= 5 && checkoutCompleted < checkoutStarted * 0.45) {
    recommendations.push({
      type: "monetization",
      priority: "medium",
      target: "checkout",
      reason: `Checkout starts (${checkoutStarted}) are converting poorly into completions (${checkoutCompleted}).`,
      action: "Review pricing copy, trust signals, and the premium gate explanation before checkout.",
    });
  }

  if (vercelSummary.linked === false) {
    recommendations.push({
      type: "ops",
      priority: "low",
      target: "vercel",
      reason: vercelSummary.note || "Vercel project access is not fully linked into the automation report yet.",
      action: config.vercelToken && config.vercelProjectId
        ? "Verify the Vercel token, project ID, team ID, and outbound access to api.vercel.com."
        : "Add VERCEL_TOKEN and VERCEL_PROJECT_ID to verify deployment access automatically.",
    });
  }

  return recommendations.slice(0, 8);
}

function buildMarkdownReport(report) {
  const lines = [
    "# SEO Report",
    "",
    `Generated: ${report.generatedAt}`,
    `Current window: ${report.window.current.startDate} to ${report.window.current.endDate}`,
    `Previous window: ${report.window.previous.startDate} to ${report.window.previous.endDate}`,
    "",
    "## Config",
    "",
    `- GA4 property: ${report.config.gaPropertyId}`,
    `- Search Console property: ${report.config.gscSiteUrl}`,
    `- Google credentials source: ${report.config.googleCredentialSource}`,
    `- Vercel project linked: ${report.config.vercelProjectLinked ? "yes" : "no"}`,
    "",
    "## Source Status",
    "",
    ...(Object.keys(report.sourceErrors).length === 0
      ? ["- All configured data sources responded successfully."]
      : Object.entries(report.sourceErrors).map(([source, message]) => `- ${source}: ${message}`)),
    "",
    "## GA4 Funnel",
    "",
    ...(Object.entries(report.ga4.eventTotals).length === 0
      ? ["- No GA4 event data was returned for this run."]
      : Object.entries(report.ga4.eventTotals).map(
          ([eventName, count]) => `- ${eventName}: ${count}`,
        )),
    "",
    "## Top Landing Pages",
    "",
    ...(report.ga4.topLandingPages.length === 0
      ? ["- No GA4 landing page rows were returned for this run."]
      : report.ga4.topLandingPages.slice(0, 10).map(
          (row) =>
            `- ${row.landingPage} | ${row.sourceMedium} | sessions ${row.sessions} | users ${row.users} | engaged ${row.engagedSessions}`,
        )),
    "",
    "## Search Console Pages",
    "",
    ...(report.searchConsole.topPages.length === 0
      ? ["- No Search Console page rows were returned for this run."]
      : report.searchConsole.topPages.slice(0, 10).map(
          (row) =>
            `- ${row.key} | clicks ${row.clicks} (${formatSigned(row.clickDelta)}) | impressions ${row.impressions} (${formatSigned(row.impressionDelta)}) | CTR ${formatPercent(row.ctr)} | position ${row.position.toFixed(1)}`,
        )),
    "",
    "## Search Console Queries",
    "",
    ...(report.searchConsole.topQueries.length === 0
      ? ["- No Search Console query rows were returned for this run."]
      : report.searchConsole.topQueries.slice(0, 10).map(
          (row) =>
            `- ${row.key} | clicks ${row.clicks} | impressions ${row.impressions} | CTR ${formatPercent(row.ctr)} | position ${row.position.toFixed(1)}`,
        )),
    "",
    "## Vercel",
    "",
    `- Linked: ${report.vercel.linked ? "yes" : "no"}`,
    `- Note: ${report.vercel.note}`,
    ...(report.vercel.projectName ? [`- Project: ${report.vercel.projectName}`] : []),
    ...(report.vercel.latestDeployment?.url
      ? [
          `- Latest deployment: ${report.vercel.latestDeployment.url} (${report.vercel.latestDeployment.state})`,
        ]
      : []),
    "",
    "## Recommendations",
    "",
    ...(report.recommendations.length === 0
      ? ["- No immediate SEO actions were generated for this run."]
      : report.recommendations.map(
          (item, index) =>
            `${index + 1}. [${item.priority}] ${item.target}: ${item.reason} ${item.action}`,
        )),
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatSigned(value) {
  return `${value >= 0 ? "+" : ""}${value}`;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
