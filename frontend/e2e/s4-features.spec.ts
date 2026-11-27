import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "Desktop", width: 1440, height: 900 },
  { name: "Tablet", width: 834, height: 1112 },
  { name: "Mobile", width: 390, height: 844 },
] as const;

const MOCK_RADAR = {
  status: "success",
  year: 2024,
  event: "Italian Grand Prix",
  session: "R",
  mode: "session_relative",
  fallback: false,
  fallback_reason: null,
  source: "fastf1",
  primary: {
    driver_code: "LEC",
    team_name: "Ferrari",
    team_color: "#E80020",
    overall_score: 88.2,
    axes: [
      { key: "braking", label: "Braking", score: 91.0, raw_value: "5.3G peak", benchmark_value: "Session P95" },
      { key: "cornering", label: "Cornering", score: 86.5, raw_value: "126 km/h", benchmark_value: "Field apex" },
      { key: "throttle_pickup", label: "Throttle Pick-Up", score: 89.0, raw_value: "74% WOT", benchmark_value: "Session WOT" },
      { key: "tyre_management", label: "Tyre Management", score: 92.4, raw_value: "0.05s/L", benchmark_value: "Field deg avg" },
      { key: "top_speed", label: "Top Speed", score: 84.0, raw_value: "344 km/h", benchmark_value: "348 km/h max" },
      { key: "consistency", label: "Consistency", score: 86.3, raw_value: "0.21s SD", benchmark_value: "Session IQR" },
    ],
  },
  compare: null,
};

const MOCK_DRS = {
  status: "success",
  year: 2024,
  event: "Italian Grand Prix",
  session: "R",
  driver: "LEC",
  compare_driver: null,
  wing_trim: "BALANCED",
  drag_level: 50,
  aero_efficiency_index: 91.5,
  avg_drs_gain_kmh: 17.8,
  total_lap_gain_s: 0.442,
  speed_trap_primary_kmh: 344.0,
  speed_trap_compare_kmh: null,
  recommended_trim: "LOW_DRAG",
  recommendation_reason: "Monza rewards low drag trim on long straights.",
  fallback: false,
  fallback_reason: null,
  source: "fastf1",
  zones: [
    {
      zone_id: "DRS1",
      zone_name: "Rettilineo Box",
      distance_range_m: "5200m - 650m",
      drs_closed_speed_kmh: 324.0,
      drs_open_speed_kmh: 342.5,
      speed_delta_kmh: 18.5,
      time_gain_s: 0.245,
      activation_rate_pct: 88.0,
    },
  ],
};

const MOCK_RC_FEED = {
  status: "success",
  year: 2023,
  event: "Singapore Grand Prix",
  session: "Race",
  total_incidents: 1,
  items: [
    {
      id: "rc-2023-sin-05",
      lap: 54,
      timestamp_str: "13:28:44",
      category: "COLLISION",
      status: "UNDER_INVESTIGATION",
      drivers_involved: ["PER", "ALB"],
      flag: "YELLOW",
      message: "INCIDENT INVOLVING CAR 11 (PER) AND CAR 23 (ALB) AT TURN 13",
      description: "Late braking maneuver resulting in Turn 13 collision.",
    },
  ],
};

const MOCK_INVESTIGATION = {
  status: "success",
  incident_id: "rc-2023-sin-05",
  category: "COLLISION",
  drivers_involved: ["PER", "ALB"],
  regulation_article: "Article 33.4",
  regulation_title: "Causing an Avoidable Collision",
  regulation_snippet: "Maneuvers liable to hinder other drivers are strictly prohibited.",
  team_defense_argument: "Car 11 held the inside apex.",
  steward_prosecution_argument: "Car 11 understeered into Car 23.",
  predicted_verdict: "TIME_PENALTY_5S",
  confidence_pct: 92,
  penalty_breakdown: [
    { penalty: "TIME_PENALTY_5S", probability_pct: 70, description: "Standard collision penalty." },
  ],
};

const MOCK_KNOWLEDGE_LOOKUP = {
  status: "success",
  query: "Article 33.4 moving under braking",
  citations: [
    {
      id: "reg-sporting-overtaking",
      title: "FIA Sporting Regulations — Overtaking & Moving Under Braking",
      source: "FIA Formula 1 Sporting Regulations",
      section: "Article 33.4",
      topics: ["overtaking"],
      snippet: "No car may be driven in a manner that could endanger another driver.",
      score: 112.4,
      article: "33.4",
      clause: "33.4",
      season: 2024,
      verbatim: true,
    },
  ],
};

const MOCK_KNOWLEDGE_NOTE = {
  status: "success",
  note: {
    id: "reg-sporting-overtaking",
    title: "FIA Sporting Regulations — Overtaking & Moving Under Braking",
    source: "FIA Formula 1 Sporting Regulations",
    section: "Article 33.4",
    topics: ["overtaking"],
    body: "Article 33.4: More than one change of direction to defend a position is not permitted.",
    article: "33.4",
    clause: "33.4",
    season: 2024,
    verbatim: true,
  },
};

