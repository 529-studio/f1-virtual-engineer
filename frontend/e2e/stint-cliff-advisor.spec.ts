import { test, expect } from "@playwright/test";

const mockTyreDegradationPayload = {
  status: "success",
  year: 2024,
  event: "Italian Grand Prix",
  driver: "LEC",
  compound: "HARD",
  current_stint_laps: 18,
  current_time_loss_s: 0.749,
  projected_cliff_lap: 38,
  laps_until_cliff: 20,
  pit_window_start_lap: 34,
  pit_window_end_lap: 39,
  undercut_gain_estimate_s: 5.0,
  overcut_viable: true,
  fallback: false,
  trajectory: [
    { lap: 1, time_loss_s: 0.021, grip_percent: 99.4 },
    { lap: 10, time_loss_s: 0.320, grip_percent: 91.0 },
    { lap: 18, time_loss_s: 0.749, grip_percent: 79.0 },
    { lap: 25, time_loss_s: 1.250, grip_percent: 65.0 },
    { lap: 34, time_loss_s: 2.069, grip_percent: 42.1 },
    { lap: 38, time_loss_s: 2.493, grip_percent: 30.2 },
    { lap: 45, time_loss_s: 3.330, grip_percent: 20.0 },
  ],
};

test.describe("Pirelli Stint Degradation & Cliff Advisor E2E Suite", () => {
  const viewports = [
    { name: "Desktop", width: 1440, height: 900 },
    { name: "Tablet", width: 834, height: 1112 },
    { name: "Mobile", width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    test(`renders degradation chart, verifies touch targets, and switches compound on ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // Dismiss onboarding coachmarks
      await page.addInitScript(() => {
        localStorage.setItem("apex_coachmarks_seen", "true");
      });

      // Intercept tyre degradation API
      await page.route("**/*tyre-degradation*", async (route) => {
        const url = new URL(route.request().url());
        const comp = url.searchParams.get("compound") || "HARD";
        const copy = JSON.parse(JSON.stringify(mockTyreDegradationPayload));
        copy.compound = comp;
        if (comp === "SOFT") {
          copy.projected_cliff_lap = 16;
          copy.laps_until_cliff = 0;
          copy.pit_window_start_lap = 12;
          copy.pit_window_end_lap = 17;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          json: copy,
        });
      });

      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      await page.goto("/mission-control");

      // 1. Verify Stint Cliff Advisor container renders
      const advisorContainer = page.getByTestId("stint-cliff-advisor");
      await expect(advisorContainer).toBeVisible({ timeout: 10000 });

      // 2. Verify Metric Cards
      await expect(page.getByText("PACE LOSS").first()).toBeVisible();
      await expect(page.getByText("PROJECTED CLIFF").first()).toBeVisible();
      await expect(page.getByText("OPTIMAL PIT BOX").first()).toBeVisible();
      await expect(page.getByText("UNDERCUT GAIN").first()).toBeVisible();
      await expect(page.getByText(/Lap 38/i).first()).toBeVisible();

      // 3. Kiosk Ergonomics: Verify Compound Selector buttons >= 44px
      for (const comp of ["SOFT", "MEDIUM", "HARD"]) {
        const btn = page.getByRole("button", { name: `Select ${comp} compound model` });
        await expect(btn).toBeVisible();
        const box = await btn.boundingBox();
        expect(Math.round(box?.width ?? 0)).toBeGreaterThanOrEqual(44);
        expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44);
      }

      // 4. Verify SVG Degradation Trajectory Chart renders
      const chartSvg = page.locator("svg[aria-label*='Pirelli Tyre Degradation Trajectory Curve Chart']");
      await expect(chartSvg).toBeVisible();
      await expect(chartSvg.locator("polyline")).toBeVisible();
      await expect(chartSvg.getByText(/CLIFF/i).first()).toBeVisible();

      // 5. Interaction: Switch compound to SOFT
      const softBtn = page.getByRole("button", { name: "Select SOFT compound model" });
      await softBtn.click();
      await expect(softBtn).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByText(/Lap 16/i).first()).toBeVisible();

      // 6. Strict ban on raw unicode emojis
      const containerText = await advisorContainer.innerText();
      const rawEmojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{26A0}\u{26A1}\u{26FD}\u{1F3C1}\u{1F525}]/u;
      expect(containerText.match(rawEmojiRegex)).toBeNull();

      // 7. Verify zero horizontal scroll leak
      const hasOverflow = await page.evaluate(
        () => document.body.scrollWidth > document.body.clientWidth
      );
      expect(hasOverflow).toBeFalsy();

      // 8. Assert no fatal console errors
      const fatalErrors = consoleErrors.filter(
        (err) =>
          !err.includes("favicon") &&
          !err.includes("FastF1") &&
          !err.includes("Failed to load resource")
      );
      expect(fatalErrors).toHaveLength(0);
    });
  }
});
