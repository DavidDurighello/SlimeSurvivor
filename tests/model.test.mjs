import test from "node:test";
import assert from "node:assert/strict";
import {
  freshSave,
  validateSave,
  replaceTalents,
  replaceGear,
  comboKey,
  nextUpgrade,
} from "../src/model.mjs";
import { Arena } from "../src/engine.mjs";
test("save validation rejects malformed imports and keeps independent hands", () => {
  const s = freshSave();
  s.talents[0][0] = 1;
  assert.equal(s.talents[1][0], 0);
  assert.deepEqual(validateSave(s), s);
  assert.throws(() => validateSave({ ...s, body: [-1, 0, 0] }));
  assert.throws(() => validateSave({ ...s, weapons: ["unknown", "dumbbell"] }));
});
test("talent reassignment refunds exact costs, cannot create jelly", () => {
  assert.deepEqual(replaceTalents([0, 0, 0], [2, 0, 0], [0, 0, 0]), [23, 0, 0]);
  assert.deepEqual(replaceTalents([23, 0, 0], [0, 0, 0], [2, 0, 0]), [0, 0, 0]);
  assert.equal(replaceTalents([0, 0, 0], [0, 0, 0], [1, 0, 0]), null);
  const s = freshSave();
  s.gear = [16, 0, 0];
  const p = {
    weapons: ["dumbbell", "dumbbell"],
    talents: [
      [1, 0, 0],
      [1, 0, 0],
    ],
  };
  assert.deepEqual(replaceGear(s, p), [0, 0, 0]);
  assert.deepEqual(s.gear, [16, 0, 0]);
  s.gear = [8, 0, 0];
  assert.equal(replaceGear(s, p), null);
});
test("combination ignores hand order, consumes rage, pauses correctly", () => {
  assert.equal(comboKey(["shaker", "plate"]), comboKey(["plate", "shaker"]));
  const a = new Arena(freshSave(), 1);
  assert.equal(a.special(), false);
  a.rage = 80;
  assert.equal(a.special(), true);
  assert.equal(a.rage, 45);
  a.paused = true;
  a.update(0.05);
  assert.equal(a.time, 0);
  assert.equal(a.dash(), false);
});
test("boss appears at 30 seconds, enemies continue and victory ends run", () => {
  const a = new Arena(
    freshSave(),
    1,
    () => {},
    () => 0.2,
  );
  a.time = 29.95;
  a.update(0.02);
  assert.equal(a.boss, null, "No boss before 30 seconds");
  a.update(0.04);
  assert.ok(a.boss);
  assert.equal(a.ended, false);
  const count = a.enemies.length;
  a.spawn = 0;
  a.update(0.02);
  assert.ok(a.enemies.length > count);
  a.hit(a.boss, 100000);
  assert.equal(a.ended, true);
  assert.ok(a.gainedBody[0] >= 40);
});
test("loot emits immediately, armament is additional, defeat preserves gains", () => {
  const events = [];
  const a = new Arena(
    freshSave(),
    1,
    (type, data) => events.push([type, data]),
    () => 0.2,
  );
  const e = a.spawnEnemy();
  a.hit(e, 10000);
  assert.equal(a.gainedBody[0], 1);
  assert.equal(a.gainedGear[0], 1);
  assert.equal(events.filter((e) => e[0] === "loot").length, 1);
  a.player.hp = 1;
  a.hurt(10);
  assert.equal(a.ended, true);
  assert.equal(a.gainedBody[0], 1);
});

