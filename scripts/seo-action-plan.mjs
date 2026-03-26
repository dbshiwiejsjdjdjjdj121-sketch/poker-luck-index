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
const actionItems = buildActionItems(report);
const issueTitle = buildIssueTitle(report);

const actionPlan = {
  generatedAt: report.generatedAt,
  issueTitle,
  focus: buildFocus(report),
  actions: actionItems,
};

fs.writeFileSync(actionPlanJsonPath, `${JSON.stringify(actionPlan, null, 2)}\n`);
fs.writeFileSync(actionPlanMarkdownPath, buildActionPlanMarkdown(actionPlan, report));
fs.writeFileSync(issueBodyPath, buildIssueBody(actionPlan, report));

console.log(`SEO action plan written to ${actionPlanMarkdownPath}`);
console.log(`SEO issue body written to ${issueBodyPath}`);

function buildActionItems(inputReport) {
  const recommendations = Array.isArray(inputReport.recommendations)
    ? inputReport.recommendations
    : [];

  if (recommendations.length === 0) {
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

function buildIssueTitle(inputReport) {
  const date = inputReport.generatedAt?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  return `SEO action plan ${date}`;
}

function buildActionPlanMarkdown(plan, inputReport) {
  const lines = [
    "# SEO Action Plan",
    "",
    `Generated: ${plan.generatedAt}`,
    `Issue title: ${plan.issueTitle}`,
    "",
    "## Focus",
    "",
    `- Top page: ${plan.focus.topPage}`,
    `- Top query: ${plan.focus.topQuery || "(none)"}`,
    `- Top landing page: ${plan.focus.topLanding}`,
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
