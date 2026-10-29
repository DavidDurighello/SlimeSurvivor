// All sounds are synthesized locally: no downloads, trackers, or audio assets.
export class Sound {
  constructor() {
    this.muted = false;
    this.last = 0;
  }
  unlock() {
    if (!this.ctx) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (Context) this.ctx = new Context();
    }
    this.ctx?.resume().catch(() => {});
  }
  play(kind) {
    if (this.muted || !this.ctx || this.ctx.state !== "running") return;
    const c = this.ctx,
      t = c.currentTime;
    if (kind === "attack" && t - this.last < 0.1) return;
    this.last = t;
    const o = c.createOscillator(),
      g = c.createGain();
    o.connect(g);
    g.connect(c.destination);
    const freq =
      kind === "hurt"
        ? 95
        : kind === "special"
          ? 55
          : kind === "dash"
            ? 330
            : kind === "kill"
              ? 150
              : 220;
    o.type = "sine";
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(
      kind === "dash" ? 70 : 35,
      t + 0.16,
    );
    g.gain.setValueAtTime(kind === "special" ? 0.22 : 0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.start(t);
    o.stop(t + 0.21);
    if (kind === "kill" || kind === "special") {
      const duration = kind === "special" ? 0.35 : 0.09,
        buffer = c.createBuffer(1, c.sampleRate * duration, c.sampleRate),
        data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++)
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
      const n = c.createBufferSource(),
        filter = c.createBiquadFilter(),
        ng = c.createGain();
      n.buffer = buffer;
      filter.type = "lowpass";
      filter.frequency.value = 650;
      ng.gain.value = 0.12;
      n.connect(filter);
      filter.connect(ng);
      ng.connect(c.destination);
      n.start();
    }
  }
}
