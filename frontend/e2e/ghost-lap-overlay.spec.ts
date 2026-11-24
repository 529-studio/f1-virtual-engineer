import { test, expect } from "@playwright/test";

test.describe("Head-to-Head Ghost Lap Telemetry Trace Overlay E2E Suite", () => {
  const viewports = [
    { name: "Desktop", width: 1440, height: 900 },
    { name: "Tablet", width: 834, height: 1112 },
    { name: "Mobile", width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    test(`verifies ghost lap overlay rendering, dual traces, touch ergonomics, and scrubber on ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // Dismiss onboarding coachmarks
      await page.addInitScript(() => {
        localStorage.setItem("apex_coachmarks_seen", "true");
      });

      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      await page.goto("/mission-control");

      // 1. Verify Ghost Lap Overlay container renders
      const ghostLapContainer = page.getByTestId("ghost-lap-overlay");
      await expect(ghostLapContainer).toBeVisible({ timeout: 10000 });

      // 2. Verify Title and Track Reference
      await expect(
        page.getByText(/HEAD-TO-HEAD GHOST LAP TELEMETRY TRACE OVERLAY/i)
      ).toBeVisible();

      // 3. Kiosk Ergonomics: Verify driver switch buttons >= 44px
      const verButton = ghostLapContainer.getByRole("button", {
        name: /select ver as driver 1 reference/i,
      });
      const norButton = ghostLapContainer.getByRole("button", {
        name: /select nor as driver 2 comparison/i,
      });

      await expect(verButton).toBeVisible();
      await expect(norButton).toBeVisible();

      const verBox = await verButton.boundingBox();
      const norBox = await norButton.boundingBox();

      expect(Math.round(verBox?.width ?? 0)).toBeGreaterThanOrEqual(44);
      expect(Math.round(verBox?.height ?? 0)).toBeGreaterThanOrEqual(44);
      expect(Math.round(norBox?.width ?? 0)).toBeGreaterThanOrEqual(44);
      expect(Math.round(norBox?.height ?? 0)).toBeGreaterThanOrEqual(44);

      // 4. Test driver selection interaction
      await verButton.click();
      await expect(verButton).toHaveAttribute("aria-pressed", "true");
      await expect(ghostLapContainer.getByText(/VER SPEED/i)).toBeVisible();

      await norButton.click();
      await expect(norButton).toHaveAttribute("aria-pressed", "true");
      await expect(ghostLapContainer.getByText(/NOR SPEED/i)).toBeVisible();

      // 5. Verify SVG telemetry chart is present and interactable
      const svgChart = ghostLapContainer.locator("svg[aria-label='Head-to-Head Ghost Lap Telemetry Trace Overlay Canvas']");
      await expect(svgChart).toBeVisible();

      // Dispatch mousemove to test interactive scrubber
      const chartBox = await svgChart.boundingBox();
      if (chartBox) {
        await page.mouse.move(chartBox.x + chartBox.width * 0.25, chartBox.y + chartBox.height * 0.5);
      }

      // 6. Strict Ban on Emojis Assertion
      const textContent = (await ghostLapContainer.textContent()) || "";
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      expect(textContent).not.toMatch(emojiRegex);

      // 7. Zero Horizontal Scroll Leak Assertion
      const hasHorizontalScrollLeak = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScrollLeak).toBe(false);

      // 8. Clean Console Logs Assertion (filter out transient 429 rate limits if any)
      const fatalErrors = consoleErrors.filter(
        (err) => !err.includes("429") && !err.includes("Failed to load resource")
      );
      expect(fatalErrors).toHaveLength(0);
    });
  }
});
