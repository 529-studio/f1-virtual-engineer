import { test, expect } from "@playwright/test";

const mockThermalData = {
  status: "success",
  year: 2024,
  event: "Italian Grand Prix",
  session: "Race",
  driver: "LEC",
  lap_number: 15,
  stint_laps: 15,
  wheels: {
    FL: {
      position: "FL",
      compound: "MEDIUM",
      surface_temp: { inner_c: 113.8, center_c: 105.2, outer_c: 102.5 },
      carcass_temp_c: 108.5,
      bulk_temp_c: 107.8,
      thermal_status: "OPTIMAL",
      pressure_status: "OPTIMAL",
      pressure_psi: 24.5,
      camber_deg: -3.5,
      graining_risk: false,
      blistering_risk: false,
      thermal_cliff_risk: false,
      camber_bias_c: 11.3,
    },
    FR: {
      position: "FR",
      compound: "MEDIUM",
      surface_temp: { inner_c: 111.4, center_c: 103.8, outer_c: 99.5 },
      carcass_temp_c: 106.2,
      bulk_temp_c: 105.5,
      thermal_status: "OPTIMAL",
      pressure_status: "OPTIMAL",
      pressure_psi: 24.4,
      camber_deg: -3.5,
      graining_risk: false,
      blistering_risk: false,
      thermal_cliff_risk: false,
      camber_bias_c: 11.9,
    },
    RL: {
      position: "RL",
      compound: "MEDIUM",
      surface_temp: { inner_c: 108.2, center_c: 103.5, outer_c: 103.2 },
      carcass_temp_c: 104.8,
      bulk_temp_c: 104.9,
      thermal_status: "OPTIMAL",
      pressure_status: "OPTIMAL",
      pressure_psi: 22.8,
      camber_deg: -1.8,
      graining_risk: false,
      blistering_risk: false,
      thermal_cliff_risk: false,
      camber_bias_c: 5.0,
    },
    RR: {
      position: "RR",
      compound: "MEDIUM",
      surface_temp: { inner_c: 106.5, center_c: 102.1, outer_c: 100.8 },
      carcass_temp_c: 103.5,
      bulk_temp_c: 103.4,
      thermal_status: "OPTIMAL",
      pressure_status: "OPTIMAL",
      pressure_psi: 22.7,
      camber_deg: -1.8,
      graining_risk: false,
      blistering_risk: false,
      thermal_cliff_risk: false,
      camber_bias_c: 5.7,
    },
  },
  critical_alerts: ["FL: Camber thermal bias (+11.3°C inner delta)"],
};

test.describe("Tyre Thermal Surface Degradation & Carcass 3D Heatmap E2E Validation (V2.1)", () => {
  const viewports = [
    { name: "Desktop", width: 1440, height: 900 },
    { name: "Tablet", width: 834, height: 1112 },
    { name: "Mobile", width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    test(`verifies 3D tyre thermal canvas, cutaway mode, kiosk touch targets, and zero horizontal leak on ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // Dismiss onboarding coachmarks tour
      await page.addInitScript(() => {
        localStorage.setItem("apex_coachmarks_seen", "true");
      });

      // Intercept tyre thermal API requests
      await page.route("**/telemetry/tyre-thermal*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          json: mockThermalData,
        });
      });

      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      await page.goto("/mission-control");

      // 1. Verify Tyre Thermal Heatmap container renders
      const heatmapTitle = page.getByText(/Tyre Thermal Surface Degradation/i).first();
      await expect(heatmapTitle).toBeVisible({ timeout: 10000 });

      // 2. Verify 3D Isometric SVG canvas exists
      const isometricCanvas = page.locator("svg[aria-label*='3D Isometric Tyre Thermal Degradation Canvas']");
      await expect(isometricCanvas).toBeVisible();

      // 3. Verify 4 wheels exist in the canvas
      for (const pos of ["FL", "FR", "RL", "RR"]) {
        const wheelGroup = page.locator(`#wheel-group-${pos}`);
        await expect(wheelGroup).toBeVisible();
      }

      // 4. Kiosk Ergonomics: Verify View Mode Buttons touch targets >= 44px
      const surfaceBtn = page.getByRole("button", { name: "Surface", exact: true });
      const cutawayBtn = page.getByRole("button", { name: "Carcass Cutaway" });
      await expect(surfaceBtn).toBeVisible();
      await expect(cutawayBtn).toBeVisible();

      const surfaceBox = await surfaceBtn.boundingBox();
      const cutawayBox = await cutawayBtn.boundingBox();
      expect(Math.round(surfaceBox?.width ?? 0)).toBeGreaterThanOrEqual(44);
      expect(Math.round(surfaceBox?.height ?? 0)).toBeGreaterThanOrEqual(44);
      expect(Math.round(cutawayBox?.width ?? 0)).toBeGreaterThanOrEqual(44);
      expect(Math.round(cutawayBox?.height ?? 0)).toBeGreaterThanOrEqual(44);

      // 5. Kiosk Ergonomics: Verify Wheel Selector Buttons touch targets >= 44px
      for (const pos of ["FL", "FR", "RL", "RR"]) {
        const wheelBtn = page.getByRole("button", { name: new RegExp(`Select tyre ${pos}`, "i") });
        await expect(wheelBtn).toBeVisible();
        const box = await wheelBtn.boundingBox();
        expect(Math.round(box?.width ?? 0)).toBeGreaterThanOrEqual(44);
        expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44);
      }

      // 6. Interaction: Toggle Carcass Cutaway mode
      await cutawayBtn.click();
      await expect(cutawayBtn).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByText("CARCASS CUTAWAY").first()).toBeVisible();
      await expect(page.getByText("CORE").first()).toBeVisible();

      // Toggle back to Surface mode
      await surfaceBtn.click();
      await expect(surfaceBtn).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByText("SURFACE TREAD").first()).toBeVisible();

      // 7. Interaction: Select Rear-Right (RR) wheel
      const rrBtn = page.getByRole("button", { name: /Select tyre RR/i });
      await rrBtn.click();
      await expect(rrBtn).toHaveAttribute("aria-pressed", "true");

      // Verify Cross-Section Card updates to RR
      const rrTitle = page.getByText(/REAR RIGHT/i).first();
      await expect(rrTitle).toBeVisible();

      // 8. Verify Cross-Section SVG Graph and optimal corridor
      const crossSectionSvg = page.locator("svg[aria-label*='Lateral Tyre Surface Cross Section Profile']");
      await expect(crossSectionSvg).toBeVisible();
      await expect(page.getByText(/OPT MAX 112°C/i)).toBeVisible();
      await expect(page.getByText(/OPT MIN 95°C/i)).toBeVisible();

      // 9. Strict ban on raw unicode emojis
      const heatmapContainer = page.getByTestId("tyre-thermal-heatmap");
      await expect(heatmapContainer).toBeVisible();
      const heatmapText = await heatmapContainer.innerText();
      const rawEmojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{26A0}\u{26A1}\u{26FD}\u{1F3C1}\u{1F525}]/u;
      const emojiMatch = heatmapText.match(rawEmojiRegex);
      expect(emojiMatch).toBeNull();

      // 10. Verify zero horizontal scroll leak
      const hasOverflow = await page.evaluate(
        () => document.body.scrollWidth > document.body.clientWidth
      );
      expect(hasOverflow).toBeFalsy();

      // 11. Assert no fatal console errors
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