test("complete runs can defeat every boss with earned maximum upgrades", () => {
  for (const difficulty of [1, 2, 3]) {
    const save = freshSave();
    save.skills = [5, 5, 5];
    save.levels = { dumbbell: 5, plate: 5, shaker: 5 };
    save.weapons = ["plate", "shaker"];
    save.talents = [
      [3, 3, 3],
      [3, 3, 3],
    ];
    let seed = 42;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    let outcome = null;
    const a = new Arena(
      save,
      difficulty,
      (type, data) => {
        if (type === "end") outcome = data;
      },
      random,
    );
    // Run real simulation steps without skipping time, damage, enemies or attacks.
    for (let i = 0; i < 27000 && !a.ended; i++) {
      const t = i / 60,
        dx = 220 + 130 * Math.cos(t * 0.55) - a.player.x,
        dy = 330 + 215 * Math.sin(t * 0.55) - a.player.y,
        d = Math.hypot(dx, dy);
      a.update(1 / 60, { x: dx / Math.max(1, d), y: dy / Math.max(1, d) });
      if (a.rage > 75) a.special();
      if (a.boss?.warning > 0) a.dash();
    }
    assert.equal(
      outcome?.win,
      true,
      `Difficulty ${difficulty} must be winnable`,
    );
    assert.ok(a.time >= 30);
    assert.ok(a.kills > 20);
  }
});

test("movement, boundary clamping and dash cooldown", () => {
  const a = new Arena(freshSave(), 1);
  const start = a.player.x;
  a.update(0.05, { x: 1, y: 0 });
  assert.ok(a.player.x > start);
  assert.equal(a.dash(), true);
  assert.equal(a.dash(), false);
  for (let i = 0; i < 100; i++) a.update(0.05, { x: 1, y: 0 });
  assert.ok(a.player.x <= 418);
  assert.equal(a.dash(), true);
});

test("facing follows movement, remains at rest and stops at arena walls", () => {
  const a = new Arena(freshSave(), 1);
  for (const [x, y, facing] of [
    [1, 0, "right"],
    [-1, 0, "left"],
    [0, -1, "up"],
    [0, 1, "down"],
  ]) {
    a.update(0.05, { x, y });
    assert.equal(a.player.facing, facing);
    assert.equal(a.player.moving, true);
  }
  const phase = a.player.phase;
  a.update(0.05);
  assert.equal(a.player.facing, "down");
  assert.equal(a.player.moving, false);
  assert.equal(a.player.phase, phase);
  a.player.x = 418;
  a.update(0.05, { x: 1, y: 0 });
  assert.equal(a.player.moving, false);
  a.player.x = 200;
  a.update(0.05, { x: -1, y: 0 });
  a.dash();
  a.update(0.05);
  assert.equal(a.player.facing, "left");
  assert.equal(a.player.moving, true);
});

test("slimes turn toward travel and face their charge instead of the player", () => {
  const a = new Arena(freshSave(), 1);
  a.spawn = 100;
  const e = a.spawnEnemy();
  e.x = a.player.x - 130;
  e.y = a.player.y;
  e.attack = 100;
  a.update(0.05);
  assert.equal(e.facing, "right");
  assert.equal(e.moving, true);
  e.warning = 0.5;
  a.update(0.05);
  assert.equal(e.moving, false);
  assert.equal(e.facing, "right");
  e.warning = 0;
  e.charge = 0.4;
  e.cx = -1;
  e.cy = 0;
  a.update(0.05);
  assert.equal(e.facing, "left");
});

test("attacks animate the correct hand, aim at target and freeze in pause", () => {
  const save = freshSave();
  save.weapons = ["plate", "shaker"];
  save.levels.plate = save.levels.shaker = 1;
  const a = new Arena(save, 1);
  a.spawn = 100;
  a.cooldowns = [0, 100];
  const e = a.spawnEnemy();
  e.x = a.player.x + 130;
  e.y = a.player.y;
  e.hp = 10000;
  e.attack = 100;
  a.update(0.05);
  assert.equal(a.player.attacks[0].weapon, "plate");
  assert.equal(a.player.attacks[1], null);
  assert.equal(a.player.attacks[0].angle, 0);
  a.cooldowns = [100, 0];
  a.update(0.05);
  assert.equal(a.player.attacks[1].weapon, "shaker");
  const life = a.player.attacks[0].life;
  a.paused = true;
  a.update(0.05);
  assert.equal(a.player.attacks[0].life, life);
  a.paused = false;
  for (let i = 0; i < 7; i++) a.update(0.05);
  assert.equal(a.player.attacks[0].life, 0);
});

