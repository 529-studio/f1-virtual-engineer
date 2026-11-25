import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "Desktop", width: 1440, height: 900 },
  { name: "Tablet", width: 834, height: 1112 },
  { name: "Mobile", width: 390, height: 844 },
] as const;

function buildMockProfile(mode: "session_relative" | "historic_benchmark") {
  const shift = mode === "historic_benchmark" ? -4.5 : 0;
  return {
    status: "success",
    year: 2024,
    event: "Italian Grand Prix",
    session: "R",
    mode,
    fallback: false,
    fallback_reason: null,
    source: "fastf1",
    primary: {
      driver_code: "LEC",
      team_name: "Ferrari",
      team_color: "#E80020",
      overall_score: 88.2 + shift,
      axes: [
        { key: "braking", label: "Braking", score: 91.0 + shift, raw_value: "5.3G peak", benchmark_value: mode === "historic_benchmark" ? "5.4G F1 peak" : "Session P95" },
        { key: "cornering", label: "Cornering", score: 86.5 + shift, raw_value: "126 km/h", benchmark_value: "Field apex" },
        { key: "throttle_pickup", label: "Throttle Pick-Up", score: 89.0 + shift, raw_value: "74% WOT", benchmark_value: "Session WOT" },
        { key: "tyre_management", label: "Tyre Management", score: 92.4 + shift, raw_value: "0.05s/L", benchmark_value: "Field deg avg" },
        { key: "top_speed", label: "Top Speed", score: 84.0 + shift, raw_value: "344 km/h", benchmark_value: "348 km/h max" },
        { key: "consistency", label: "Consistency", score: 86.3 + shift, raw_value: "0.21s SD", benchmark_value: "Session IQR" },
      ],
    },
    compare: {
      driver_code: "PIA",
      team_name: "McLaren",
      team_color: "#FF8000",
      overall_score: 84.9 + shift,
      axes: [
        { key: "braking", label: "Braking", score: 87.0 + shift, raw_value: "5.0G peak", benchmark_value: "Session P95" },
        { key: "cornering", label: "Cornering", score: 88.0 + shift, raw_value: "128 km/h", benchmark_value: "Field apex" },
        { key: "throttle_pickup", label: "Throttle Pick-Up", score: 85.0 + shift, raw_value: "71% WOT", benchmark_value: "Session WOT" },
        { key: "tyre_management", label: "Tyre Management", score: 83.2 + shift, raw_value: "0.08s/L", benchmark_value: "Field deg avg" },
        { key: "top_speed", label: "Top Speed", score: 82.0 + shift, raw_value: "339 km/h", benchmark_value: "348 km/h max" },
        { key: "consistency", label: "Consistency", score: 84.2 + shift, raw_value: "0.26s SD", benchmark_value: "Session IQR" },
      ],
    },
  };
}

test.describe("Issue #95 — Driver Telemetry 6-Axis Performance Radar", () => {
  for (const vp of VIEWPORTS) {
    test(`renders hexagonal radar, toggles normalization mode, handles retry, and passes layout checks on ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.addInitScript(() => {
        localStorage.setItem("apex_coachmarks_seen", "true");
      });

      let failNext = true;
      await page.route(/.*driver-performance.*/, async (route) => {
        if (failNext) {
          failNext = false;
          await route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ detail: "Temporary telemetry stall" }),
          });
          return;
        }
        const url = new URL(route.request().url());
        const mode = url.searchParams.get("mode") === "historic_benchmark"
          ? "historic_benchmark"
          : "session_relative";
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(buildMockProfile(mode)),
        });
      });

      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });

      await page.goto("/mission-control");

      // 1. Error state renders cleanly with >=44px Retry CTA
      const retryBtn = page.getByRole("button", { name: /Retry Performance Radar/i });
      await expect(retryBtn).toBeVisible({ timeout: 10000 });
      const retryBox = await retryBtn.boundingBox();
      expect(Math.round(retryBox?.height ?? 0)).toBeGreaterThanOrEqual(44);
      await retryBtn.click();

      // 2. Radar chart mounts with SVG polygons & all 6 axis labels
      const section = page.getByTestId("driver-radar-chart");
      await expect(section).toBeVisible({ timeout: 10000 });

      const svg = section.locator("svg[role='img']");
      await expect(svg).toBeVisible();
      for (const label of ["Braking", "Cornering", "Throttle Pick-Up", "Tyre Management", "Top Speed", "Consistency"]) {
        await expect(svg.getByText(label)).toBeVisible();
      }

      // 3. Mode toggle updates scores & passes >=44px touch targets
      const relBtn = page.getByRole("button", { name: "Session-Relative" });
      const histBtn = page.getByRole("button", { name: "Historic Benchmark" });
      expect(Math.round((await relBtn.boundingBox())?.height ?? 0)).toBeGreaterThanOrEqual(44);
      expect(Math.round((await histBtn.boundingBox())?.height ?? 0)).toBeGreaterThanOrEqual(44);

      await expect(section.getByText("LEC (88.2)")).toBeVisible();
      await histBtn.click();
      await expect(section.getByText("LEC (83.7)")).toBeVisible({ timeout: 5000 });

      // 4. Zero horizontal overflow & no console errors
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(overflow).toBe(false);

      const fatal = errors.filter(
        (e) => !e.includes("Failed to load resource") && !e.includes("favicon") && !e.includes("503")
      );
      expect(fatal).toHaveLength(0);
    });
  }
});
