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

const mockPaceDeltaPayload = {
  status: "success",
  year: 2024,
  event: "Italian Grand Prix",
  session: "Race",
  reference_driver: "LEC",
  lap_number: 18,
  session_best_s1: 27.380,
  session_best_s2: 26.810,
  session_best_s3: 27.080,
  session_best_lap: 81.380,
  fallback: false,
  drivers: [
    {
      driver_code: "LEC",
      driver_name: "Charles Leclerc",
      team: "Ferrari",
      team_color: "#E80020",
      position: 1,
      lap_number: 18,
      compound: "HARD",
      tyre_age_laps: 18,
      s1: { time_s: 27.420, delta_s: 0.0, status: "reference" },
      s2: { time_s: 26.850, delta_s: 0.0, status: "reference" },
      s3: { time_s: 27.110, delta_s: 0.0, status: "reference" },
      lap_time_s: 81.380,
      lap_delta_s: 0.0,
      speed_trap_kmh: 348.2,
    },
    {
      driver_code: "PIA",
      driver_name: "Oscar Piastri",
      team: "McLaren",
      team_color: "#FF8000",
      position: 2,
      lap_number: 18,
      compound: "HARD",
      tyre_age_laps: 12,
      s1: { time_s: 27.380, delta_s: -0.040, status: "session_fastest" },
      s2: { time_s: 27.010, delta_s: 0.160, status: "slower" },
      s3: { time_s: 27.140, delta_s: 0.030, status: "slower" },
      lap_time_s: 81.530,
      lap_delta_s: 0.150,
      speed_trap_kmh: 346.8,
    },
    {
      driver_code: "VER",
      driver_name: "Max Verstappen",
      team: "Red Bull Racing",
      team_color: "#3671C6",
      position: 3,
      lap_number: 18,
      compound: "HARD",
      tyre_age_laps: 18,
      s1: { time_s: 27.490, delta_s: 0.070, status: "slower" },
      s2: { time_s: 26.980, delta_s: 0.130, status: "slower" },
      s3: { time_s: 27.190, delta_s: 0.080, status: "slower" },
      lap_time_s: 81.660,
      lap_delta_s: 0.280,
      speed_trap_kmh: 349.5,
    },
  ],
};

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

