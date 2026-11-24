import { test, expect } from "@playwright/test";

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
      tyre_age_laps: 22,
      s1: { time_s: 27.520, delta_s: 0.100, status: "slower" },
      s2: { time_s: 27.040, delta_s: 0.190, status: "slower" },
      s3: { time_s: 27.080, delta_s: -0.030, status: "session_fastest" },
      lap_time_s: 81.640,
      lap_delta_s: 0.260,
      speed_trap_kmh: 345.1,
    },
  ],
};

test.describe("Multi-Driver Pace Delta Matrix & Real-Time Sector Split E2E Suite", () => {
  const viewports = [
    { name: "Desktop", width: 1440, height: 900 },
    { name: "Tablet", width: 834, height: 1112 },
    { name: "Mobile", width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    test(`renders pace delta matrix, verifies touch targets, and switches reference on ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // Dismiss onboarding coachmarks
      await page.addInitScript(() => {
        localStorage.setItem("apex_coachmarks_seen", "true");
      });

      // Intercept pace delta API
      await page.route("**/*pace-delta*", async (route) => {
        const url = new URL(route.request().url());
        const ref = url.searchParams.get("reference_driver") || "LEC";
        const copy = JSON.parse(JSON.stringify(mockPaceDeltaPayload));
        copy.reference_driver = ref;
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

      // 1. Verify Pace Delta Matrix container renders
      const matrixContainer = page.getByTestId("pace-delta-matrix");
      await expect(matrixContainer).toBeVisible({ timeout: 10000 });

      // 2. Verify Session Bests Banner
      await expect(page.getByText("BEST S1:").first()).toBeVisible();
      await expect(page.getByText("27.380s").first()).toBeVisible();
      await expect(page.getByText("BEST LAP:").first()).toBeVisible();
      await expect(page.getByText("81.380s").first()).toBeVisible();

      // 3. Kiosk Ergonomics: Verify Reference Selector buttons >= 44px
      const refButtons = ["LEC", "VER", "PIA", "NOR", "HAM"];
      for (const code of refButtons) {
        const btn = page.getByRole("button", { name: `Set reference baseline to ${code}` });
        await expect(btn).toBeVisible();
        const box = await btn.boundingBox();
        expect(Math.round(box?.width ?? 0)).toBeGreaterThanOrEqual(44);
        expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44);
      }

      // 4. Verify Drivers Table Data
      const isMobile = vp.width < 640;
      if (isMobile) {
        await expect(matrixContainer.getByText("LEC").first()).toBeVisible();
        await expect(matrixContainer.getByText("PIA").first()).toBeVisible();
        await expect(matrixContainer.getByText("VER").first()).toBeVisible();
      } else {
        await expect(matrixContainer.getByText("Charles Leclerc").first()).toBeVisible();
        await expect(matrixContainer.getByText("Oscar Piastri").first()).toBeVisible();
        await expect(matrixContainer.getByText("Max Verstappen").first()).toBeVisible();
      }

      // 5. Interaction: Switch reference driver to VER
      const verBtn = page.getByRole("button", { name: "Set reference baseline to VER" });
      await verBtn.click();
      await expect(verBtn).toHaveAttribute("aria-pressed", "true");

      // 6. Strict ban on raw unicode emojis
      const containerText = await matrixContainer.innerText();
      const rawEmojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{26A0}\u{26A1}\u{26FD}\u{1F3C1}\u{1F525}]/u;
      expect(containerText.match(rawEmojiRegex)).toBeNull();

      // 7. Verify zero horizontal scroll leak on the page
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
