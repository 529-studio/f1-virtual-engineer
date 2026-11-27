import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "Desktop", width: 1440, height: 900 },
  { name: "Tablet", width: 834, height: 1112 },
  { name: "Mobile", width: 390, height: 844 },
];

const mockFeed = {
  status: "success",
  year: 2023,
  event: "Singapore Grand Prix",
  session: "Race",
  total_incidents: 2,
  items: [
    {
      id: "rc-2023-sin-01",
      lap: 19,
      timestamp_str: "12:35:10",
      category: "SAFETY_CAR_INFECT",
      status: "DECISION_REACHED",
      drivers_involved: ["SAR"],
      flag: "YELLOW",
      message: "SAFETY CAR DEPLOYED - CAR 2 (SAR) HIT BARRIER AT TURN 8",
      description: "Debris on track, front wing wedged under barrier.",
    },
    {
      id: "rc-2023-sin-05",
      lap: 54,
      timestamp_str: "13:28:44",
      category: "COLLISION",
      status: "UNDER_INVESTIGATION",
      drivers_involved: ["PER", "ALB"],
      flag: "YELLOW",
      message: "INCIDENT INVOLVING CAR 11 (PER) AND CAR 23 (ALB) AT TURN 13",
      description: "Late braking maneuver resulting in Turn 13 collision.",
    },
  ],
};

const mockInvestigation = {
  status: "success",
  incident_id: "rc-2023-sin-05",
  category: "COLLISION",
  drivers_involved: ["PER", "ALB"],
  regulation_article: "Article 33.4",
  regulation_title: "Driving Standards & Causing an Avoidable Collision",
  regulation_snippet: "Maneuvers liable to hinder other drivers are strictly prohibited.",
  team_defense_argument: "Car 11 held a valid inside line before the apex.",
  steward_prosecution_argument: "Car 11 carried excessive entry speed into Turn 13.",
  predicted_verdict: "TIME_PENALTY_5S",
  confidence_pct: 92,
  penalty_breakdown: [
    { penalty: "TIME_PENALTY_5S", probability_pct: 70, description: "Standard collision penalty." },
  ],
};

test.describe("StewardReportExporter E2E", () => {
  for (const vp of VIEWPORTS) {
    test(`exports steward dossier in markdown and validates kiosk layout on ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
      context,
    }) => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.addInitScript(() => {
        localStorage.setItem("apex_coachmarks_seen", "true");
      });

      await page.route(/.*\/race-control\/feed.*/, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockFeed),
        });
      });

      await page.route(/.*\/race-control\/investigate.*/, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockInvestigation),
        });
      });

      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });

      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/mission-control");

      const exporter = page.getByTestId("steward-report-exporter");
      await expect(exporter).toBeAttached({ timeout: 10000 });
      await exporter.scrollIntoViewIfNeeded();
      await expect(exporter).toBeVisible({ timeout: 5000 });

      // Validate kiosk touch targets >= 44px
      const downloadBtn = exporter.getByRole("button", { name: /Download \.md/i });
      const copyBtn = exporter.getByRole("button", { name: /Copy Markdown/i });
      const printBtn = exporter.getByRole("button", { name: /Print \/ PDF/i });
      const fullSessionBtn = exporter.getByRole("button", { name: /Full Session/i });

      for (const btn of [downloadBtn, copyBtn, printBtn, fullSessionBtn]) {
        const box = await btn.boundingBox();
        expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44);
      }

      // Switch to Full Session scope and trigger Download .md
      await fullSessionBtn.click();
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        downloadBtn.click(),
      ]);
      expect(download.suggestedFilename()).toContain("steward-dossier-");
      expect(download.suggestedFilename()).toContain("full-session.md");

      // Trigger Copy Markdown and verify status toast
      await copyBtn.click();
      await expect(exporter.getByRole("status")).toContainText(/copied/i);

      // Zero horizontal overflow
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(overflow).toBe(false);

      // Zero unicode emojis
      const hasEmoji = await page.evaluate(() =>
        /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(document.body.innerText)
      );
      expect(hasEmoji).toBe(false);

      const criticalErrors = errors.filter(
        (e) => !e.includes("net::ERR_") && !e.includes("favicon") && !e.includes("404")
      );
      expect(criticalErrors).toHaveLength(0);
    });
  }
});
