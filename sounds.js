let ctx = null;
let enabled = true;
try { enabled = localStorage.getItem("sfa-sound") !== "off"; } catch {}

export function soundEnabled() {
  return enabled;
}

export function setSoundEnabled(on) {
  enabled = on;
  try { localStorage.setItem("sfa-sound", on ? "on" : "off"); } catch {}
  if (on) resumeAudio();
}

export function resumeAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
  } catch {}
}

function tone(freqs, { duration = 0.18, type = "sine", gain = 0.05, stagger = 0.07 } = {}) {
  if (!enabled || !ctx || ctx.state !== "running") return;
  const now = ctx.currentTime;
  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = f;
    const start = now + i * stagger;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(g).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  });
}

export const sounds = {
  join: () => tone([523.25, 783.99]),
  leave: () => tone([392.0, 261.63]),
  streamStart: () => tone([440, 660, 880], { gain: 0.045, stagger: 0.06 }),
  streamStop: () => tone([660, 392.0], { gain: 0.04 })
};