test.describe("Sprint 4 Consolidated Multi-Viewport E2E Suite (#100)", () => {
  for (const vp of VIEWPORTS) {
    test(`verifies all Sprint 4 features, formatting, kiosk touch targets & layout on ${vp.name} (${vp.width}x${vp.height})`, async ({
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

      await page.route(/.*driver-performance.*/, async (route) => {
        await route.fulfill({ status: 200, contentType: "application/json", json: MOCK_RADAR });
      });
      await page.route(/.*drs-efficiency.*/, async (route) => {
        await route.fulfill({ status: 200, contentType: "application/json", json: MOCK_DRS });
      });
      await page.route(/.*\/live\/session.*/, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          json: {
            session_key: 9158,
            session_name: "Race",
            country_name: "Brazil",
            circuit_short_name: "Interlagos",
            year: 2024,
            status: "active",
            date_start: "2024-11-03T15:30:00Z",
            source: "openf1",
          },
        });
      });
      await page.route(/.*\/race-control\/feed.*/, async (route) => {
        await route.fulfill({ status: 200, contentType: "application/json", json: MOCK_RC_FEED });
      });
      await page.route(/.*\/race-control\/investigate.*/, async (route) => {
        await route.fulfill({ status: 200, contentType: "application/json", json: MOCK_INVESTIGATION });
      });
      await page.route(/.*\/knowledge\/lookup.*/, async (route) => {
        await route.fulfill({ status: 200, contentType: "application/json", json: MOCK_KNOWLEDGE_LOOKUP });
      });
      await page.route(/.*\/knowledge\/note\/.*/, async (route) => {
        await route.fulfill({ status: 200, contentType: "application/json", json: MOCK_KNOWLEDGE_NOTE });
      });

      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("pageerror", (err) => {
        consoleErrors.push(err.message);
      });

      await page.goto("/mission-control");

      // 1. DriverRadarChart (#95) & DrsOptimizerCard (#96)
      const radar = page.getByTestId("driver-radar-chart");
      await expect(radar).toBeAttached({ timeout: 10000 });
      await radar.scrollIntoViewIfNeeded();
      await expect(radar).toBeVisible();

      const drs = page.getByTestId("drs-optimizer-card");
      await expect(drs).toBeAttached({ timeout: 10000 });
      await drs.scrollIntoViewIfNeeded();
      await expect(drs).toBeVisible();
      await expect(drs.getByText("344.0 km/h")).toBeVisible();

      // 2. Hydrated telemetry & UI formatting checks
      const bodyText = await page.locator("body").innerText();
      expect(bodyText).toMatch(/speed/i);
      expect(bodyText).toMatch(/throttle/i);
      expect(bodyText).toMatch(/brak/i);
      expect(bodyText).not.toContain("+-");
      expect(bodyText).not.toContain("$\\Delta t$");

      // 3. StewardReportExporter (#98)
      const exporter = page.getByTestId("steward-report-exporter");
      await expect(exporter).toBeAttached({ timeout: 10000 });
      await exporter.scrollIntoViewIfNeeded();
      await expect(exporter).toBeVisible();
      const dlBtn = exporter.getByRole("button", { name: /Download \.md/i });
      expect(Math.round((await dlBtn.boundingBox())?.height ?? 0)).toBeGreaterThanOrEqual(44);

      // 4. FiaRegulationAssistant (#99) via StrategyHUD REGS tab
      const expandBtn = page.getByRole("button", { name: /Expand Strategy HUD/i });
      if (await expandBtn.isVisible().catch(() => false)) {
        await expandBtn.click();
      } else if (vp.width < 768) {
        await page.evaluate(() => window.dispatchEvent(new CustomEvent("apex:open-hud")));
      }
      const regsTab = page.getByRole("button", { name: "REGS", exact: true });
      await expect(regsTab).toBeVisible({ timeout: 5000 });
      expect(Math.round((await regsTab.boundingBox())?.height ?? 0)).toBeGreaterThanOrEqual(44);
      await regsTab.click();

      const assistant = page.getByTestId("fia-regulation-assistant");
      await expect(assistant).toBeVisible();
      await assistant.getByRole("button", { name: /Art 33\.4 Moving under braking/i }).click();
      await expect(page.getByTestId("fia-regulation-results")).toBeVisible({ timeout: 5000 });

      // Close HUD on small viewports before switching to Live tab
      const closeHudBtn = page.getByRole("button", { name: /Close Strategy HUD/i });
      if (vp.width < 1280 && (await closeHudBtn.isVisible().catch(() => false))) {
        await closeHudBtn.click();
      }

      // 5. LiveTrackGpsSpline (#97)
      const liveTab = page.getByRole("tab", { name: "live" });
      await expect(liveTab).toBeVisible();
      expect(Math.round((await liveTab.boundingBox())?.height ?? 0)).toBeGreaterThanOrEqual(44);
      await liveTab.click();

      const minimap = page.getByTestId("live-track-gps-spline");
      await expect(minimap).toBeVisible({ timeout: 5000 });
      await expect(minimap.locator(".live-car-dot")).toHaveCount(2);

      // 6. Zero horizontal scroll leak & zero unicode emojis
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(overflow).toBe(false);

      const hasEmoji = await page.evaluate(() =>
        /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(document.body.innerText)
      );
      expect(hasEmoji).toBe(false);

      // 7. Clean console health
      const fatal = consoleErrors.filter(
        (e) => !e.includes("net::ERR_") && !e.includes("favicon") && !e.includes("404")
      );
      expect(fatal).toHaveLength(0);
    });
  }
});
