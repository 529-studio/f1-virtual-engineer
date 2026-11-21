import { test, expect } from "@playwright/test";

test.describe("Advanced Telemetry Cockpit End-to-End Validation (#63)", () => {
  const viewports = [
    { name: "Desktop", width: 1440, height: 900 },
    { name: "Tablet", width: 834, height: 1112 },
    { name: "Mobile", width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    test(`verifies cockpit controls, modal, and zero horizontal leak on ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // Dismiss onboarding coachmarks tour
      await page.addInitScript(() => {
        localStorage.setItem("apex_coachmarks_seen", "true");
      });

      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      await page.goto("http://localhost:3000/mission-control");

      // 1. Verify Export Button is visible and touch target >= 44px
      const exportBtn = page.locator("button:visible", { hasText: /Export/i }).first();
      await expect(exportBtn).toBeVisible();
      const exportBox = await exportBtn.boundingBox();
      expect(exportBox?.height).toBeGreaterThanOrEqual(44);

      // 2. Open Export dropdown menu and verify CSV & Parquet options
      await exportBtn.click();
      const csvOption = page.getByRole("menuitem", { name: /CSV Document/i });
      const parquetOption = page.getByRole("menuitem", { name: /Apache Parquet/i });
      await expect(csvOption).toBeVisible();
      await expect(parquetOption).toBeVisible();

      // Close dropdown by pressing Escape
      await page.keyboard.press("Escape");

      // 3. Verify Stint Compare Modal Trigger
      const stintBtn = page.locator("button:visible[aria-label='Open Stint Comparison']").first();
      if (await stintBtn.count() > 0 && await stintBtn.isVisible()) {
        const stintBox = await stintBtn.boundingBox();
        expect(stintBox?.height).toBeGreaterThanOrEqual(44);

        await stintBtn.click();

        // Assert Modal Dialog rendered
        const modal = page.getByRole("dialog");
        await expect(modal).toBeVisible();
        await expect(page.getByText(/Multi-Lap Stint Comparison/i)).toBeVisible();

        // Close modal
        await page.keyboard.press("Escape");
        await expect(modal).not.toBeVisible();
      }

      // 4. Verify Channels View Mode Switcher
      const dynamicsTab = page.getByRole("tab", { name: /G-G & Steering/i }).first();
      if (await dynamicsTab.isVisible()) {
        await dynamicsTab.click();

        // Assert G-G Friction Circle card and Steering Trace card are rendered
        await expect(page.getByText(/G-G Friction Circle/i)).toBeVisible();
        await expect(page.getByText(/Steering Trace/i)).toBeVisible();
      }

      // 5. Assert Zero Horizontal Overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(overflow).toBe(false);

      // 6. Assert Zero Unhandled Console Errors
      const criticalErrors = consoleErrors.filter(
        (err) =>
          !err.includes("favicon") &&
          !err.includes("Failed to load resource: net::ERR_CONNECTION_REFUSED")
      );
      expect(criticalErrors).toHaveLength(0);
    });
  }
});
