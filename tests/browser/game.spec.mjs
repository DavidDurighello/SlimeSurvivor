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

test("directional hero and slime artwork and independent arm poses are visible", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { Renderer } = await import("/src/render.mjs");
    const canvas = document.createElement("canvas"),
      r = new Renderer(canvas);
    const c = r.ctx;
    const hero = (facing, attacks = []) => {
      c.clearRect(0, 0, 440, 660);
      r.hero(220, 330, 0, false, false, true, facing, 0, attacks, [
        "plate",
        "shaker",
      ]);
      return canvas.toDataURL();
    };
    const faces = ["down", "up", "left", "right"];
    const heroes = faces.map((f) => hero(f));
    const slimes = faces.map((facing) => {
      c.clearRect(0, 0, 440, 660);
      r.slime({ x: 220, y: 330, r: 35, type: 0, phase: 0, facing }, 0);
      return canvas.toDataURL();
    });
    const strike = { weapon: "plate", angle: 0, life: 0.14, duration: 0.28 };
    const idle = hero("down"),
      left = hero("down", [strike, null]),
      right = hero("down", [null, { ...strike, weapon: "shaker" }]);
    // Also save a contact sheet for visual review of silhouettes and attack poses.
    canvas.width = 1760;
    canvas.height = 1320;
    c.scale(2, 2);
    c.fillStyle = "#d4d8bb";
    c.fillRect(0, 0, 880, 660);
    c.font = "18px sans-serif";
    c.textAlign = "center";
    faces.forEach((f, i) => {
      const x = 110 + i * 220;
      c.fillStyle = "#26372e";
      c.fillText(f, x, 40);
      r.hero(x, 150, 0, true, false, true, f, 1, [], ["dumbbell", "shaker"]);
      r.slime(
        { x, y: 300, r: 35, type: i % 3, phase: 1, facing: f, moving: true },
        0,
      );
      r.hero(
        x,
        490,
        0,
        false,
        false,
        true,
        f,
        0,
        [strike, { ...strike, angle: Math.PI, weapon: "shaker" }],
        ["plate", "shaker"],
      );
    });
    return {
      heroes: new Set(heroes).size,
      slimes: new Set(slimes).size,
      arms: new Set([idle, left, right]).size,
      image: canvas.toDataURL(),
    };
  });
  expect(result.heroes).toBe(4);
  expect(result.slimes).toBe(4);
  expect(result.arms).toBe(3);
  const { writeFile } = await import("node:fs/promises");
  await writeFile(
    "/tmp/whey-directions.png",
    Buffer.from(result.image.split(",")[1], "base64"),
  );
});

test("screen shake preference persists and OS reduced motion renders safely", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Désactiver les secousses" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Activer les secousses" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("whey-of-the-slime:v1")).reducedMotion,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "C’EST PARTI" }).click();
  await expect(page.locator("#hud")).toBeVisible();
});

test("defeat shows a reachable goal and replay restarts without losing jelly", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-01-01T00:00:01Z"));
  // Fixed spawning keeps this unattended combat reproducible; no health or damage bypass.
  await page.addInitScript(() => {
    let seed = 7;
    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "C’EST PARTI" }).click();
  for (let i = 0; i < 24; i++) {
    await page.clock.runFor(5000);
    if (await page.locator("#replay").isVisible()) break;
  }
  await expect(page.locator("#replay")).toBeVisible();
  await expect(page.locator("#upgrade-goal")).toBeVisible();
  await expect(page.locator(".run-record")).toContainText("Meilleure série");
  const earned = await page.evaluate(
    () => JSON.parse(localStorage.getItem("whey-of-the-slime:v1")).earnedBody,
  );
  await page.screenshot({ path: "/tmp/whey-run-result.png", fullPage: true });
  await page.locator("#replay").click();
  await expect(page.locator("#timer")).toHaveText("00:30");
  await expect(page.locator("#replay")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("whey-of-the-slime:v1")).earnedBody,
    ),
  ).toEqual(earned);
});
