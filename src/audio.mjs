// Locally synthesized sounds. Per-event limits keep large hordes comfortable.
export class Sound {
  constructor() {
    this.muted = false;
    this.last = new Map();
  }
  unlock() {
    if (!this.ctx) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (Context) this.ctx = new Context();
    }
    this.ctx?.resume().catch(() => {});
  }
  tone(frequency, end, duration, gain, type = "sine", offset = 0) {
    const c = this.ctx,
      t = c.currentTime + offset,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(frequency, t);
    o.frequency.exponentialRampToValueAtTime(end, t + duration);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + duration + 0.01);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  noise(duration, frequency, gain) {
    const c = this.ctx,
      t = c.currentTime,
      buffer = c.createBuffer(
        1,
        Math.ceil(c.sampleRate * duration),
        c.sampleRate,
      ),
      data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
    const n = c.createBufferSource(),
      f = c.createBiquadFilter(),
      g = c.createGain();
    n.buffer = buffer;
    f.type = "lowpass";
    f.frequency.value = frequency;
    g.gain.value = gain;
    n.connect(f);
    f.connect(g);
    g.connect(c.destination);
    n.start();
    n.onended = () => {
      n.disconnect();
      f.disconnect();
      g.disconnect();
    };
  }
  play(kind, weapon = "dumbbell") {
    if (this.muted || !this.ctx || this.ctx.state !== "running") return;
    const t = this.ctx.currentTime,
      limit = kind === "impact" ? 0.055 : kind === "attack" ? 0.09 : 0.06;
    if (t - (this.last.get(kind) ?? -10) < limit) return;
    this.last.set(kind, t);
    if (kind === "attack") {
      if (weapon === "plate") this.tone(540, 210, 0.11, 0.025, "triangle");
      else if (weapon === "shaker") this.noise(0.09, 1500, 0.035);
      else this.tone(120, 55, 0.08, 0.035);
    } else if (kind === "impact") {
      this.noise(
        0.085,
        weapon === "plate" ? 1900 : weapon === "shaker" ? 900 : 450,
        0.07,
      );
      this.tone(
        weapon === "dumbbell" ? 105 : 230,
        38,
        0.13,
        weapon === "dumbbell" ? 0.1 : 0.06,
      );
    } else if (kind === "kill") {
      this.tone(210, 48, 0.14, 0.065);
      this.noise(0.12, 700, 0.08);
    } else if (kind === "special") {
      this.tone(75, 30, 0.3, 0.15);
      this.noise(0.3, 1300, 0.1);
    } else if (kind === "hurt") this.tone(110, 45, 0.18, 0.1, "triangle");
    else if (kind === "dash") {
      this.noise(0.13, 2200, 0.06);
      this.tone(330, 70, 0.15, 0.04);
    } else if (kind === "streak" || kind === "win") {
      [330, 440, 660].forEach((n, i) =>
        this.tone(n, n * 1.05, 0.18, 0.04, "sine", i * 0.075),
      );
    } else if (kind === "lose") this.tone(180, 65, 0.35, 0.07, "triangle");
  }
}
