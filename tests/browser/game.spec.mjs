import { test, expect } from "@playwright/test";
import { freshSave } from "../../src/model.mjs";
test("desktop combat, pause, persistence, purchases and safe named configurations", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "C’est l’heure du bulk." }),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/whey-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "C’EST PARTI" }).click();
  await expect(page.locator("#hud")).toBeVisible();
  await page.waitForTimeout(1100);
  await page.keyboard.down("d");
  await page.waitForTimeout(300);
  await page.keyboard.up("d");
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: "Mettre en pause" }).click();
  const time = await page.locator("#timer").textContent();
  await page.waitForTimeout(1200);
  await expect(page.locator("#timer")).toHaveText(time);
  await page
    .getByRole("button", { name: "Quitter et garder mes gelées" })
    .click();
  await page.reload();
  await expect(page.locator("#hud")).toBeHidden();
  const seed = freshSave();
  seed.body = [100, 100, 100];
  seed.gear = [100, 100, 100];
  seed.earnedBody = [100, 100, 100];
  seed.earnedGear = [100, 100, 100];
  await page.addInitScript((s) => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("whey-of-the-slime:v1", JSON.stringify(s));
      sessionStorage.setItem("seeded", "yes");
    }
  }, seed);
  await page.reload();
  await page.locator('[data-tab="body"]').click();
  await page.locator('[data-body-plus="0"]').click();
  await page.locator("#preset-name").fill("<b>Coach</b>");
  await page.getByRole("button", { name: "Sauvegarder", exact: true }).click();
  await expect(page.locator(".presets")).toContainText("<b>Coach</b>");
  await expect(page.locator(".presets b")).toHaveCount(0);
  await page.locator('[data-body-minus="0"]').click();
  await page.locator('[data-load="0"]').click();
  await page.locator('[data-tab="gear"]').click();
  await page.locator('[data-buy="plate"]').click();
  await page.locator("#weapon-1").selectOption("plate");
  await page.locator('[data-add="0,0"]').click();
  await page.locator('[data-add="1,1"]').click();
  await page.locator("#preset-name").fill("Disco");
  await page.getByRole("button", { name: "Sauvegarder", exact: true }).click();
  await page.reload();
  const persisted = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("whey-of-the-slime:v1")),
  );
  expect(persisted.skills[0]).toBe(1);
  expect(persisted.body[0]).toBe(92);
  expect(persisted.talents).toEqual([
    [1, 0, 0],
    [0, 1, 0],
  ]);
  expect(persisted.weapons).toEqual(["dumbbell", "plate"]);
  expect(persisted.gearPresets[0].name).toBe("Disco");
  await page.getByRole("button", { name: "Exporter / importer" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#export").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("whey-of-the-slime-save.json");
  expect(errors).toEqual([]);
});
test("portrait layout, touch controls and pause", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "C’EST PARTI" }).tap();
  await page.screenshot({ path: "/tmp/whey-mobile.png" });
  await expect(page.locator("#joystick")).toBeVisible();
  await expect(page.locator("#mobile-stats")).toBeVisible();
  const joy = await page.locator("#joystick").boundingBox();
  expect(joy.y + joy.height).toBeLessThan(845);
  await page.locator("#dash").tap();
  await expect(page.locator("#dash")).toHaveClass(/cooldown/);
  await page.locator("#mobile-stats").tap();
  await expect(
    page.getByRole("heading", { name: "Pause protéinée." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "REPRENDRE" }).tap();
  await page.getByRole("button", { name: "Mettre en pause" }).tap();
  await page
    .getByRole("button", { name: "Quitter et garder mes gelées" })
    .tap();
  await expect(page.locator("#hud")).toBeHidden();
  expect(errors).toEqual([]);
  await context.close();
});

test("real combat earns persistent loot and reveals a combination on first use", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:00:01Z"));
  const seed = freshSave();
  seed.skills = [5, 5, 5];
  seed.levels = { dumbbell: 5, plate: 5, shaker: 5 };
  seed.weapons = ["plate", "shaker"];
  seed.talents = [
    [3, 3, 3],
    [3, 3, 3],
  ];
  await page.addInitScript((s) => {
    if (!sessionStorage.getItem("combat-seed")) {
      localStorage.setItem("whey-of-the-slime:v1", JSON.stringify(s));
      sessionStorage.setItem("combat-seed", "1");
    }
  }, seed);
  await page.goto("/");
  await page.getByRole("button", { name: "C’EST PARTI" }).click();
  await expect(page.locator("#timer")).toHaveText("00:30");
  await page.clock.runFor(29000);
  await expect(page.locator("#boss-hud")).toBeHidden();
  await page.clock.runFor(1200);
  await expect(page.locator("#boss-hud")).toBeVisible();
  await expect(page.locator("#timer")).toHaveText("BOSS");
  await expect(page.locator("#kills-stat")).not.toHaveText("0");
  const before = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("whey-of-the-slime:v1")),
  );
  expect(before.earnedBody.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
  await page.keyboard.press("e");
  const after = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("whey-of-the-slime:v1")),
  );
  expect(after.codex).toContain("plate+shaker");
  await expect(page.locator("#toast")).toContainText("Smoothie orbital");
  await page.reload();
  await expect(page.locator("#hud")).toBeHidden();
  const restored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("whey-of-the-slime:v1")),
  );
  expect(restored.earnedBody).toEqual(after.earnedBody);
  expect(restored.codex).toContain("plate+shaker");
});

test("invalid save import is rejected without changing progress", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Exporter / importer", exact: false })
    .click();
  await page.locator("#import-file").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.locator("#toast")).toContainText("Import refusé");
  page.once("dialog", (d) => d.accept());
  await page.locator("#import-file").setInputFiles({
    name: "good.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        ...freshSave(),
        body: [42, 0, 0],
        earnedBody: [42, 0, 0],
      }),
    ),
  });
  await expect(page.locator("#toast")).toContainText("Sauvegarde importée");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("whey-of-the-slime:v1")).body[0],
    ),
  ).toBe(42);
});
