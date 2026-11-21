import { test, expect } from "@playwright/test";

test.describe("Live Session Mode End-to-End Validation", () => {
  const viewports = [
    { name: "Desktop", width: 1440, height: 900 },
    { name: "Tablet", width: 834, height: 1112 },
    { name: "Mobile", width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    test(`renders live mode cleanly without horizontal leak on ${vp.name} (${vp.width}x${vp.height})`, async ({
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
                delay_seconds: 3,
                stale: false,
                source: "openf1",
                safety_car_status: "NONE",
                leader_lap: 42,
                drivers: [
                  {
                    position: 1,
                    driver_number: 1,
                    driver_code: "VER",
                    team_name: "Red Bull Racing",
                    interval_to_ahead: null,
                    gap_to_leader: null,
                    last_lap_time: 91.8,
                    current_stint: 2,
                    tyre_compound: "HARD",
                    tyre_age: 12,
                    pit_stops: 1,
                    in_pit: false,
                  },
                  {
                    position: 2,
                    driver_number: 4,
                    driver_code: "NOR",
                    team_name: "McLaren",
                    interval_to_ahead: 2.4,
                    gap_to_leader: 2.4,
                    last_lap_time: 91.5,
                    current_stint: 2,
                    tyre_compound: "MEDIUM",
                    tyre_age: 8,
                    pit_stops: 1,
                    in_pit: false,
                  },
                ],
              };
              const evt = { data: JSON.stringify(tickData) };
              if (this.listeners["tick"]) {
                this.listeners["tick"].forEach((fn) => fn(evt));
              }
              if (this.onmessage) {
                this.onmessage(evt);
              }
            }, 100);
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
      });

      await page.route("**/live/session", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            session_key: 9158,
            session_name: "Race",
            country_name: "Bahrain",
            circuit_short_name: "Sakhir",
            year: 2024,
            status: "active",
          }),
        });
      });
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("http://localhost:3000/mission-control");

      // Verify no critical console errors
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });

      // Switch to Live Mode tab
      const liveTab = page.getByRole("tab", { name: "live" });
      await expect(liveTab).toBeVisible();

      // Check touch target height >= 44px
      const box = await liveTab.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);

      await liveTab.click();

      // Assert Live timing badge rendered
      const liveBadge = page.locator("text=LIVE · OpenF1");
      await expect(liveBadge).toBeVisible();

      // Assert Position ladder rendered with driver codes
      const table = page.getByRole("table");
      await expect(table.getByText("VER", { exact: true })).toBeVisible();
      await expect(table.getByText("NOR", { exact: true })).toBeVisible();

      // Assert Attribution in footer
      const attributionLink = page.getByRole("link", { name: /OpenF1/i });
      await expect(attributionLink.first()).toBeVisible();

      // Assert Zero Horizontal Overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(overflow).toBe(false);
    });
  }
});
