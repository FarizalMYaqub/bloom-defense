// All sound is synthesized with WebAudio: no audio files, no network.
// Short oscillator blips for shots and coins, a horn for a new wave, jingles for win/lose,
// and a gentle pentatonic arpeggio that loops under the game.

export function createAudio() {
  let context = null;
  let master = null;
  let musicTimer = null;
  let muted = false;
  let musicOn = false;

  /** Must be called from a user gesture at least once; safe to call any time. */
  function unlock() {
    if (context) {
      if (context.state === 'suspended') context.resume().catch(() => {});
      return;
    }
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      context = new Ctor();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
    } catch {
      context = null;
    }
  }

  function tone(freq, duration, type, volume, when, slideTo) {
    if (!context || muted) return;
    const t0 = context.currentTime + (when || 0);
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume || 0.15, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  function shoot() {
    tone(720 + Math.random() * 120, 0.09, 'triangle', 0.08, 0, 420);
  }
  function bite() {
    tone(180, 0.12, 'sawtooth', 0.12, 0, 90);
  }
  function pop() {
    tone(340, 0.12, 'sine', 0.16, 0, 90);
    tone(520, 0.08, 'sine', 0.1, 0.05, 700);
  }
  function coin() {
    tone(988, 0.09, 'sine', 0.12);
    tone(1319, 0.16, 'sine', 0.12, 0.07);
  }
  function error() {
    tone(160, 0.15, 'square', 0.08, 0, 110);
  }
  function build() {
    tone(523, 0.1, 'triangle', 0.14);
    tone(659, 0.1, 'triangle', 0.14, 0.09);
    tone(784, 0.18, 'triangle', 0.14, 0.18);
  }
  function horn() {
    tone(392, 0.35, 'sawtooth', 0.1);
    tone(523, 0.35, 'sawtooth', 0.1, 0.02);
    tone(659, 0.4, 'sawtooth', 0.1, 0.05);
  }
  function leak() {
    tone(220, 0.25, 'sawtooth', 0.16, 0, 110);
    tone(165, 0.3, 'sawtooth', 0.14, 0.12, 82);
  }
  function win() {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((n, i) => tone(n, 0.35, 'triangle', 0.16, i * 0.13));
  }
  function lose() {
    const notes = [392, 370, 349, 311];
    notes.forEach((n, i) => tone(n, 0.4, 'triangle', 0.14, i * 0.18));
  }

  // A slow C-major pentatonic arpeggio: one soft note every 0.42 s, cycling a fixed pattern.
  const MELODY = [523, 587, 659, 784, 880, 784, 659, 587];
  let melodyIndex = 0;
  function startMusic() {
    if (musicOn || !context) return;
    musicOn = true;
    musicTimer = window.setInterval(() => {
      if (muted || !context) return;
      const note = MELODY[melodyIndex % MELODY.length];
      melodyIndex += 1;
      tone(note, 0.5, 'sine', 0.045);
      if (melodyIndex % 4 === 0) tone(note / 2, 0.9, 'sine', 0.03);
    }, 420);
  }
  function stopMusic() {
    musicOn = false;
    if (musicTimer !== null) {
      window.clearInterval(musicTimer);
      musicTimer = null;
    }
  }

  function setMuted(value) {
    muted = value;
    if (master) master.gain.value = muted ? 0 : 0.5;
  }

  return {
    unlock, shoot, bite, pop, coin, error, build, horn, leak, win, lose,
    startMusic, stopMusic, setMuted,
    get muted() { return muted; },
  };
}
