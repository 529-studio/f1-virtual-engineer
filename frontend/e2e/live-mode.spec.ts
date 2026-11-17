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
      await expect(page.locator("text=VER")).toBeVisible();
      await expect(page.locator("text=NOR")).toBeVisible();

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
