import { test, expect } from "@playwright/test";

const mockRaceControlFeed = {
  status: "success",
  year: 2023,
  event: "Singapore Grand Prix",
  session: "Race",
  session_key: 9165,
  total_messages: 6,
  items: [
    {
      id: "rc-2023-sin-01",
      lap: 1,
      timestamp_str: "12:04:12",
      category: "TECHNICAL_FLAG",
      status: "NO_FURTHER_ACTION",
      drivers_involved: ["TSU"],
      flag: "YELLOW",
      message: "TURN 14 INCIDENT INVOLVING CAR 22 (TSU) - CAR STOPPED OFF TRACK",
      description: "Car retirement off track with single yellow sector.",
    },
    {
      id: "rc-2023-sin-02",
      lap: 2,
      timestamp_str: "12:07:30",
      category: "TRACK_LIMITS",
      status: "NO_FURTHER_ACTION",
      drivers_involved: ["HAM", "RUS", "NOR"],
      flag: "CLEAR",
      message: "CAR 44 (HAM) LEAVING THE TRACK AND GAINING AN ADVANTAGE AT TURN 2",
      description: "Hamilton returned position to Russell and Norris; NFA.",
    },
    {
      id: "rc-2023-sin-03",
      lap: 19,
      timestamp_str: "12:35:10",
      category: "SAFETY_CAR_INFECT",
      status: "DECISION_REACHED",
      drivers_involved: ["SAR"],
      flag: "YELLOW",
      message: "SAFETY CAR DEPLOYED - CAR 2 (SAR) HIT BARRIER AT TURN 8",
      description: "Debris on track, front wing wedged under barrier.",
    },
    {
      id: "rc-2023-sin-04",
      lap: 43,
      timestamp_str: "13:12:05",
      category: "SAFETY_CAR_INFECT",
      status: "DECISION_REACHED",
      drivers_involved: ["OCO"],
      flag: "YELLOW",
      message: "VIRTUAL SAFETY CAR DEPLOYED - CAR 31 (OCO) STOPPED AT TURN 2",
      description: "Gearbox mechanical failure stopped on main straight exit.",
    },
    {
      id: "rc-2023-sin-05",
      lap: 54,
      timestamp_str: "13:28:44",
      category: "COLLISION",
      status: "UNDER_INVESTIGATION",
      drivers_involved: ["PER", "ALB"],
      flag: "YELLOW",
      message: "INCIDENT INVOLVING CAR 11 (PER) AND CAR 23 (ALB) AT TURN 13 NOTED - CAUSING A COLLISION",
      description: "Late braking maneuver resulting in Turn 13 collision and front-wing damage.",
    },
    {
      id: "rc-2023-sin-06",
      lap: 62,
      timestamp_str: "13:42:15",
      category: "YELLOW_FLAG",
      status: "DECISION_REACHED",
      drivers_involved: ["RUS"],
      flag: "YELLOW",
      message: "CAR 63 (RUS) CRASHED AT TURN 10 - OUT OF RACE",
      description: "Russell clipped barrier on final lap chasing Norris for P2.",
    },
  ],
};

const mockInvestigationResponse = {
  status: "success",
  incident_id: "rc-2023-sin-05",
  category: "COLLISION",
  drivers_involved: ["PER", "ALB"],
  regulation_article: "Article 33.4",
  regulation_title: "Driving Standards & Causing an Avoidable Collision",
  regulation_snippet: "Maneuvers liable to hinder other drivers, such as deliberate crowding of a car beyond the edge of the track or any other abnormal change of direction, are strictly prohibited.",
  team_defense_argument: "Driver 11 was alongside Driver 23 before the apex at Turn 13 and held a valid racing line. Driver 23 pinched on entry without leaving space.",
  steward_prosecution_argument: "Telemetry reveals Driver 11 carried excessive entry speed into Turn 13 without sufficient lock, understeering into the rear-left quarter of Driver 23 who had fully established apex ownership.",
  predicted_verdict: "TIME_PENALTY_5S",
  confidence_pct: 92,
  penalty_breakdown: [
    {
      penalty: "TIME_PENALTY_5S",
      probability_pct: 65,
      description: "Standard sanction for causing an avoidable collision.",
    },
    {
      penalty: "TIME_PENALTY_10S",
      probability_pct: 15,
      description: "Severe collision with egregious entry speed.",
    },
    {
      penalty: "REPRIMAND",
      probability_pct: 10,
      description: "Mitigating racing circumstances.",
    },
    {
      penalty: "NO_FURTHER_ACTION",
      probability_pct: 10,
      description: "Deemed first-lap racing incident.",
    },
  ],
  precedents: [
    "2023 Singapore GP Lap 54 Perez awarded 5-second time penalty + 1 penalty point.",
    "2022 Austrian GP Lap 1 Russell 5-second penalty for Turn 4 collision with Perez.",
  ],
};