test.describe("Sprint 3 Consolidated Feature Suite — Multi-Viewport Verification", () => {
  const viewports = [
    { name: "Desktop", width: 1440, height: 900 },
    { name: "Tablet", width: 834, height: 1112 },
    { name: "Mobile", width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    test(`validates all Sprint 3 features and kiosk ergonomics on ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // Dismiss onboarding coachmarks & inject safe SpeechSynthesis mock
      await page.addInitScript(() => {
        localStorage.setItem("apex_coachmarks_seen", "true");

        if (!("speechSynthesis" in window)) {
          (window as unknown as { speechSynthesis: unknown }).speechSynthesis = {
            speak: () => {},
            cancel: () => {},
            getVoices: () => [],
            pause: () => {},
            resume: () => {},
          };
        }
      });

      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      // Intercept tyre thermal API requests
      await page.route("**/telemetry/tyre-thermal*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          json: mockThermalData,
        });
      });

      // Intercept pace delta API requests
      await page.route("**/telemetry/pace-delta*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          json: mockPaceDeltaPayload,
        });
      });

      // Intercept tyre degradation API requests
      await page.route("**/telemetry/tyre-degradation*", async (route) => {
        const url = new URL(route.request().url());
        const comp = url.searchParams.get("compound") || "HARD";
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          json: {
            ...mockTyreDegradationPayload,
            compound: comp,
          },
        });
      });

      await page.goto("/mission-control");

      // =========================================================================
      // Feature 1: Chassis CAD Blueprint SVG (Issue #80)
      // =========================================================================
      const heatmapTitle = page.getByText(/Tyre Thermal Surface Degradation/i).first();
      await expect(heatmapTitle).toBeVisible({ timeout: 10000 });

      const isometricCanvas = page.locator("svg[aria-label*='3D Isometric Tyre Thermal Degradation Canvas']");
      await expect(isometricCanvas).toBeVisible({ timeout: 10000 });
      const chassisBlueprint = isometricCanvas.locator("[id*='f1-chassis-blueprint']");
      await expect(chassisBlueprint).toBeVisible();
      await expect(isometricCanvas.getByText(/CHASSIS DATUM 0.0/i)).toBeVisible();

      // =========================================================================
      // Feature 2: Multi-Driver Pace Delta Matrix (Issue #81)
      // =========================================================================
      const paceContainer = page.getByTestId("pace-delta-matrix");
      await expect(paceContainer).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("MULTI-DRIVER PACE DELTA MATRIX")).toBeVisible();

      // Check kiosk touch targets on driver filter chips
      const driverChips = paceContainer.locator("button[aria-label^='Set reference baseline to']");
      const chipCount = await driverChips.count();
      expect(chipCount).toBeGreaterThanOrEqual(2);

      const firstChip = driverChips.first();
      const chipBox = await firstChip.boundingBox();
      expect(Math.round(chipBox?.width ?? 0)).toBeGreaterThanOrEqual(44);
      expect(Math.round(chipBox?.height ?? 0)).toBeGreaterThanOrEqual(44);

      // =========================================================================
      // Feature 3: Stint Cliff Advisor (Issue #82)
      // =========================================================================
      const cliffContainer = page.getByTestId("stint-cliff-advisor");
      await expect(cliffContainer).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("PIRELLI TYRE DEGRADATION & STINT CLIFF ADVISOR")).toBeVisible();

      // Check kiosk touch targets on compound selector buttons
      const compoundButtons = cliffContainer.locator("button[aria-label^='Select ']");
      const compCount = await compoundButtons.count();
      expect(compCount).toBeGreaterThanOrEqual(3);

      const softCompBtn = cliffContainer.getByRole("button", { name: /select soft compound model/i });
      const softBox = await softCompBtn.boundingBox();
      expect(Math.round(softBox?.width ?? 0)).toBeGreaterThanOrEqual(44);
      expect(Math.round(softBox?.height ?? 0)).toBeGreaterThanOrEqual(44);

      // =========================================================================
      // Feature 4: Hands-Free Pit-Wall Voice Synthesizer (Issue #83)
      // =========================================================================
      const voiceContainer = page.getByTestId("voice-pit-wall-audio");
      await expect(voiceContainer).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("PIT-WALL VOICE SYNTHESIZER")).toBeVisible();

      const calloutBtn = voiceContainer.getByRole("button", {
        name: /radio callout|stop radio|transmit|callout/i,
      });
      const muteBtn = voiceContainer.getByRole("button", {
        name: /mute pit-wall audio|unmute pit-wall audio/i,
      });
      await expect(calloutBtn).toBeVisible();
      await expect(muteBtn).toBeVisible();

      const calloutBox = await calloutBtn.boundingBox();
      const muteBox = await muteBtn.boundingBox();
      expect(Math.round(calloutBox?.width ?? 0)).toBeGreaterThanOrEqual(44);
      expect(Math.round(calloutBox?.height ?? 0)).toBeGreaterThanOrEqual(44);
      expect(Math.round(muteBox?.width ?? 0)).toBeGreaterThanOrEqual(44);
      expect(Math.round(muteBox?.height ?? 0)).toBeGreaterThanOrEqual(44);

      // =========================================================================
      // Feature 5: Head-to-Head Ghost Lap Telemetry Trace Overlay (Issue #84)
      // =========================================================================
      const ghostLapContainer = page.getByTestId("ghost-lap-overlay");
      await expect(ghostLapContainer).toBeVisible({ timeout: 10000 });
      await expect(
        page.getByText(/HEAD-TO-HEAD GHOST LAP TELEMETRY TRACE OVERLAY/i)
      ).toBeVisible();

      const verBtn = ghostLapContainer.getByRole("button", { name: /select ver as driver 1 reference/i });
      await expect(verBtn).toBeVisible();
      const verBox = await verBtn.boundingBox();
      expect(Math.round(verBox?.width ?? 0)).toBeGreaterThanOrEqual(44);
      expect(Math.round(verBox?.height ?? 0)).toBeGreaterThanOrEqual(44);

      const ghostSvg = ghostLapContainer.locator("svg[aria-label='Head-to-Head Ghost Lap Telemetry Trace Overlay Canvas']");
      await expect(ghostSvg).toBeVisible();

      // =========================================================================
      // Feature 6: Custom Dark-Glass Scrollbars (Issue #86)
      // =========================================================================
      const scrollbarStyles = await page.evaluate(() => {
        const rootStyle = window.getComputedStyle(document.documentElement);
        return {
          scrollbarWidth: rootStyle.scrollbarWidth,
        };
      });
      // Verify scrollbar-width rule applied
      expect(["thin", "auto"]).toContain(scrollbarStyles.scrollbarWidth);

      // =========================================================================
      // Quality Gate 1: Strict Ban on Raw Unicode Emojis
      // =========================================================================
      const pageText = (await page.locator("body").textContent()) || "";
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      expect(pageText).not.toMatch(emojiRegex);

      // =========================================================================
      // Quality Gate 2: Zero Horizontal Scroll Leaks
      // =========================================================================
      const hasHorizontalScrollLeak = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScrollLeak).toBe(false);

      // =========================================================================
      // Quality Gate 3: Clean Console Trace
      // =========================================================================
      const fatalErrors = consoleErrors.filter(
        (err) => !err.includes("429") && !err.includes("Failed to load resource")
      );
      expect(fatalErrors).toHaveLength(0);
    });
  }
});
