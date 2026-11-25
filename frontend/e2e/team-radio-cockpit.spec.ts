import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const fixturePath = path.resolve(
  __dirname,
  "../../backend/data/fixtures/team_radio_singapore_2023.json"
);
const fixtureData = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));

test.describe("AI Team Radio Cockpit End-to-End Validation (V2.1)", () => {
  const viewports = [
    { name: "Desktop", width: 1440, height: 900 },
    { name: "Tablet", width: 834, height: 1112 },
    { name: "Mobile", width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    test(`verifies team radio cockpit playback, filters, and zero horizontal leak on ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // Dismiss onboarding coachmarks tour
      await page.addInitScript(() => {
        localStorage.setItem("apex_coachmarks_seen", "true");
      });

      // Intercept radio feed network request with authentic curated Singapore 2023 dataset
      await page.route("**/radio/feed*", async (route) => {
        const url = new URL(route.request().url());
        const driverNum = url.searchParams.get("driver_number");
        if (driverNum) {
          const num = parseInt(driverNum, 10);
          const filtered = fixtureData.items.filter(
            (item: { driver_number: number }) => item.driver_number === num
          );
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            json: {
              ...fixtureData,
              total_messages: filtered.length,
              items: filtered,
            },
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            json: fixtureData,
          });
        }
      });

      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      await page.goto("/mission-control");

      // On Tablet / Mobile, expand the HUD drawer via its natural responsive trigger button
      if (vp.width < 1280) {
        const hudTrigger = page.getByRole("button", { name: /Strategy HUD/i }).first();
        await expect(hudTrigger).toBeVisible({ timeout: 10000 });
        await hudTrigger.click();
      }

      // 1. Locate and switch to the RADIO tab inside Strategy HUD
      const radioTabBtn = page.locator("aside").getByRole("button", { name: /^RADIO$/i }).first();
      await expect(radioTabBtn).toBeVisible({ timeout: 10000 });
      await radioTabBtn.click();

      // 2. Verify Team Radio Cockpit container renders
      const cockpitHeader = page.getByText(/AI TEAM RADIO COCKPIT/i).first();
      await expect(cockpitHeader).toBeVisible({ timeout: 10000 });

      // 3. Verify driver filter buttons exist with touch target >= 44px
      const saiFilterBtn = page.getByRole("button", { name: "Filter by driver SAI" });
      await expect(saiFilterBtn).toBeVisible();
      const saiBox = await saiFilterBtn.boundingBox();
      expect(saiBox?.width).toBeGreaterThanOrEqual(44);
      expect(saiBox?.height).toBeGreaterThanOrEqual(44);

      // Filter by SAI
      await saiFilterBtn.click();
      await expect(saiFilterBtn).toHaveAttribute("aria-pressed", "true");

      // 4. Verify Play button touch target >= 44px and interact with playback
      const playBtn = page.locator("button:visible[aria-label*='team radio audio']").first();
      await expect(playBtn).toBeVisible();
      const playBox = await playBtn.boundingBox();
      expect(playBox?.width).toBeGreaterThanOrEqual(44);
      expect(playBox?.height).toBeGreaterThanOrEqual(44);

      // Click Play
      await playBtn.click();

      // 5. Verify Pit-Wall Filter button touch target >= 44px
      const filterBtn = page.getByRole("button", { name: "Toggle Pit-Wall Bandpass Filter" });
      await expect(filterBtn).toBeVisible();
      const filterBox = await filterBtn.boundingBox();
      expect(filterBox?.width).toBeGreaterThanOrEqual(44);
      expect(filterBox?.height).toBeGreaterThanOrEqual(44);

      // Click to toggle EQ filter
      await filterBtn.click();

      // 6. Verify waveform scrubber slider exists and has valid aria labels
      const scrubber = page.getByRole("slider", { name: "Audio scrubber timeline" });
      await expect(scrubber).toBeVisible();

      // 7. Verify strict zero horizontal scroll leak
      const hasOverflow = await page.evaluate(
        () => document.body.scrollWidth > document.body.clientWidth
      );
      expect(hasOverflow).toBeFalsy();

      // 8. Assert no uncaught JS console errors
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
