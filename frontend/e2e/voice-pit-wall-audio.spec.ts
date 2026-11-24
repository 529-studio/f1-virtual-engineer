import { test, expect } from "@playwright/test";

test.describe("Hands-Free Pit-Wall Voice Synthesizer E2E Suite", () => {
  const viewports = [
    { name: "Desktop", width: 1440, height: 900 },
    { name: "Tablet", width: 834, height: 1112 },
    { name: "Mobile", width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    test(`verifies pit-wall audio controls, touch targets, and mute state on ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // Dismiss onboarding coachmarks & inject safe SpeechSynthesis mock
      await page.addInitScript(() => {
        localStorage.setItem("apex_coachmarks_seen", "true");

        if (!("speechSynthesis" in window)) {
          (window as unknown as { speechSynthesis: unknown }).speechSynthesis = {
            speak: () => {},
            cancel: () => {},
            getVoices: () => [],
            pause: () => {},
            resume: () => {},
          };
        }
      });

      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      await page.goto("/mission-control");

      // 1. Verify Voice Pit-Wall Audio container renders
      const audioContainer = page.getByTestId("voice-pit-wall-audio");
      await expect(audioContainer).toBeVisible({ timeout: 10000 });

      // 2. Verify Title and Radio Live pill
      await expect(page.getByText("PIT-WALL VOICE SYNTHESIZER")).toBeVisible();
      await expect(page.getByText("RADIO LIVE")).toBeVisible();

      // 3. Kiosk Ergonomics: Verify Callout and Mute buttons >= 44px
      const calloutBtn = audioContainer.getByRole("button", { name: /callout/i });
      const muteBtn = audioContainer.getByRole("button", { name: /mute pit-wall audio/i });

      await expect(calloutBtn).toBeVisible();
      await expect(muteBtn).toBeVisible();

      const calloutBox = await calloutBtn.boundingBox();
      const muteBox = await muteBtn.boundingBox();

      expect(Math.round(calloutBox?.width ?? 0)).toBeGreaterThanOrEqual(44);
      expect(Math.round(calloutBox?.height ?? 0)).toBeGreaterThanOrEqual(44);
      expect(Math.round(muteBox?.width ?? 0)).toBeGreaterThanOrEqual(44);
      expect(Math.round(muteBox?.height ?? 0)).toBeGreaterThanOrEqual(44);

      // 4. Interaction: Click Mute toggle
      await muteBtn.click();
      await expect(page.getByText("MUTED")).toBeVisible();
      await expect(page.getByRole("button", { name: /unmute pit-wall audio/i })).toBeVisible();

      // Unmute again
      const unmuteBtn = page.getByRole("button", { name: /unmute pit-wall audio/i });
      await unmuteBtn.click();
      await expect(page.getByText("RADIO LIVE")).toBeVisible();

      // 5. Strict ban on raw unicode emojis
      const containerText = await audioContainer.innerText();
      const rawEmojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{26A0}\u{26A1}\u{26FD}\u{1F3C1}\u{1F525}]/u;
      expect(containerText.match(rawEmojiRegex)).toBeNull();

      // 6. Verify zero horizontal scroll leak
      const hasOverflow = await page.evaluate(
        () => document.body.scrollWidth > document.body.clientWidth
      );
      expect(hasOverflow).toBeFalsy();

      // 7. Assert no fatal console errors
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
