import test from "node:test";
import assert from "node:assert/strict";
import {
  freshSave,
  validateSave,
  replaceTalents,
  replaceGear,
  comboKey,
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
test("boss appears at five minutes, enemies continue and victory ends run", () => {
  const a = new Arena(
    freshSave(),
    1,
    () => {},
    () => 0.2,
  );
  a.time = 299.99;
  a.update(0.02);
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
    assert.ok(a.time >= 300);
    assert.ok(a.kills > 300);
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
