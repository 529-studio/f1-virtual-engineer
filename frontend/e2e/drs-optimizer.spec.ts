import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "Desktop", width: 1440, height: 900 },
  { name: "Tablet", width: 834, height: 1112 },
  { name: "Mobile", width: 390, height: 844 },
] as const;

function buildMockDrs(wingTrim: string, dragLevel: number) {
  const shift = (50 - dragLevel) * 0.25;
  return {
    status: "success",
    year: 2024,
    event: "Italian Grand Prix",
    session: "R",
    driver: "LEC",
    compare_driver: "PIA",
    wing_trim: wingTrim,
    drag_level: dragLevel,
    aero_efficiency_index: 91.5,
    avg_drs_gain_kmh: 17.8,
    total_lap_gain_s: 0.442,
    speed_trap_primary_kmh: Number((344.0 + shift).toFixed(1)),
    speed_trap_compare_kmh: Number((339.2 + shift * 0.8).toFixed(1)),
    recommended_trim: "LOW_DRAG",
    recommendation_reason: "Italian Grand Prix rewards low drag trim on long Monza straights.",
    fallback: false,
    fallback_reason: null,
    source: "fastf1",
    zones: [
      {
        zone_id: "DRS1",
        zone_name: "Rettilineo Box",
        distance_range_m: "5200m - 650m",
        drs_closed_speed_kmh: Number((324.0 + shift).toFixed(1)),
        drs_open_speed_kmh: Number((342.5 + shift).toFixed(1)),
        speed_delta_kmh: 18.5,
        time_gain_s: 0.245,
        activation_rate_pct: 88.0,
      },
      {
        zone_id: "DRS2",
        zone_name: "Curva Grande -> Roggia",
        distance_range_m: "1480m - 2420m",
        drs_closed_speed_kmh: Number((318.0 + shift).toFixed(1)),
        drs_open_speed_kmh: Number((335.1 + shift).toFixed(1)),
        speed_delta_kmh: 17.1,
        time_gain_s: 0.197,
        activation_rate_pct: 84.5,
      },
    ],
  };
}

test.describe("Issue #96 — DRS Zone Efficiency & Top Speed Trap Optimizer", () => {
  for (const vp of VIEWPORTS) {
    test(`renders DRS optimizer, switches wing trims, verifies >=44px targets & zero overflow on ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.addInitScript(() => {
        localStorage.setItem("apex_coachmarks_seen", "true");
      });

      let failFirst = true;
      await page.route(/.*drs-efficiency.*/, async (route) => {
        if (failFirst) {
          failFirst = false;
          await route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ detail: "Aero cache warming" }),
          });
          return;
        }
        const url = new URL(route.request().url());
        const trim = url.searchParams.get("wing_trim") || "BALANCED";
        const drag = Number(url.searchParams.get("drag_level") || "50");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(buildMockDrs(trim, drag)),
        });
      });

      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });

      await page.goto("/mission-control");

      const retryBtn = page.getByRole("button", { name: /Retry Aero Model/i });
      await expect(retryBtn).toBeVisible({ timeout: 10000 });
      expect(Math.round((await retryBtn.boundingBox())?.height ?? 0)).toBeGreaterThanOrEqual(44);
      await retryBtn.click();

      const card = page.getByTestId("drs-optimizer-card");
      await expect(card).toBeVisible({ timeout: 10000 });
      await expect(card.getByText("344.0 km/h")).toBeVisible();

      const lowDragBtn = card.getByRole("button", { name: "LOW DRAG" });
      const balancedBtn = card.getByRole("button", { name: "BALANCED" });
      const highDfBtn = card.getByRole("button", { name: "HIGH DF" });
      for (const btn of [lowDragBtn, balancedBtn, highDfBtn]) {
        expect(Math.round((await btn.boundingBox())?.height ?? 0)).toBeGreaterThanOrEqual(44);
      }

      await lowDragBtn.click();
      await expect(card.getByText("351.5 km/h")).toBeVisible({ timeout: 5000 });

      const slider = card.getByRole("slider", { name: "Rear wing drag level slider" });
      await expect(slider).toBeVisible();

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
