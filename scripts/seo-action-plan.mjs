import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const reportDir = path.join(repoRoot, "reports", "seo");
const reportJsonPath = path.join(reportDir, "latest.json");
const actionPlanMarkdownPath = path.join(reportDir, "action-plan.md");
const actionPlanJsonPath = path.join(reportDir, "action-plan.json");
const issueBodyPath = path.join(reportDir, "issue-body.md");

if (!fs.existsSync(reportJsonPath)) {
  throw new Error(`SEO report not found at ${reportJsonPath}. Run npm run seo:report first.`);
}

const report = JSON.parse(fs.readFileSync(reportJsonPath, "utf8"));
const signal = buildSignalSummary(report);
const mode = deriveExecutionMode(signal);
const actionItems = buildActionItems(report, mode);
const issueTitle = buildIssueTitle(report);

const actionPlan = {
  generatedAt: report.generatedAt,
  issueTitle,
  mode,
  signal,
  focus: buildFocus(report),
  actions: actionItems,
};

fs.writeFileSync(actionPlanJsonPath, `${JSON.stringify(actionPlan, null, 2)}\n`);
fs.writeFileSync(actionPlanMarkdownPath, buildActionPlanMarkdown(actionPlan, report));
fs.writeFileSync(issueBodyPath, buildIssueBody(actionPlan, report));

console.log(`SEO action plan written to ${actionPlanMarkdownPath}`);
console.log(`SEO issue body written to ${issueBodyPath}`);

function buildActionItems(inputReport, mode) {
  const recommendations = Array.isArray(inputReport.recommendations)
    ? inputReport.recommendations
    : [];

  if (recommendations.length === 0) {
    if (mode === "foundation") {
      return [
        {
          priority: "medium",
          target: "foundational-seo",
          objective:
            "Traffic and query data are still sparse, so this week should focus on one safe foundational SEO improvement.",
          executionNotes:
            "Use the fixed competitor set and keyword map to improve one existing core page such as `/`, `/bankroll`, or `/hand-review` before creating new pages.",
          suggestedOutput:
            "Tighten metadata, add a people-first FAQ block, strengthen internal links, or clarify above-the-fold positioning.",
        },
      ];
    }

    if (mode === "discovery") {
      return [
        {
          priority: "medium",
          target: "discovery-seo",
          objective:
            "Early impressions are appearing, so this week should strengthen the page or query with the clearest emerging signal.",
          executionNotes:
            "Prefer one focused CTR, FAQ, or internal-link improvement tied to the top page or top query instead of broad site rewrites.",
          suggestedOutput:
            "Refresh the top page title and description, or add one tightly scoped FAQ/support section for the emerging query.",
        },
      ];
    }

    return [
      {
        priority: "low",
        target: "monitoring",
        objective: "No urgent SEO edits were detected in this run.",
        executionNotes:
          "Keep collecting data for another week and review whether a new landing page or FAQ cluster should be added.",
      },
    ];
  }

  return recommendations.map((item, index) => ({
    rank: index + 1,
    priority: item.priority,
    target: item.target,
    objective: item.reason,
    executionNotes: item.action,
    suggestedOutput: guessOutput(item),
  }));
}

function buildFocus(inputReport) {
  const topPage = inputReport.searchConsole?.topPages?.[0]?.key || "/";
  const topQuery = inputReport.searchConsole?.topQueries?.[0]?.key || "";
  const topLanding = inputReport.ga4?.topLandingPages?.[0]?.landingPage || "/";

  return {
    topPage,
    topQuery,
    topLanding,
  };
}

function buildIssueTitle() {
  return "SEO Weekly Action Plan";
}

function buildSignalSummary(inputReport) {
  const pageImpressions = sumRows(inputReport.searchConsole?.topPages, "impressions");
  const queryImpressions = sumRows(inputReport.searchConsole?.topQueries, "impressions");
  const sessions = sumRows(inputReport.ga4?.topLandingPages, "sessions");
  const toolActivations =
    Number(inputReport.ga4?.eventTotals?.bankroll_record_added || 0) +
    Number(inputReport.ga4?.eventTotals?.hand_saved || 0);
  const checkoutStarts = Number(inputReport.ga4?.eventTotals?.checkout_started || 0);

  return {
    pageImpressions,
    queryImpressions,
    sessions,
    toolActivations,
    checkoutStarts,
  };
}

