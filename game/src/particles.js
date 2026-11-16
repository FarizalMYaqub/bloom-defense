// Juice: petal bursts, pollen sparkles, floating gold text and the screen shake.
// Two fixed pools plus a small floater pool; nothing here allocates after boot.

import { POOL_FLOATERS, POOL_PARTICLES } from './config.js';

export function createParticles(random) {
  const parts = [];
  for (let i = 0; i < POOL_PARTICLES; i += 1) {
    parts.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 3, color: '#fff', gravity: 0, spin: 0, angle: 0 });
  }
  const floaters = [];
  for (let i = 0; i < POOL_FLOATERS; i += 1) {
    floaters.push({ active: false, x: 0, y: 0, life: 0, maxLife: 1, text: '', color: '#fff', size: 16 });
  }
  let shake = 0;

  function freePart() {
    for (let i = 0; i < parts.length; i += 1) if (!parts[i].active) return parts[i];
    return null;
  }
  function freeFloater() {
    for (let i = 0; i < floaters.length; i += 1) if (!floaters[i].active) return floaters[i];
    return null;
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const p = freePart();
      if (!p) return;
      const angle = random() * Math.PI * 2;
      const v = speed * (0.4 + random() * 0.8);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * v;
      p.vy = Math.sin(angle) * v - 30;
      p.life = 0.5 + random() * 0.5;
      p.maxLife = p.life;
      p.size = 3 + random() * 4;
      p.color = color;
      p.gravity = 160;
      p.spin = (random() - 0.5) * 10;
      p.angle = random() * Math.PI * 2;
    }
  }

  /** Petals on a kill, in the bug's own colour. */
  function petalBurst(x, y, color) {
    burst(x, y, color, 14, 130);
    burst(x, y, '#ffffff', 5, 90);
  }

  /** A soft puff of pollen where a shot lands. */
  function pollen(x, y, color) {
    burst(x, y, color, 3, 50);
  }

  function floater(x, y, text, color, size) {
    const f = freeFloater();
    if (!f) return;
    f.active = true;
    f.x = x;
    f.y = y;
    f.life = 1.1;
    f.maxLife = 1.1;
    f.text = text;
    f.color = color;
    f.size = size || 16;
  }

  function goldFloater(x, y, amount) {
    floater(x, y, `+${amount}g`, '#c98f04', 17);
  }

  function addShake(amount) {
    shake = Math.min(10, shake + amount);
  }

  function step(dt) {
    if (shake > 0) shake = Math.max(0, shake - dt * 26);
    for (let i = 0; i < parts.length; i += 1) {
      const p = parts[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
    }
    for (let i = 0; i < floaters.length; i += 1) {
      const f = floaters[i];
      if (!f.active) continue;
      f.life -= dt;
      if (f.life <= 0) {
        f.active = false;
        continue;
      }
      f.y -= 34 * dt;
    }
  }

  function reset() {
    for (const p of parts) p.active = false;
    for (const f of floaters) f.active = false;
    shake = 0;
  }

  return { parts, floaters, petalBurst, pollen, floater, goldFloater, addShake, step, reset, get shake() { return shake; } };
}
