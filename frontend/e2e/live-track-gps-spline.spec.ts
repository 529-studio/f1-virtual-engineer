import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "Desktop", width: 1440, height: 900 },
  { name: "Tablet", width: 834, height: 1112 },
  { name: "Mobile", width: 390, height: 844 },
];

test.describe("LiveTrackGpsSpline 60fps Minimap E2E", () => {
  for (const vp of VIEWPORTS) {
    test(`renders 60fps GPS spline minimap and interactive car focus on ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
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
              const tickData = {
                session_key: 9158,
                polled_at: new Date().toISOString(),
                delay_seconds: 0,
                stale: false,
                source: "openf1",
                safety_car_status: "NONE",
                leader_lap: 38,
                drivers: [
                  {
                    position: 1,
                    driver_number: 1,
                    driver_code: "VER",
                    team_name: "Red Bull Racing",
                    interval_to_ahead: null,
                    gap_to_leader: null,
                    last_lap_time: 72.4,
                    current_stint: 2,
                    tyre_compound: "HARD",
                    tyre_age: 14,
                    pit_stops: 1,
                    in_pit: false,
                  },
                  {
                    position: 2,
                    driver_number: 16,
                    driver_code: "LEC",
                    team_name: "Ferrari",
                    interval_to_ahead: 1.15,
                    gap_to_leader: 1.15,
                    last_lap_time: 72.1,
                    current_stint: 2,
                    tyre_compound: "MEDIUM",
                    tyre_age: 9,
                    pit_stops: 1,
                    in_pit: false,
                  },
                  {
                    position: 3,
                    driver_number: 4,
                    driver_code: "NOR",
                    team_name: "McLaren",
                    interval_to_ahead: 0.85,
                    gap_to_leader: 2.0,
                    last_lap_time: 72.0,
                    current_stint: 2,
                    tyre_compound: "SOFT",
                    tyre_age: 5,
                    pit_stops: 1,
                    in_pit: true,
                  },
                ],
              };
              const evt = { data: JSON.stringify(tickData) };
              this.listeners["tick"]?.forEach((fn) => fn(evt));
              this.onmessage?.(evt);
            }, 60);
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
        // @ts-expect-error Mocking EventSource for E2E
        window.EventSource = MockEventSource;
      });

      await page.route(/.*\/live\/session.*/, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            session_key: 9158,
            session_name: "Race",
            country_name: "Brazil",
            circuit_short_name: "Interlagos",
            year: 2024,
            status: "active",
            date_start: "2024-11-03T15:30:00Z",
            source: "openf1",
          }),
        });
      });

      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });

      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/mission-control");

      const liveTab = page.getByRole("tab", { name: "live" });
      await expect(liveTab).toBeVisible();
      await liveTab.click();

      const minimap = page.getByTestId("live-track-gps-spline");
      await expect(minimap).toBeVisible({ timeout: 5000 });
      await expect(page.locator("text=Loading track map")).toHaveCount(0);
      await expect(minimap.getByText("Interlagos")).toBeVisible();

      const carDots = minimap.locator(".live-car-dot");
      await expect(carDots).toHaveCount(3);

      // Click P2 LEC focus chip & verify popover + >= 44px touch target
      const lecBtn = minimap.getByRole("button", { name: /P2\s*LEC/i });
      const lecBox = await lecBtn.boundingBox();
      expect(Math.round(lecBox?.height ?? 0)).toBeGreaterThanOrEqual(44);
      await lecBtn.click();

      const popover = page.getByTestId("live-track-driver-popover");
      await expect(popover).toBeVisible();
      await expect(popover.getByText(/P2 LEC/)).toBeVisible();

      const closeBtn = popover.getByRole("button", { name: /Close driver telemetry popover/i });
      const closeBox = await closeBtn.boundingBox();
      expect(Math.round(closeBox?.height ?? 0)).toBeGreaterThanOrEqual(44);
      await closeBtn.click();
      await expect(popover).toBeHidden();

      // Zero horizontal scroll leak
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(overflow).toBe(false);

      // Zero unicode emojis
      const hasEmoji = await page.evaluate(() =>
        /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(document.body.innerText)
      );
      expect(hasEmoji).toBe(false);

      const criticalErrors = errors.filter(
        (e) => !e.includes("net::ERR_") && !e.includes("favicon") && !e.includes("404")
      );
      expect(criticalErrors).toHaveLength(0);
    });
  }
});