function deriveExecutionMode(signal) {
  if (signal.pageImpressions < 20 && signal.sessions < 10 && signal.toolActivations === 0) {
    return "foundation";
  }

  if (signal.pageImpressions < 150 && signal.checkoutStarts < 5) {
    return "discovery";
  }

  return "conversion";
}

function buildActionPlanMarkdown(plan, inputReport) {
  const lines = [
    "# SEO Action Plan",
    "",
    `Generated: ${plan.generatedAt}`,
    `Issue title: ${plan.issueTitle}`,
    `Execution mode: ${plan.mode}`,
    "",
    "## Focus",
    "",
    `- Top page: ${plan.focus.topPage}`,
    `- Top query: ${plan.focus.topQuery || "(none)"}`,
    `- Top landing page: ${plan.focus.topLanding}`,
    "",
    "## Signal Summary",
    "",
    `- Page impressions: ${plan.signal.pageImpressions}`,
    `- Query impressions: ${plan.signal.queryImpressions}`,
    `- Sessions: ${plan.signal.sessions}`,
    `- Tool activations: ${plan.signal.toolActivations}`,
    `- Checkout starts: ${plan.signal.checkoutStarts}`,
    "",
    "## Actions",
    "",
    ...plan.actions.map((item) => {
      const parts = [
        `${item.rank || "-"}. [${item.priority}] ${item.target}`,
        `Objective: ${item.objective}`,
        `Execution: ${item.executionNotes}`,
      ];

      if (item.suggestedOutput) {
        parts.push(`Suggested output: ${item.suggestedOutput}`);
      }

      return parts.join("\n");
    }),
    "",
    "## Context",
    "",
    `- Current window: ${inputReport.window?.current?.startDate} to ${inputReport.window?.current?.endDate}`,
    `- Checkout started: ${inputReport.ga4?.eventTotals?.checkout_started || 0}`,
    `- Checkout completed: ${inputReport.ga4?.eventTotals?.checkout_completed || 0}`,
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function buildIssueBody(plan, inputReport) {
  const lines = [
    "## SEO Automation Summary",
    "",
    `Generated from the scheduled report at ${plan.generatedAt}.`,
    "",
    "### Current Focus",
    "",
    `- Top page: ${plan.focus.topPage}`,
    `- Top query: ${plan.focus.topQuery || "(none)"}`,
    `- Top landing page: ${plan.focus.topLanding}`,
    `- Execution mode: ${plan.mode}`,
    "",
    "### Signal Summary",
    "",
    `- Page impressions: ${plan.signal.pageImpressions}`,
    `- Query impressions: ${plan.signal.queryImpressions}`,
    `- Sessions: ${plan.signal.sessions}`,
    `- Tool activations: ${plan.signal.toolActivations}`,
    `- Checkout starts: ${plan.signal.checkoutStarts}`,
    "",
    "### Recommended Actions",
    "",
    ...plan.actions.flatMap((item) => {
      const block = [
        `#### ${item.rank || "-"}: ${item.target} [${item.priority}]`,
        "",
        `- Objective: ${item.objective}`,
        `- Execution: ${item.executionNotes}`,
      ];

      if (item.suggestedOutput) {
        block.push(`- Suggested output: ${item.suggestedOutput}`);
      }

      block.push("");
      return block;
    }),
    "### Source Report",
    "",
    `- Current window: ${inputReport.window?.current?.startDate} to ${inputReport.window?.current?.endDate}`,
    `- Checkout started: ${inputReport.ga4?.eventTotals?.checkout_started || 0}`,
    `- Checkout completed: ${inputReport.ga4?.eventTotals?.checkout_completed || 0}`,
    "",
    "Artifacts from this workflow include the full markdown report and JSON payload.",
  ];

  return `${lines.join("\n")}\n`;
}

function guessOutput(item) {
  switch (item.type) {
    case "ctr":
      return "Rewrite title tag, meta description, and first-screen copy.";
    case "query":
      return "Add FAQ entries, internal links, or a dedicated landing section.";
    case "homepage":
      return "Adjust home hero hierarchy and tool CTA emphasis.";
    case "activation":
      return "Tighten onboarding copy and reduce first-action friction on the target page.";
    case "monetization":
      return "Refine premium gate and checkout trust copy.";
    case "ops":
      return "Fix missing platform configuration before the next report run.";
    default:
      return "Review the page and ship a focused SEO/content update.";
  }
}

function sumRows(rows, key) {
  if (!Array.isArray(rows)) {
    return 0;
  }

  return rows.reduce((total, row) => total + Number(row?.[key] || 0), 0);
}
