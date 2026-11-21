import { test, expect } from "@playwright/test";

test.describe("Real-time 2D Track Car Tracker & Broadcast Sync End-to-End Validation", () => {
  const viewports = [
    { name: "Desktop", width: 1440, height: 900 },
    { name: "Tablet", width: 834, height: 1112 },
    { name: "Mobile", width: 390, height: 844 },
  ];

  const F1_GRID_20 = [
    { code: "VER", num: 1, team: "Red Bull Racing", pos: 1, gap: 0.0, int: 0.0, stint: 2, tyre: "HARD", age: 12 },
    { code: "NOR", num: 4, team: "McLaren", pos: 2, gap: 0.65, int: 0.65, stint: 2, tyre: "MEDIUM", age: 6 },
    { code: "LEC", num: 16, team: "Ferrari", pos: 3, gap: 2.4, int: 1.75, stint: 2, tyre: "HARD", age: 14 },
    { code: "PIA", num: 81, team: "McLaren", pos: 4, gap: 4.1, int: 1.7, stint: 2, tyre: "HARD", age: 15 },
    { code: "SAI", num: 55, team: "Ferrari", pos: 5, gap: 7.2, int: 3.1, stint: 2, tyre: "MEDIUM", age: 10 },
    { code: "HAM", num: 44, team: "Mercedes", pos: 6, gap: 11.0, int: 3.8, stint: 2, tyre: "HARD", age: 16 },
    { code: "RUS", num: 63, team: "Mercedes", pos: 7, gap: 13.5, int: 2.5, stint: 2, tyre: "HARD", age: 16 },
    { code: "PER", num: 11, team: "Red Bull Racing", pos: 8, gap: 18.2, int: 4.7, stint: 2, tyre: "MEDIUM", age: 8 },
    { code: "ALO", num: 14, team: "Aston Martin", pos: 9, gap: 24.0, int: 5.8, stint: 2, tyre: "HARD", age: 20 },
    { code: "STR", num: 18, team: "Aston Martin", pos: 10, gap: 29.5, int: 5.5, stint: 2, tyre: "HARD", age: 18 },
    { code: "ALB", num: 23, team: "Williams", pos: 11, gap: 34.0, int: 4.5, stint: 2, tyre: "MEDIUM", age: 12 },
    { code: "TSU", num: 22, team: "RB", pos: 12, gap: 38.5, int: 4.5, stint: 2, tyre: "HARD", age: 22 },
    { code: "HUL", num: 27, team: "Haas", pos: 13, gap: 42.0, int: 3.5, stint: 2, tyre: "HARD", age: 24 },
    { code: "MAG", num: 20, team: "Haas", pos: 14, gap: 46.2, int: 4.2, stint: 2, tyre: "MEDIUM", age: 11 },
    { code: "RIC", num: 3, team: "RB", pos: 15, gap: 50.0, int: 3.8, stint: 2, tyre: "HARD", age: 19 },
    { code: "GAS", num: 10, team: "Alpine", pos: 16, gap: 54.8, int: 4.8, stint: 2, tyre: "HARD", age: 21 },
    { code: "OCO", num: 31, team: "Alpine", pos: 17, gap: 58.2, int: 3.4, stint: 2, tyre: "MEDIUM", age: 9 },
    { code: "BOT", num: 77, team: "Kick Sauber", pos: 18, gap: 64.0, int: 5.8, stint: 2, tyre: "HARD", age: 25 },
    { code: "ZHO", num: 24, team: "Kick Sauber", pos: 19, gap: 70.1, int: 6.1, stint: 2, tyre: "MEDIUM", age: 13 },
    { code: "SAR", num: 2, team: "Williams", pos: 20, gap: 78.5, int: 8.4, stint: 2, tyre: "HARD", age: 26 },
  ];

  for (const vp of viewports) {
    test(`renders 2D tracker, broadcast sync slider, and zero horizontal leak on ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      // Avoid CoachmarksModal blocking interaction
      await page.addInitScript((driversList) => {
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
              const tickData = {
                session_key: 9158,
                polled_at: new Date().toISOString(),
                delay_seconds: 3,
                stale: false,
                source: "openf1",
                safety_car_status: "NONE",
                leader_lap: 45,
                drivers: driversList.map((d) => ({
                  position: d.pos,
                  driver_number: d.num,
                  driver_code: d.code,
                  team_name: d.team,
                  interval_to_ahead: d.int === 0 ? null : d.int,
                  gap_to_leader: d.gap === 0 ? null : d.gap,
                  last_lap_time: 91.2 + d.pos * 0.1,
                  current_stint: d.stint,
                  tyre_compound: d.tyre,
                  tyre_age: d.age,
                  pit_stops: 1,
                  in_pit: d.pos === 15,
                })),
              };
              const evt = { data: JSON.stringify(tickData) };
              if (this.listeners["tick"]) {
                this.listeners["tick"].forEach((fn) => fn(evt));
              }
              if (this.onmessage) {
                this.onmessage(evt);
              }
            }, 80);
          }

          addEventListener(type: string, fn: EventHandler) {
            this.listeners[type] = this.listeners[type] || [];
            this.listeners[type].push(fn);
          }

          removeEventListener(type: string, fn: EventHandler) {
            if (this.listeners[type]) {
              this.listeners[type] = this.listeners[type].filter((f) => f !== fn);
            }
          }

          close() {}
        }

        // @ts-expect-error Mocking EventSource for tests
        window.EventSource = MockEventSource;
      }, F1_GRID_20);

      // Route live session meta
      await page.route("**/live/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            session_key: 9158,
            session_name: "Race",
            country_name: "Italy",
            circuit_short_name: "Monza",
            year: 2024,
            status: "active",
            date_start: "2024-09-01T13:00:00Z",
          }),
        });
      });

      // Route track map coordinates
      await page.route("**/track-map", async (route) => {
        const points = [];
        for (let i = 0; i <= 100; i++) {
          const angle = (i / 100) * 2 * Math.PI;
          points.push({
            x: 500 + 350 * Math.cos(angle),
            y: 500 + 250 * Math.sin(angle),
            distance: i * 50,
            speed: 250,
            gear: 6,
            throttle: 100,
            brake: 0,
            drs: 0,
          });
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            points,
            compare_points: [],
            corners: [
              { number: 1, x: 850, y: 500 },
              { number: 2, x: 500, y: 750 },
              { number: 3, x: 150, y: 500 },
              { number: 4, x: 500, y: 250 },
            ],
            driver: "VER",
            track_length_m: 5000,
          }),
        });
      });

      // Track browser console errors
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          errors.push(msg.text());
        }
      });

      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("http://localhost:3000/mission-control");

      // 1. Switch to Live Mode tab
      const liveTab = page.getByRole("tab", { name: "live" });
      await expect(liveTab).toBeVisible();

      const liveTabBox = await liveTab.boundingBox();
      expect(liveTabBox?.height).toBeGreaterThanOrEqual(44);

      await liveTab.click();

      // 2. Assert Live timing badge and active session details
      const liveBadge = page.locator("text=LIVE · OpenF1");
      await expect(liveBadge).toBeVisible();

      // 3. Assert Broadcast Delay Sync slider is mounted
      const delayRegion = page.getByRole("region", { name: "Broadcast Delay Synchronization" });
      await expect(delayRegion).toBeVisible();

      // Initial state is Realtime
      await expect(page.locator("text=REALTIME")).toBeVisible();

      // 4. Test Broadcast Delay Preset interaction (-15s button)
      const minus15Btn = page.getByRole("button", { name: "-15s" });
      await expect(minus15Btn).toBeVisible();
      await minus15Btn.click();

      // Assert status badge changed to SYNCED: -15s
      await expect(page.locator("text=SYNCED: -15s")).toBeVisible();

      // 5. Assert Overtake Forecast Gauge is mounted and rendering probability
      const overtakeRegion = page.getByRole("region", { name: "Overtake Probability Forecast" });
      await expect(overtakeRegion).toBeVisible();
      await expect(page.locator("text=Success Chance")).toBeVisible();

      // 6. Assert Mini-Sector Dominance ribbon is mounted
      const miniSectorRegion = page.getByRole("region", { name: "AWS-style Mini-Sector Dominance Map" });
      await expect(miniSectorRegion).toBeVisible();

      // 7. Assert 2D Circuit Track Car Tracker mounts car dots
      const carDots = page.locator(".live-car-dot");
      await expect(carDots.first()).toBeVisible({ timeout: 5000 });
      const dotCount = await carDots.count();
      expect(dotCount).toBeGreaterThanOrEqual(1);

      // 8. Assert Timing ladder renders driver codes
      const table = page.getByRole("table");
      await expect(table.getByText("VER", { exact: true })).toBeVisible();
      await expect(table.getByText("NOR", { exact: true })).toBeVisible();
      await expect(table.getByText("LEC", { exact: true })).toBeVisible();

      // 9. Zero Horizontal Overflow Assertion
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(overflow).toBe(false);

      // 10. Clean console health
      const criticalErrors = errors.filter(
        (e) => !e.includes("net::ERR_") && !e.includes("favicon") && !e.includes("404")
      );
      expect(criticalErrors).toHaveLength(0);
    });
  }
});
