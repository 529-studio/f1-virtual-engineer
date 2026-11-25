import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "Desktop", width: 1440, height: 900 },
  { name: "Tablet", width: 834, height: 1112 },
  { name: "Mobile", width: 390, height: 844 },
] as const;

test.describe("Issue #94 — Demo Telemetry & Prod UI Regressions", () => {
  for (const vp of VIEWPORTS) {
    test(`verifies demo telemetry hydration, zero UI regressions, and layout integrity on ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      await page.addInitScript(() => {
        localStorage.setItem("apex_coachmarks_seen", "true");
        type EventHandler = (evt: { data: string }) => void;
        class MockEventSource {
          url: string;
          onmessage: EventHandler | null = null;
          onerror: EventHandler | null = null;
          private listeners: Record<string, EventHandler[]> = {};
          constructor(url: string) {
            this.url = url;
            setTimeout(() => {
              const evt = {
                data: JSON.stringify({
                  session_key: 11412,
                  polled_at: new Date().toISOString(),
                  delay_seconds: 3.4,
                  stale: false,
                  source: "replay",
                  safety_car_status: "NONE",
                  leader_lap: 35,
                  drivers: [
                    {
                      position: 1,
                      driver_number: 1,
                      driver_code: "VER",
                      team_name: "Red Bull Racing",
                      interval_to_ahead: 0,
                      gap_to_leader: 0,
                      last_lap_time: 73.412,
                      current_stint: 2,
                      tyre_compound: "HARD",
                      tyre_age: 15,
                      pit_stops: 1,
                      in_pit: false,
                    },
                    {
                      position: 2,
                      driver_number: 4,
                      driver_code: "NOR",
                      team_name: "McLaren",
                      interval_to_ahead: 1.2,
                      gap_to_leader: 1.2,
                      last_lap_time: 73.59,
                      current_stint: 2,
                      tyre_compound: "MEDIUM",
                      tyre_age: 10,
                      pit_stops: 1,
                      in_pit: false,
                    },
                  ],
                }),
              };
              this.listeners["tick"]?.forEach((fn) => fn(evt));
              this.onmessage?.(evt);
            }, 60);
          }
          addEventListener(type: string, fn: EventHandler) {
            this.listeners[type] = this.listeners[type] || [];
            this.listeners[type].push(fn);
          }
          removeEventListener(type: string, fn: EventHandler) {
            this.listeners[type] = (this.listeners[type] || []).filter((f) => f !== fn);
          }
          close() {}
        }
        // @ts-expect-error Mock EventSource
        window.EventSource = MockEventSource;
      });

      // Mock backend API routes cleanly with resilient wildcard patterns
      await page.route(/.*\/events\/2024\/.*\/drivers.*/, (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            year: 2024,
            event: "Italian Grand Prix",
            drivers: ["LEC", "PIA", "NOR", "SAI", "VER", "HAM", "RUS"],
            source_session: "R",
            fallback: false,
            status: "success",
          }),
        })
      );

      await page.route(/.*\/telemetry\/tyre-thermal.*/, (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: "success",
            year: 2024,
            event: "Italian Grand Prix",
            session: "R",
            driver: "LEC",
            lap_number: 15,
            stint_laps: 15,
            wheels: {
              FL: {
                position: "FL",
                compound: "MEDIUM",
                surface_temp: { inner_c: 112.0, center_c: 108.0, outer_c: 104.0 },
                carcass_temp_c: 96.6, // intentionally lower than surfAvg (108.0) -> -11.4°C!
                bulk_temp_c: 102.0,
                thermal_status: "OPTIMAL",
                pressure_status: "OPTIMAL",
                pressure_psi: 24.5,
                camber_deg: -3.5,
                graining_risk: false,
                blistering_risk: false,
                thermal_cliff_risk: false,
                camber_bias_c: 8.0,
              },
              FR: {
                position: "FR",
                compound: "MEDIUM",
                surface_temp: { inner_c: 108.0, center_c: 105.0, outer_c: 102.0 },
                carcass_temp_c: 107.0,
                bulk_temp_c: 106.0,
                thermal_status: "OPTIMAL",
                pressure_status: "OPTIMAL",
                pressure_psi: 24.4,
                camber_deg: -3.5,
                graining_risk: false,
                blistering_risk: false,
                thermal_cliff_risk: false,
                camber_bias_c: 6.0,
              },
              RL: {
                position: "RL",
                compound: "MEDIUM",
                surface_temp: { inner_c: 105.0, center_c: 102.0, outer_c: 100.0 },
                carcass_temp_c: 104.0,
                bulk_temp_c: 103.5,
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
                surface_temp: { inner_c: 104.0, center_c: 101.0, outer_c: 99.0 },
                carcass_temp_c: 103.0,
                bulk_temp_c: 102.5,
                thermal_status: "OPTIMAL",
                pressure_status: "OPTIMAL",
                pressure_psi: 22.7,
                camber_deg: -1.8,
                graining_risk: false,
                blistering_risk: false,
                thermal_cliff_risk: false,
                camber_bias_c: 5.0,
              },
            },
            critical_alerts: [],
          }),
        })
      );

      await page.route(/.*\/telemetry\/tyre-degradation.*/, (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: "success",
            driver: "LEC",
            compound: "HARD",
            current_stint_laps: 18,
            current_time_loss_s: 0.65,
            projected_cliff_lap: 38,
            laps_until_cliff: 20,
            pit_window_start_lap: 14,
            pit_window_end_lap: 18,
            undercut_gain_estimate_s: 1.4,
            overcut_viable: true,
            trajectory: [
              { lap: 1, time_loss_s: 0.0 },
              { lap: 18, time_loss_s: 0.65 },
              { lap: 38, time_loss_s: 2.4 },
            ],
          }),
        })
      );

      let trackMapPayload: Record<string, unknown> | null = null;
      await page.route(/.*\/live\/session.*/, (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            session_key: 11412,
            meeting_key: 1250,
            circuit_key: 14,
            circuit_short_name: "Interlagos",
            country_name: "Brazil",
            session_name: "Race",
            session_type: "Race",
            date_start: "2026-11-08T17:00:00+00:00",
            date_end: "2026-11-08T19:00:00+00:00",
            is_live: true,
            source: "replay",
          }),
        })
      );

      await page.route(/.*\/track-map.*/, async (route) => {
        trackMapPayload = route.request().postDataJSON();
        const points = Array.from({ length: 40 }, (_, i) => {
          const a = (i / 40) * Math.PI * 2;
          return {
            x: 500 + 300 * Math.cos(a),
            y: 500 + 200 * Math.sin(a),
            distance: i * 100,
            speed: 240,
            gear: 6,
            brake: false,
            throttle: 90,
            drs: 0,
          };
        });
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            year: 2024,
            event: "São Paulo Grand Prix",
            session_type: "R",
            driver: "VER",
            lap_number: 10,
            points,
            compare_driver: null,
            compare_points: [],
            corners: [{ number: 1, letter: "", x: 800, y: 500, angle: 0, distance: 100 }],
            circuit_rotation: 0,
            track_length_m: 4309,
            fallback: false,
            fallback_reason: null,
            source: "fastf1",
          }),
        });
      });

      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      await page.goto("/mission-control");

      // 1. Mobile compact SelectorBar check
      if (vp.width < 640) {
        const expandFiltersBtn = page.getByRole("button", { name: /session selectors/i });
        await expect(expandFiltersBtn).toBeVisible();
        const box = await expandFiltersBtn.boundingBox();
        expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44);
        // Should be compact (~44-60px tall instead of ~580px)
        expect(box?.height ?? 999).toBeLessThan(80);
      }

      // 2. Verify Strategy view copy fixes (zero literal LaTeX, zero +- sign bug)
      await expect(page.getByText("-11.4°C")).toBeVisible({ timeout: 10000 });
      await expect(page.locator("text=+-")).toHaveCount(0);
      await expect(page.locator("text=$\\Delta t$")).toHaveCount(0);
      await expect(page.getByText(/Stint Pace Decay Curve \(Delta Time\)/i)).toBeVisible();
      await expect(page.getByText(/Lap 15 · Synchronized/i)).toBeVisible();

      // 3. MissionBoard collapsed ribbon: no Extend overlap
      const expandBoardBtn = page.getByRole("button", { name: "Expand Mission Board" });
      await expect(expandBoardBtn).toBeVisible();
      const expandBox = await expandBoardBtn.boundingBox();
      expect(Math.round(expandBox?.height ?? 0)).toBeGreaterThanOrEqual(44);

      // 4. Open HUD -> RADIO tab -> verify subtitle & 1.5x speed button doesn't clip
      if (vp.width < 1280) {
        const hudTrigger = page.getByRole("button", { name: /Strategy HUD/i }).first();
        await hudTrigger.click();
      }
      const radioTab = page.locator("aside").getByRole("button", { name: /^RADIO$/i }).first();
      await expect(radioTab).toBeVisible();
      await radioTab.click();
      await expect(page.locator("text=Singapore GP 2023")).toHaveCount(0);
      const speed15Btn = page.getByRole("button", { name: "Playback speed 1.5x" });
      await expect(speed15Btn).toBeVisible();
      const speed15Box = await speed15Btn.boundingBox();
      const asideBox = await page.locator("aside").boundingBox();
      expect(speed15Box!.x + speed15Box!.width).toBeLessThanOrEqual(asideBox!.x + asideBox!.width + 1);

      if (vp.width < 1280) {
        await page.getByRole("button", { name: "Close Strategy HUD" }).click();
      }

      // 5. Switch to Telemetry tab -> demo-race.json MUST hydrate telemetry traces (NO "no data")
      const telTab = page.getByRole("tab", { name: "telemetry" });
      await telTab.click();
      await expect(page.getByText("200 samples")).toBeVisible({ timeout: 5000 });
      await expect(page.locator("text=no data")).toHaveCount(0);

      // 6. Switch to Live tab -> verify track-map receives normalized São Paulo Grand Prix & 2024 + table headers visible
      const liveTab = page.getByRole("tab", { name: "live" });
      await liveTab.click();
      await expect.poll(() => trackMapPayload, { timeout: 5000 }).not.toBeNull();
      expect(trackMapPayload).toMatchObject({
        year: 2024,
        event: "São Paulo Grand Prix",
        session_type: "R",
      });
      await expect(page.getByRole("columnheader", { name: "Tyre" })).toBeVisible();
      const pitHeader = page.getByRole("columnheader", { name: "Pit" });
      await expect(pitHeader).toBeVisible();
      if (vp.width >= 1024) {
        const scrollInfo = await page.getByTestId("live-timing-scroll").evaluate((el) => ({
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
        }));
        expect(scrollInfo.scrollWidth).toBeLessThanOrEqual(scrollInfo.clientWidth + 1);
      }

      // 7. Zero horizontal overflow at document root
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(overflow).toBe(false);

      // 8. Clean console (ignoring expected local FastF1/API failures on unmocked secondary cards)
      const fatalErrors = consoleErrors.filter(
        (err) =>
          !err.includes("Failed to load resource") &&
          !err.includes("favicon") &&
          !err.includes("429")
      );
      expect(fatalErrors).toHaveLength(0);
    });
  }
});