test("impacts recoil away from the attacker, stay bounded and resist on bosses", () => {
  const a = new Arena(freshSave(), 1);
  a.spawn = 100;
  a.cooldowns = [100, 100];
  const e = a.spawnEnemy();
  e.x = a.player.x + 50;
  e.y = a.player.y;
  e.hp = 1000;
  a.hit(e, 1);
  assert.ok(e.recoilX > 0);
  assert.equal(e.impact, 0.2);
  const old = e.x;
  a.update(0.01);
  assert.ok(e.x > old);
  assert.ok(e.impact < 0.2);
  const boss = a.spawnEnemy(true);
  boss.x = a.player.x + 50;
  boss.y = a.player.y;
  a.hit(boss, 1);
  assert.ok(boss.recoilX < e.recoilX);
  e.x = 439;
  a.update(0.05);
  assert.ok(e.x <= 440 - e.r);
});
test("kill chains expire and never grant duplicate loot", () => {
  const a = new Arena(
    freshSave(),
    1,
    () => {},
    () => 0.8,
  );
  for (let i = 0; i < 5; i++) {
    a.kill(a.spawnEnemy());
    a.time += 0.2;
  }
  assert.equal(a.combo, 5);
  assert.equal(a.bestCombo, 5);
  const body = [...a.gainedBody];
  a.kill(a.enemies[0]);
  assert.deepEqual(a.gainedBody, body);
  a.time += 3;
  a.update(0.01);
  assert.equal(a.combo, 0);
  a.kill(a.spawnEnemy());
  assert.equal(a.combo, 1);
  assert.equal(a.bestCombo, 5);
});
test("older saves default to full effects and keep the reduced motion preference", () => {
  const legacy = freshSave();
  delete legacy.reducedMotion;
  assert.equal(validateSave(legacy).reducedMotion, false);
  legacy.reducedMotion = true;
  assert.equal(validateSave(legacy).reducedMotion, true);
});

test("next upgrade suggests an exact affordable purchase without touching jelly", () => {
  const s = freshSave();
  s.gear[0] = 15;
  const before = JSON.stringify(s);
  const goal = nextUpgrade(s);
  assert.equal(goal.name, "Débloquer Disques");
  assert.equal(goal.missing, 0);
  assert.equal(goal.tab, "gear");
  assert.equal(JSON.stringify(s), before);
  s.gear[0] = 0;
  s.body[0] = 5;
  const body = nextUpgrade(s);
  assert.equal(body.name, "Muscles · rang 1");
  assert.equal(body.missing, 3);
  s.skills = [5, 5, 5];
  s.levels = { dumbbell: 5, plate: 5, shaker: 5 };
  assert.equal(nextUpgrade(s), null);
});

test("boss alternates a warned slam and a charge toward a locked target", () => {
  const a = new Arena(freshSave(), 1);
  a.spawn = 100;
  a.cooldowns = [100, 100];
  a.player.x = 300;
  a.player.y = 100;
  const boss = a.spawnEnemy(true);
  boss.x = 100;
  boss.y = 100;
  boss.attack = 0;
  a.update(0.05);
  assert.equal(boss.pattern, "slam");
  assert.ok(boss.warning > 0);
  assert.equal(boss.charge, 0);
  for (let i = 0; i < 20; i++) a.update(0.05);
  boss.attack = 0;
  a.update(0.05);
  assert.equal(boss.pattern, "charge");
  const targetY = boss.targetY;
  a.player.y = 400;
  for (let i = 0; i < 23; i++) a.update(0.05);
  assert.equal(boss.targetY, targetY);
  assert.ok(boss.charge > 0);
  assert.ok(Math.abs(boss.cy) < 0.01);
  assert.ok(boss.x > 100);
});
