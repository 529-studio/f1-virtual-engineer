import { test, expect } from "@playwright/test";

const mockWeatherRadar = {
  status: "success",
  year: 2024,
  event: "British Grand Prix",
  session_type: "Race",
  current_metrics: {
    minute: 24.5,
    lap_estimate: 17,
    rainfall: true,
    rainfall_intensity: 0.78,
    air_temp_c: 15.8,
    track_temp_c: 26.5,
    humidity_pct: 72.0,
    wind_speed_kmh: 14.4,
    wind_direction_deg: 242.0,
    track_grip_pct: 81.4,
    recommended_compound: "INTERMEDIATE",
    water_film_mm: 1.25,
  },
  crossover: {
    current_compound: "SLICK",
    recommended_compound: "INTERMEDIATE",
    crossover_status: "CRITICAL",
    crossover_lap: 19,
    crossover_in_minutes: 2.5,
    grip_pct: 81.4,
    water_film_mm: 1.25,
    pit_call: "BOX IN 2 LAPS FOR INTERS — TRACK GRIP DECAYING TO 81.4%",
  },
  radar_frames: [
    {
      time_offset_min: 0,
      cells: [
        { x: -2.5, y: 1.8, intensity_dbz: 44.0, rain_rate_mmh: 6.5, radius_km: 3.5 },
        { x: 3.2, y: -2.0, intensity_dbz: 36.0, rain_rate_mmh: 3.8, radius_km: 2.8 },
      ],
      track_impact: true,
      projected_grip_pct: 81.4,
    },
    {
      time_offset_min: 5,
      cells: [
        { x: -1.2, y: 2.5, intensity_dbz: 46.0, rain_rate_mmh: 7.2, radius_km: 3.6 },
        { x: 4.5, y: -1.2, intensity_dbz: 38.0, rain_rate_mmh: 4.2, radius_km: 3.0 },
      ],
      track_impact: true,
      projected_grip_pct: 76.5,
    },
    {
      time_offset_min: 10,
      cells: [
        { x: 0.2, y: 3.2, intensity_dbz: 48.0, rain_rate_mmh: 8.0, radius_km: 3.8 },
      ],
      track_impact: true,
      projected_grip_pct: 71.0,
    },
    {
      time_offset_min: 15,
      cells: [
        { x: 1.5, y: 4.0, intensity_dbz: 42.0, rain_rate_mmh: 5.5, radius_km: 3.5 },
      ],
      track_impact: false,
      projected_grip_pct: 68.0,
    },
    {
      time_offset_min: 20,
      cells: [
        { x: 3.0, y: 4.8, intensity_dbz: 35.0, rain_rate_mmh: 3.2, radius_km: 3.0 },
      ],
      track_impact: false,
      projected_grip_pct: 66.5,
    },
  ],
  timeline: [
    {
      minute: 24.5,
      lap_estimate: 17,
      rainfall: true,
      rainfall_intensity: 0.78,
      air_temp_c: 15.8,
      track_temp_c: 26.5,
      humidity_pct: 72.0,
      wind_speed_kmh: 14.4,
      wind_direction_deg: 242.0,
      track_grip_pct: 81.4,
      recommended_compound: "INTERMEDIATE",
      water_film_mm: 1.25,
    },
  ],
  wind_vector: {
    speed_kmh: 14.4,
    direction_deg: 242.0,
    dx: -12.7,
    dy: 6.8,
  },
  fallback: false,
  fallback_reason: null,
};

test.describe("Weather Radar & Compound Cross-Over Predictor (Issue #76)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("apex_coachmarks_seen", "true");
    });

    // Mock weather radar route
    await page.route("**/weather/radar*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockWeatherRadar),
      });
    });
  });

  test("renders Doppler radar, scrubber controls, and zero horizontal leak on Desktop (1440x900)", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/mission-control", { waitUntil: "networkidle" });

    // Ensure Strategy mode is active
    const stratTab = page.getByRole("tab", { name: /strategy/i });
    if (await stratTab.isVisible()) {
      await stratTab.click();
    }

    const panel = page.getByTestId("weather-radar-panel");
    await panel.scrollIntoViewIfNeeded();
    await expect(panel).toBeVisible();

    // Verify Doppler Radar Canvas & Track Impact Banner
    const canvas = page.getByTestId("weather-radar-canvas");
    await expect(canvas).toBeVisible();
    await expect(page.getByTestId("track-impact-banner")).toBeVisible();

    // Verify Strategic Pit Call
    const pitBanner = page.getByTestId("pit-call-banner");
    await expect(pitBanner).toBeVisible();
    await expect(pitBanner).toContainText("BOX IN 2 LAPS FOR INTERS");

    // Verify Scrubber Interaction: Click +10m step
    const step10 = page.getByTestId("forecast-step-10");
    await expect(step10).toBeVisible();
    await step10.click();
    await expect(step10).toHaveAttribute("aria-pressed", "true");

    // Toggle Play/Pause
    const playPauseBtn = page.getByTestId("radar-play-pause-btn");
    await playPauseBtn.click();
    await page.waitForTimeout(500);

    // Verify zero horizontal scroll leak
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasOverflow).toBe(false);

    // Verify zero raw emojis
    const bodyText = await page.evaluate(() => document.body.innerText);
    const emojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{26A0}\u{26A1}\u{26FD}\u{1F3C1}\u{1F525}]/u;
    expect(bodyText).not.toMatch(emojiRegex);

    // Verify clean console (no fatal JS/React errors)
    const fatalErrors = consoleErrors.filter(
      (err) =>
        !err.includes("favicon") &&
        !err.includes("FastF1") &&
        !err.includes("Failed to load resource")
    );
    expect(fatalErrors).toEqual([]);
  });

  test("renders radar controls with compliant kiosk touch targets on Tablet (834x1112)", async ({ page }) => {
    await page.setViewportSize({ width: 834, height: 1112 });
    await page.goto("/mission-control", { waitUntil: "networkidle" });

    const panel = page.getByTestId("weather-radar-panel");
    await panel.scrollIntoViewIfNeeded();
    await expect(panel).toBeVisible();

    // Verify all forecast scrubber buttons have height >= 44px
    for (const offset of [0, 5, 10, 15, 20]) {
      const btn = page.getByTestId(`forecast-step-${offset}`);
      const box = await btn.boundingBox();
      expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44);
    }

    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasOverflow).toBe(false);
  });

  test("renders radar controls and zero horizontal leak on Mobile (390x844)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/mission-control", { waitUntil: "networkidle" });

    const panel = page.getByTestId("weather-radar-panel");
    await panel.scrollIntoViewIfNeeded();
    await expect(panel).toBeVisible();

    // Verify play button touch target
    const playBtn = page.getByTestId("radar-play-pause-btn");
    const playBox = await playBtn.boundingBox();
    expect(Math.round(playBox?.height ?? 0)).toBeGreaterThanOrEqual(44);
    expect(Math.round(playBox?.width ?? 0)).toBeGreaterThanOrEqual(44);

    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasOverflow).toBe(false);
  });
});
