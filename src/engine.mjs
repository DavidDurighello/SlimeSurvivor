import { WEAPONS, comboKey } from "./model.mjs";
export const SURVIVAL_SECONDS = 30;
export const WIDTH = 440,
  HEIGHT = 660;
const clamp = (v, a, b) => Math.max(a, Math.min(v, b));
// Orientation follows actual movement, including charge and dash, not target position.
function trackMotion(entity, oldX, oldY) {
  const x = entity.x - oldX,
    y = entity.y - oldY;
  const distance = Math.hypot(x, y);
  entity.moving = distance > 0.0001;
  if (!entity.moving) return;
  entity.facing =
    Math.abs(x) > Math.abs(y)
      ? x > 0
        ? "right"
        : "left"
      : y > 0
        ? "down"
        : "up";
  entity.phase = (entity.phase ?? 0) + distance / 7;
}
export class Arena {
  constructor(save, difficulty, emit = () => {}, random = Math.random) {
    this.save = save;
    this.difficulty = difficulty;
    this.emit = emit;
    this.random = random;
    this.time = 0;
    this.kills = 0;
    this.rage = 0;
    this.ended = false;
    this.paused = false;
    this.player = {
      x: WIDTH / 2,
      y: HEIGHT / 2,
      hp: 100 + save.skills[1] * 25,
      maxHp: 100 + save.skills[1] * 25,
      inv: 0,
      dash: 0,
      dashTime: 0,
      dx: 0,
      dy: -1,
      facing: "down",
      moving: false,
      phase: 0,
      attacks: [null, null],
    };
    this.enemies = [];
    this.shots = [];
    this.effects = [];
    this.drops = [];
    this.texts = [];
    this.gainedBody = [0, 0, 0];
    this.gainedGear = [0, 0, 0];
    this.spawn = 0;
    this.cooldowns = [0.2, 0.6];
    this.specialCooldown = 0;
    this.boss = null;
    this.lastKill = -10;
    this.combo = 0;
    this.bestCombo = 0;
    this.shake = 0;
    this.stains = [];
  }
  fx(x, y, color, size = 25, kind = "burst") {
    this.effects.push({
      x,
      y,
      color,
      size,
      life: 0.42,
      max: 0.42,
      kind,
      seed: this.random() * 6,
    });
  }
  text(x, y, text, color = "#fff") {
    this.texts.push({ x, y, text, color, life: 0.85 });
  }
  dash() {
    const p = this.player;
    if (p.dash > 0 || this.ended || this.paused) return false;
    p.dash = Math.max(1.3, 3 - this.save.skills[1] * 0.2);
    p.dashTime = 0.19;
    p.inv = 0.32;
    this.fx(p.x, p.y, "#b6ee77", 50, "ring");
    this.emit("dash");
    return true;
  }
  special() {
    if (this.rage < 35 || this.specialCooldown > 0 || this.ended || this.paused)
      return false;
    this.rage -= 35;
    this.specialCooldown = 1;
    const key = comboKey(this.save.weapons),
      p = this.player;
    const effects = this.save.talents[0].map(
      (v, i) => v + this.save.talents[1][i],
    );
    const ranged = key === "plate+plate" || key === "plate+shaker";
    const radius = ranged ? 95 : key === "shaker+shaker" ? 240 : 190;
    if (ranged || key === "dumbbell+plate") {
      const count = key === "plate+plate" ? 20 : 12;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        this.shots.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(a) * 290,
          vy: Math.sin(a) * 290,
          life: 1.7,
          damage: 65 + this.save.skills[0] * 12,
          talents: effects,
          shaker: key === "plate+shaker",
          angle: a,
          hit: new Set(),
        });
      }
    }
    const damage =
      95 +
      this.save.skills[0] * 20 +
      Object.values(this.save.levels).reduce((a, b) => a + b, 0) * 8;
    for (const e of [...this.enemies])
      if (Math.hypot(e.x - p.x, e.y - p.y) < radius) {
        this.hit(e, damage, effects);
        e.slow = Math.max(e.slow, 2 + effects[1]);
        if (key.includes("shaker")) e.burn = Math.max(e.burn, 4 + effects[0]);
      }
    this.fx(
      p.x,
      p.y,
      key.includes("shaker") ? "#b6ee77" : "#ffb75e",
      radius,
      "nova",
    );
    this.text(p.x, p.y - 55, "WHEY TOO STRONG!", "#ffcf72");
    this.shake = 3;
    this.emit("special", key);
    return true;
  }
  spawnEnemy(boss = false) {
    const edge = Math.floor(this.random() * 4),
      margin = 22;
    let x =
      edge < 2
        ? edge
          ? WIDTH - margin
          : margin
        : margin + this.random() * (WIDTH - margin * 2);
    let y =
      edge > 1
        ? edge === 2
          ? margin
          : HEIGHT - margin
        : margin + this.random() * (HEIGHT - margin * 2);
    const roll = this.random();
    const type = boss
      ? this.difficulty - 1
      : roll < 0.5
        ? 0
        : roll < 0.82
          ? 1
          : 2;
    const size = boss ? 51 : type === 2 ? 23 : type === 1 ? 13 : 17;
    const hp = boss
      ? 1700 * this.difficulty
      : (type === 2 ? 70 : type === 1 ? 22 : 35) *
        (1 + (this.difficulty - 1) * 0.7 + this.time / 500);
    const e = {
      x,
      y,
      type,
      r: size,
      hp,
      maxHp: hp,
      speed: boss ? 35 : type === 1 ? 63 : type === 2 ? 24 : 37,
      boss,
      slow: 0,
      burn: 0,
      fragile: 0,
      flash: 0,
      phase: this.random() * 6,
      attack: boss ? 3 : 4 + this.random() * 3,
      warning: 0,
      targetX: 0,
      targetY: 0,
      charge: 0,
      facing: "down",
      moving: false,
      recoilX: 0,
      recoilY: 0,
      impact: 0,
      dead: false,
    };
    this.enemies.push(e);
    if (boss) {
      this.boss = e;
      this.emit("boss");
      this.text(WIDTH / 2, 160, "LE ROI DU BULK", "#ffb75e");
    }
    return e;
  }
  hit(
    e,
    damage,
    talents = [0, 0, 0],
    weapon = "dumbbell",
    origin = this.player,
  ) {
    if (e.dead || this.ended) return;
    const resistance =
      e.type === 0 ? [0.65, 1, 1] : e.type === 1 ? [1, 0.65, 1] : [1, 1, 0.65];
    damage *= e.fragile > 0 ? 1.3 : 1;
    e.hp -= damage;
    e.flash = 0.09;
    e.impact = 0.2;
    const dx = e.x - origin.x,
      dy = e.y - origin.y,
      distance = Math.hypot(dx, dy) || 1;
    const force =
      (weapon === "dumbbell" ? 185 : weapon === "plate" ? 110 : 75) *
      (e.boss ? 0.12 : 1);
    e.recoilX = (dx / distance) * force;
    e.recoilY = (dy / distance) * force;
    e.impactAngle = Math.atan2(dy, dx);
    this.shake = Math.max(this.shake, weapon === "dumbbell" ? 1.8 : 0.8);
    this.emit("impact", { weapon });
    if (talents[0]) e.burn = Math.max(e.burn, talents[0] * resistance[0]);
    if (talents[1]) e.slow = Math.max(e.slow, talents[1] * resistance[1]);
    if (talents[2]) e.fragile = Math.max(e.fragile, talents[2] * resistance[2]);
    this.fx(e.x, e.y, ["#8be58b", "#81ceff", "#cf9aff"][e.type], e.r);
    this.text(
      e.x,
      e.y - e.r,
      Math.ceil(damage).toString(),
      talents[0] ? "#ffb75e" : "#fff",
    );
    if (e.hp <= 0) this.kill(e);
  }
  kill(e) {
    if (e.dead) return;
    e.dead = true;
    this.kills++;
    this.combo = this.time - this.lastKill <= 2.2 ? this.combo + 1 : 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.lastKill = this.time;
    if (this.combo === 5 || this.combo % 10 === 0) {
      this.emit("streak", this.combo);
      this.text(
        this.player.x,
        this.player.y - 55,
        `${this.combo} À LA SUITE !`,
        "#ffcf72",
      );
    }
    this.stains.push({
      x: e.x,
      y: e.y,
      r: e.r,
      type: e.type,
      life: 5,
      seed: this.random() * 6,
    });
    if (this.stains.length > 30) this.stains.shift();
    this.rage = clamp(this.rage + 5 + this.save.skills[2] * 0.6, 0, 100);
    const color = Math.min(this.difficulty - 1, e.type);
    const body = e.boss ? 40 * this.difficulty : e.type === 2 ? 3 : 1;
    const gear = e.boss ? 15 * this.difficulty : this.random() < 0.3 ? 1 : 0;
    this.gainedBody[color] += body;
    this.gainedGear[color] += gear;
    this.emit("loot", { color, body, gear });
    this.drops.push({ x: e.x, y: e.y, color, gear, life: 0.6 });
    this.fx(
      e.x,
      e.y,
      ["#8be58b", "#81ceff", "#cf9aff"][e.type],
      e.r * 2,
      "splat",
    );
    this.emit("kill");
    if (e.boss) this.finish(true);
  }
  finish(win) {
    if (this.ended) return;
    this.ended = true;
    this.emit("end", {
      win,
      kills: this.kills,
      time: this.time,
      bestCombo: this.bestCombo,
    });
  }
  update(dt, input = { x: 0, y: 0 }) {
    if (this.paused || this.ended) return;
    dt = clamp(dt, 0, 0.05);
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 14);
    if (this.time - this.lastKill > 2.2) this.combo = 0;
    for (const stain of this.stains) stain.life -= dt;
    this.stains = this.stains.filter((s) => s.life > 0);
    const p = this.player;
    const oldX = p.x,
      oldY = p.y;
    for (const attack of p.attacks)
      if (attack) attack.life = Math.max(0, attack.life - dt);
    p.inv = Math.max(0, p.inv - dt);
    p.dash = Math.max(0, p.dash - dt);
    p.dashTime = Math.max(0, p.dashTime - dt);
    this.specialCooldown = Math.max(0, this.specialCooldown - dt);
    const len = Math.hypot(input.x, input.y);
    if (len > 0.05) {
      p.dx = input.x / Math.max(1, len);
      p.dy = input.y / Math.max(1, len);
    }
    const speed =
      155 * (1 + this.save.skills[1] * 0.025) * (p.dashTime > 0 ? 4.4 : 1);
    if (p.dashTime > 0 || len > 0.05) {
      p.x = clamp(p.x + p.dx * speed * dt, 22, WIDTH - 22);
      p.y = clamp(p.y + p.dy * speed * dt, 28, HEIGHT - 25);
    }
    trackMotion(p, oldX, oldY);
    this.rage = Math.max(
      0,
      this.rage - dt * (this.time - this.lastKill > 1.6 ? 10 : 1.1),
    );
    if (this.time >= SURVIVAL_SECONDS && !this.boss) this.spawnEnemy(true);
    this.spawn -= dt;
    if (this.spawn <= 0 && this.enemies.length < 125) {
      this.spawnEnemy();
      this.spawn =
        Math.max(0.17, 0.95 - this.time * 0.002) / (1 + this.difficulty * 0.15);
    }
    for (let hand = 0; hand < 2; hand++) {
      this.cooldowns[hand] -= dt;
      if (this.cooldowns[hand] > 0) continue;
      const w = WEAPONS[this.save.weapons[hand]],
        level = this.save.levels[this.save.weapons[hand]];
      const target = this.enemies
        .filter((e) => !e.dead)
        .sort(
          (a, b) =>
            Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y),
        )[0];
      if (
        !target ||
        Math.hypot(target.x - p.x, target.y - p.y) > w.range + target.r
      )
        continue;
      const damage =
        w.damage *
        (1 + (level - 1) * 0.22 + this.save.skills[0] * 0.15) *
        (1 + (this.rage / 100) * (0.35 + this.save.skills[2] * 0.12));
      p.attacks[hand] = {
        angle: Math.atan2(target.y - p.y, target.x - p.x),
        weapon: this.save.weapons[hand],
        life: 0.28,
        duration: 0.28,
      };
      this.cooldowns[hand] = w.delay / (1 + this.rage / 200);
      if (this.save.weapons[hand] === "dumbbell") {
        const angle = Math.atan2(target.y - p.y, target.x - p.x);
        this.effects.push({
          x: p.x,
          y: p.y,
          color: w.color,
          size: 90,
          life: 0.22,
          max: 0.22,
          kind: "swing",
          seed: angle,
          hand,
        });
        for (const e of [...this.enemies])
          if (
            !e.dead &&
            Math.hypot(e.x - p.x, e.y - p.y) < 100 + e.r &&
            Math.cos(Math.atan2(e.y - p.y, e.x - p.x) - angle) > 0.1
          )
            this.hit(
              e,
              damage,
              this.save.talents[hand],
              this.save.weapons[hand],
            );
      } else {
        const angle = Math.atan2(target.y - p.y, target.x - p.x),
          shaker = this.save.weapons[hand] === "shaker";
        this.shots.push({
          x: p.x + (hand ? 14 : -14),
          y: p.y,
          vx: Math.cos(angle) * 330,
          vy: Math.sin(angle) * 330,
          life: 1.25,
          damage,
          talents: this.save.talents[hand],
          shaker,
          angle: 0,
          hit: new Set(),
        });
      }
      this.emit("attack", this.save.weapons[hand]);
    }
    for (const s of this.shots) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      s.angle += dt * 18;
      for (const e of [...this.enemies])
        if (
          !e.dead &&
          !s.hit.has(e) &&
          Math.hypot(s.x - e.x, s.y - e.y) < e.r + 10
        ) {
          s.hit.add(e);
          this.hit(e, s.damage, s.talents, s.shaker ? "shaker" : "plate", {
            x: s.x - s.vx,
            y: s.y - s.vy,
          });
          if (s.shaker) {
            for (const other of [...this.enemies])
              if (other !== e && Math.hypot(other.x - e.x, other.y - e.y) < 65)
                this.hit(other, s.damage * 0.6, s.talents, "shaker", s);
            this.fx(s.x, s.y, "#b6ee77", 65, "ring");
            s.life = 0;
            break;
          }
        }
    }
    for (const e of this.enemies) {
      if (e.dead) continue;
      const oldX = e.x,
        oldY = e.y;
      e.moving = false;
      e.flash = Math.max(0, e.flash - dt);
      e.impact = Math.max(0, e.impact - dt);
      e.x = clamp(e.x + e.recoilX * dt, e.r, WIDTH - e.r);
      e.y = clamp(e.y + e.recoilY * dt, e.r, HEIGHT - e.r);
      e.recoilX *= Math.exp(-dt * 18);
      e.recoilY *= Math.exp(-dt * 18);
      for (const k of ["slow", "fragile", "burn"])
        e[k] = Math.max(0, e[k] - dt);
      if (e.burn > 0) {
        e.hp -= dt * 10;
        if (e.hp <= 0) {
          this.kill(e);
          continue;
        }
      }
      e.attack -= dt;
      if (e.attack <= 0 && (e.boss || e.type === 2)) {
        e.attack = e.boss ? 4 : 7;
        e.warning = 0.9;
        e.targetX = p.x;
        e.targetY = p.y;
      }
      if (e.warning > 0) {
        e.warning -= dt;
        if (e.warning <= 0) {
          if (e.boss) {
            this.fx(e.x, e.y, "#ff897e", 145, "ring");
            if (Math.hypot(p.x - e.x, p.y - e.y) < 145) this.hurt(23);
          } else {
            const a = Math.atan2(e.targetY - e.y, e.targetX - e.x);
            e.charge = 0.48;
            e.cx = Math.cos(a);
            e.cy = Math.sin(a);
          }
        }
        continue;
      }
      let dx = p.x - e.x,
        dy = p.y - e.y,
        dist = Math.hypot(dx, dy) || 1;
      const move =
        e.speed *
        (1 + (this.difficulty - 1) * 0.12) *
        (e.slow > 0 ? 0.5 : 1) *
        dt;
      if (e.charge > 0) {
        e.charge -= dt;
        e.x = clamp(e.x + e.cx * 250 * dt, e.r, WIDTH - e.r);
        e.y = clamp(e.y + e.cy * 250 * dt, e.r, HEIGHT - e.r);
      } else {
        e.x += (dx / dist) * move;
        e.y += (dy / dist) * move;
      }
      trackMotion(e, oldX, oldY);
      if (dist < e.r + 16) this.hurt(e.boss ? 22 : e.type === 2 ? 16 : 9);
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.shots = this.shots.filter((s) => s.life > 0);
    for (const list of [this.effects, this.drops, this.texts]) {
      for (const e of list) e.life -= dt;
    }
    this.effects = this.effects.filter((e) => e.life > 0);
    this.drops = this.drops.filter((e) => e.life > 0);
    this.texts = this.texts.filter((e) => e.life > 0);
  }
  hurt(damage) {
    const p = this.player;
    if (p.inv > 0 || this.ended) return;
    p.hp = Math.max(0, p.hp - damage);
    p.inv = 0.75;
    this.fx(p.x, p.y, "#ff897e", 35, "ring");
    this.shake = 3;
    this.emit("hurt");
    if (p.hp <= 0) this.finish(false);
  }
}
