import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "Desktop", width: 1440, height: 900 },
  { name: "Tablet", width: 834, height: 1112 },
  { name: "Mobile", width: 390, height: 844 },
];

const mockLookupResponse = {
  status: "success",
  query: "Article 33.4 moving under braking",
  citations: [
    {
      id: "reg-sporting-overtaking",
      title: "FIA Sporting Regulations — Overtaking & Moving Under Braking",
      source: "FIA Formula 1 Sporting Regulations",
      section: "Article 33.4 / Appendix L Ch IV",
      topics: ["overtaking", "driving-standards"],
      snippet: "No car may be driven in a manner that could endanger another driver or involve abnormal change of direction under braking.",
      score: 112.45,
      article: "33.4",
      clause: "33.4",
      season: 2024,
      verbatim: true,
    },
  ],
};

const mockNoteResponse = {
  status: "success",
  note: {
    id: "reg-sporting-overtaking",
    title: "FIA Sporting Regulations — Overtaking & Moving Under Braking",
    source: "FIA Formula 1 Sporting Regulations",
    section: "Article 33.4 / Appendix L Ch IV",
    topics: ["overtaking", "driving-standards"],
    body: "Article 33.4 states that at no time may a car be driven unnecessarily slowly, erratically or in a manner which could be deemed potentially dangerous to other drivers. Any more than one change of direction to defend a position is not permitted.",
    article: "33.4",
    clause: "33.4",
    season: 2024,
    verbatim: true,
  },
};

test.describe("FiaRegulationAssistant E2E", () => {
  for (const vp of VIEWPORTS) {
    test(`searches FIA regulations, expands full article, and meets kiosk ergonomics on ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      await page.addInitScript(() => {
        localStorage.setItem("apex_coachmarks_seen", "true");
      });

      await page.route(/.*\/knowledge\/lookup.*/, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockLookupResponse),
        });
      });

      await page.route(/.*\/knowledge\/note\/.*/, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockNoteResponse),
        });
      });

      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });

      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/mission-control");

      // Expand HUD if collapsed on Tablet/Mobile
      const expandBtn = page.getByRole("button", { name: /Expand Strategy HUD/i });
      if (await expandBtn.isVisible().catch(() => false)) {
        await expandBtn.click();
      } else if (vp.width < 768) {
        await page.evaluate(() => window.dispatchEvent(new CustomEvent("apex:open-hud")));
      }

      const regsTab = page.getByRole("button", { name: "REGS", exact: true });
      await expect(regsTab).toBeVisible({ timeout: 5000 });
      const tabBox = await regsTab.boundingBox();
      expect(Math.round(tabBox?.height ?? 0)).toBeGreaterThanOrEqual(44);
      await regsTab.click();

      const assistant = page.getByTestId("fia-regulation-assistant");
      await expect(assistant).toBeVisible();

      // Click quick rulebook chip
      const quickChip = assistant.getByRole("button", { name: /Art 33\.4 Moving under braking/i });
      const chipBox = await quickChip.boundingBox();
      expect(Math.round(chipBox?.height ?? 0)).toBeGreaterThanOrEqual(44);
      await quickChip.click();

      const results = page.getByTestId("fia-regulation-results");
      await expect(results).toBeVisible({ timeout: 5000 });
      await expect(results.getByText(/Overtaking & Moving Under Braking/i)).toBeVisible();

      // Expand full article
      const readBtn = results.getByRole("button", { name: /Read Full Article/i });
      const readBox = await readBtn.boundingBox();
      expect(Math.round(readBox?.height ?? 0)).toBeGreaterThanOrEqual(44);
      await readBtn.click();

      const noteBody = page.getByTestId("fia-note-body-reg-sporting-overtaking");
      await expect(noteBody).toBeVisible();
      await expect(noteBody).toContainText(/Any more than one change of direction/i);

      // Zero horizontal scroll leak
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
