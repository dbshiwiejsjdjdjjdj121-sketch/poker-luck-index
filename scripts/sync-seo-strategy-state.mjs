import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const strategyStatePath = path.join(repoRoot, "seo", "strategy-state.json");
const keywordMapPath = path.join(repoRoot, "seo", "keyword-map.json");
const contentTypesPath = path.join(repoRoot, "seo", "content-types.json");
const reportPath = path.join(repoRoot, "reports", "seo", "latest.json");
const actionPlanPath = path.join(repoRoot, "reports", "seo", "action-plan.json");

const now = new Date().toISOString();
const existingState = readJson(strategyStatePath, null);
const keywordMap = readJson(keywordMapPath, { clusters: [], queue_rules: {} });
const contentTypes = readJson(contentTypesPath, { shape_group_rules: {} });
const report = readJson(reportPath, null);
const actionPlan = readJson(actionPlanPath, null);

const strategyState = {
  version: 1,
  updatedAt: now,
  source: buildSource(report, actionPlan, existingState),
  observed: buildObserved(report, actionPlan, existingState),
  activeWeeklyDecision: buildWeeklyDecision(existingState),
  queuePolicy: buildQueuePolicy(keywordMap, contentTypes, existingState),
  nextCandidates: buildNextCandidates(keywordMap, existingState),
  supervision: buildSupervision(existingState),
};

fs.writeFileSync(strategyStatePath, `${JSON.stringify(strategyState, null, 2)}\n`);
console.log(`SEO strategy state written to ${strategyStatePath}`);

function readJson(filePath, fallbackValue) {
  if (!fs.existsSync(filePath)) {
    return fallbackValue;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function buildSource(inputReport, inputActionPlan, previousState) {
  return {
    reportGeneratedAt:
      inputReport?.generatedAt || previousState?.source?.reportGeneratedAt || null,
    actionPlanGeneratedAt:
      inputActionPlan?.generatedAt || previousState?.source?.actionPlanGeneratedAt || null,
    executionMode:
      inputActionPlan?.mode || previousState?.source?.executionMode || "foundation",
    currentWindow:
      inputReport?.window?.current ||
      previousState?.source?.currentWindow || {
        startDate: null,
        endDate: null,
      },
  };
}

function buildObserved(inputReport, inputActionPlan, previousState) {
  return {
    topPage:
      inputActionPlan?.focus?.topPage ||
      inputReport?.searchConsole?.topPages?.[0]?.key ||
      previousState?.observed?.topPage ||
      "/",
    topQuery:
      inputActionPlan?.focus?.topQuery ||
      inputReport?.searchConsole?.topQueries?.[0]?.key ||
      previousState?.observed?.topQuery ||
      "",
    topLanding:
      inputActionPlan?.focus?.topLanding ||
      inputReport?.ga4?.topLandingPages?.[0]?.landingPage ||
      previousState?.observed?.topLanding ||
      "/",
    signal:
      inputActionPlan?.signal ||
      previousState?.observed?.signal || {
        pageImpressions: 0,
        queryImpressions: 0,
        sessions: 0,
        toolActivations: 0,
        checkoutStarts: 0,
      },
  };
}

function buildWeeklyDecision(previousState) {
  const existingDecision = previousState?.activeWeeklyDecision;

  if (existingDecision) {
    return existingDecision;
  }

  return {
    status: "active",
    focusPage: "/bankroll",
    focusCluster: "bankroll-tracker",
    shapeGroups: ["core-landing", "workflow-how-to", "player-faq"],
    summary:
      "First foundation-mode SEO pass focused on strengthening the bankroll landing page with people-first static copy, FAQ support, internal links, and JSON-LD.",
    changedOnBranch: "codex/seo-weekly-20260330",
    pullRequestUrl:
      "https://github.com/dbshiwiejsjdjdjjdj121-sketch/webpoker/pull/4",
  };
}

function buildQueuePolicy(inputKeywordMap, inputContentTypes, previousState) {
  return {
    maxSameShapeGroupPerDay:
      inputKeywordMap?.queue_rules?.max_same_shape_group_per_day ||
      inputContentTypes?.shape_group_rules?.max_same_shape_group_per_day ||
      previousState?.queuePolicy?.maxSameShapeGroupPerDay ||
      1,
    deferSameShapeGroupSameDay: true,
    rotateClustersWhenPossible: true,
  };
}

function buildNextCandidates(inputKeywordMap, previousState) {
  const activeCluster = previousState?.activeWeeklyDecision?.focusCluster || "bankroll-tracker";

  const candidates = (inputKeywordMap?.clusters || [])
    .filter((cluster) => cluster.slug !== activeCluster)
    .map((cluster) => {
      const nextItem = Array.isArray(cluster.queue) ? cluster.queue[0] : null;

      return nextItem
        ? {
            cluster: cluster.slug,
            targetPage: cluster.primary_page,
            term: nextItem.term,
            shapeGroup: nextItem.shape_group,
            contentType: nextItem.content_type,
            priority: cluster.priority,
          }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.priority - b.priority);

  return candidates.slice(0, 3);
}

function buildSupervision(previousState) {
  const previousNotes = Array.isArray(previousState?.supervision?.recentFindings)
    ? previousState.supervision.recentFindings
    : [];

  const nextNotes = [
    "Keep the rolling `seo` issue fresh after each report run.",
    "Run one post-flow supervision pass after every complete automation cycle.",
    "Avoid same-day `shape_group` collisions when selecting queued content.",
    ...previousNotes,
  ];

  return {
    lastReviewedAt: now,
    recentFindings: Array.from(new Set(nextNotes)).slice(0, 6),
  };
}