test.describe("AI Race Control & Steward Investigation Engine E2E Validation (V2.1)", () => {
  const viewports = [
    { name: "Desktop", width: 1440, height: 900 },
    { name: "Tablet", width: 834, height: 1112 },
    { name: "Mobile", width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    test(`verifies Race Control feed, category filtering, steward deliberation card, kiosk touch targets, and zero horizontal leaks on ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // Dismiss onboarding coachmarks tour
      await page.addInitScript(() => {
        localStorage.setItem("apex_coachmarks_seen", "true");
      });

      // Intercept Race Control Feed API
      await page.route("**/race-control/feed*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          json: mockRaceControlFeed,
        });
      });

      // Intercept Steward Investigation API
      await page.route("**/race-control/investigate*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          json: mockInvestigationResponse,
        });
      });

      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      await page.goto("/mission-control");

      // 1. Verify Race Control Panel renders and scroll into view
      const panel = page.locator('[data-testid="race-control-panel"]');
      await expect(panel).toBeAttached({ timeout: 10000 });
      await panel.scrollIntoViewIfNeeded();
      await expect(panel).toBeVisible({ timeout: 10000 });

      // 2. Verify Race Control Panel Title & Badge
      await expect(panel.getByText(/AI Race Control & Steward Investigation Engine/i)).toBeVisible();
      await expect(panel.getByText(/Official FIA FastF1 Incident Ingestion/i)).toBeVisible();

      // 3. Kiosk Ergonomics: Verify Category Filter Buttons touch targets >= 44px
      const filterCategories = ["ALL", "COLLISION", "TRACK_LIMITS", "SAFETY_CAR_INFECT", "TECHNICAL_FLAG"];
      for (const cat of filterCategories) {
        const filterBtn = panel.locator(`[data-testid="category-filter-${cat}"]`);
        await expect(filterBtn).toBeVisible();
        const box = await filterBtn.boundingBox();
        expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44);
        expect(Math.round(box?.width ?? 0)).toBeGreaterThanOrEqual(44);
      }

      // 4. Verify Incident items in timeline
      const timelineItems = panel.locator('[data-testid^="incident-item-"]');
      await expect(timelineItems).toHaveCount(6);

      // Verify specific Singapore 2023 incidents
      const firstIncident = panel.locator('[data-testid="incident-item-rc-2023-sin-01"]');
      await firstIncident.scrollIntoViewIfNeeded();
      await expect(firstIncident).toBeVisible();
      await expect(firstIncident.getByText(/CAR 22 \(TSU\)/i)).toBeVisible();
      await expect(panel.getByText(/CAR 44 \(HAM\) LEAVING THE TRACK/i)).toBeAttached();
      await expect(panel.getByText(/CAR 2 \(SAR\) HIT BARRIER AT TURN 8/i)).toBeAttached();
      await expect(panel.getByText(/CAR 11 \(PER\) AND CAR 23 \(ALB\)/i)).toBeAttached();

      // 5. Interaction: Filter by COLLISION
      const collisionFilterBtn = panel.locator('[data-testid="category-filter-COLLISION"]');
      await collisionFilterBtn.click();
      await expect(collisionFilterBtn).toHaveAttribute("aria-pressed", "true");

      // Only collision incidents should now be visible
      const filteredTimelineItems = panel.locator('[data-testid^="incident-item-"]');
      await expect(filteredTimelineItems).toHaveCount(1);
      const perAlbIncident = panel.locator('[data-testid="incident-item-rc-2023-sin-05"]');
      await perAlbIncident.scrollIntoViewIfNeeded();
      await expect(perAlbIncident).toBeVisible();
      await expect(perAlbIncident.getByText(/CAR 11 \(PER\) AND CAR 23 \(ALB\)/i)).toBeVisible();

      // 6. Interaction: Click incident to trigger Steward Deliberation Engine
      await perAlbIncident.click();

      // 7. Verify Steward Investigation Card renders with dual perspectives
      const card = panel.locator('[data-testid="steward-investigation-card"]');
      await card.scrollIntoViewIfNeeded();
      await expect(card).toBeVisible();
      await expect(card.getByText(/TEAM DEFENSE ARGUMENT/i)).toBeVisible();
      await expect(card.getByText(/Driver 11 was alongside Driver 23 before the apex/i)).toBeVisible();
      await expect(card.getByText(/STEWARD PROSECUTION ARGUMENT/i)).toBeVisible();
      await expect(card.getByText(/Telemetry reveals Driver 11 carried excessive entry speed/i)).toBeVisible();

      // Verify Sporting Regulations Citation
      await expect(card.getByText(/Article 33\.4/i)).toBeVisible();
      await expect(card.getByText(/FIA STATUTORY GROUNDING/i)).toBeVisible();

      // Verify Normalized Penalty Probabilities
      await expect(card.getByText(/PENALTY PROBABILITY DISTRIBUTION/i)).toBeVisible();
      await expect(card.getByText(/TIME PENALTY 5S/i).first()).toBeVisible();
      await expect(card.getByText(/65%/i)).toBeVisible();
      await expect(card.getByText(/92% CONFIDENCE/i)).toBeVisible();

      // 8. Strict ban on raw unicode emojis
      const panelText = await panel.innerText();
      const rawEmojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{26A0}\u{26A1}\u{26FD}\u{1F3C1}\u{1F525}\u{2696}]/u;
      const emojiMatch = panelText.match(rawEmojiRegex);
      expect(emojiMatch).toBeNull();

      // 9. Zero horizontal scroll leak across viewport
      const hasHorizontalOverflow = await page.evaluate(
        () => document.body.scrollWidth > document.body.clientWidth
      );
      expect(hasHorizontalOverflow).toBeFalsy();

      // 10. Clean console logs (no fatal errors)
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
