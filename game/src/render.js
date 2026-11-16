// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the sky colour.
// Everything is drawn with canvas shapes — no images, no emoji (headless fonts vary) — so a
// screenshot is always a real render of this code.

import { FIELD, FONT, HIVE, PALETTE, PATH, PATH_WIDTH, PLOTS, PLOT_RADIUS, TOWERS, TOWER_ORDER } from './config.js';
import { ENEMIES } from './config.js';
import { sellValue, towerStats, upgradeCost } from './towers.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_HOWTO = 'howto';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_VICTORY = 'victory';
export const SCREEN_OVER = 'over';

const HUD_H = 56;
const TAU = Math.PI * 2;

/** Fixed decorative speckles in the grass, so the lawn looks the same every visit. */
function mulberry32(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeDecor() {
  const rnd = mulberry32(20261117);
  const speckles = [];
  for (let i = 0; i < 110; i += 1) {
    speckles.push({ x: rnd() * FIELD.width, y: 70 + rnd() * (FIELD.height - 80), r: 2 + rnd() * 3, c: rnd() < 0.5 ? '#6fce4a' : '#4a9e27' });
  }
  const flowers = [];
  const colors = ['#ff8fa3', '#ffd94d', '#ffffff', '#c084fc', '#ff9f1c'];
  for (let i = 0; i < 26; i += 1) {
    flowers.push({ x: rnd() * FIELD.width, y: 70 + rnd() * (FIELD.height - 80), c: colors[i % colors.length], s: 3 + rnd() * 2 });
  }
  const clouds = [];
  for (let i = 0; i < 5; i += 1) {
    clouds.push({ x: rnd() * FIELD.width, y: 24 + rnd() * 70, s: 0.7 + rnd() * 0.7, v: 6 + rnd() * 8 });
  }
  return { speckles, flowers, clouds };
}

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const decor = makeDecor();
  const goldLabel = cachedLabel('Gold ');
  const livesLabel = cachedLabel('Lives ');
  const waveLabel = cachedLabel('Wave ');
  const scoreLabel = cachedLabel('Score ');
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function toField(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, rect.width);
    const scaleY = canvas.height / Math.max(1, rect.height);
    return {
      x: (clientX * scaleX - view.x) / view.scale,
      y: (clientY * scaleY - view.y) / view.scale,
    };
  }

  function text(value, x, y, size, color, align, weight) {
    const key = size + (weight || '');
    if (!fonts.has(key)) fonts.set(key, `${weight || ''} ${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.fillText(value, x, y);
  }

  function circle(x, y, r, color) {
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, r, 0, TAU);
    context.fill();
  }

  function roundRect(x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }

  // ---- garden ----

  function drawSky(state) {
    const grad = context.createLinearGradient(0, 0, 0, 220);
    grad.addColorStop(0, PALETTE.skyTop);
    grad.addColorStop(1, PALETTE.skyBottom);
    context.fillStyle = grad;
    context.fillRect(0, 0, FIELD.width, 220);
    // Sun with rays.
    const sx = 1120;
    const sy = 74;
    context.save();
    context.translate(sx, sy);
    context.fillStyle = PALETTE.sunCore;
    for (let i = 0; i < 12; i += 1) {
      context.rotate(TAU / 12);
      context.fillRect(34, -3, 18, 6);
    }
    context.restore();
    circle(sx, sy, 34, PALETTE.sun);
    circle(sx, sy, 26, PALETTE.sunCore);
    // Drifting clouds.
    for (const cloud of decor.clouds) {
      const cx = ((cloud.x + state.time * cloud.v) % (FIELD.width + 220)) - 110;
      context.fillStyle = PALETTE.cloud;
      circle(cx, cloud.y, 22 * cloud.s, PALETTE.cloud);
      circle(cx + 22 * cloud.s, cloud.y + 4, 17 * cloud.s, PALETTE.cloud);
      circle(cx - 22 * cloud.s, cloud.y + 5, 16 * cloud.s, PALETTE.cloud);
    }
  }

  function drawGrass() {
    context.fillStyle = PALETTE.grass;
    context.fillRect(0, 180, FIELD.width, FIELD.height - 180);
    context.fillStyle = PALETTE.grassLight;
    context.fillRect(0, 180, FIELD.width, 10);
    for (const s of decor.speckles) circle(s.x, s.y, s.r, s.c);
    for (const f of decor.flowers) {
      circle(f.x, f.y, f.s, f.c);
      circle(f.x, f.y, f.s * 0.4, '#fff8d6');
    }
  }

  function drawPath() {
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = PALETTE.pathEdge;
    context.lineWidth = PATH_WIDTH + 8;
    context.beginPath();
    context.moveTo(PATH[0].x, PATH[0].y);
    for (let i = 1; i < PATH.length; i += 1) context.lineTo(PATH[i].x, PATH[i].y);
    context.stroke();
    context.strokeStyle = PALETTE.path;
    context.lineWidth = PATH_WIDTH;
    context.stroke();
    // Pebbles along the path.
    context.fillStyle = 'rgba(120,72,32,0.35)';
    for (let i = 0; i < 40; i += 1) {
      const t = i / 39;
      const seg = Math.min(PATH.length - 2, Math.floor(t * (PATH.length - 1)));
      const local = t * (PATH.length - 1) - seg;
      const x = PATH[seg].x + (PATH[seg + 1].x - PATH[seg].x) * local + ((i * 37) % 29) - 14;
      const y = PATH[seg].y + (PATH[seg + 1].y - PATH[seg].y) * local + ((i * 53) % 25) - 12;
      circle(x, y, 2.5, 'rgba(120,72,32,0.35)');
    }
  }

  function drawHive(state) {
    const flash = state.hiveFlash > 0;
    context.save();
    context.translate(HIVE.x, HIVE.y);
    if (flash && Math.floor(state.hiveFlash * 12) % 2 === 0) context.globalAlpha = 0.55;
    context.fillStyle = PALETTE.hiveDark;
    context.fillRect(-34, -6, 68, 12);
    context.fillStyle = PALETTE.hive;
    context.beginPath();
    context.moveTo(-40, 34);
    context.lineTo(40, 34);
    context.lineTo(30, -30);
    context.quadraticCurveTo(0, -52, -30, -30);
    context.closePath();
    context.fill();
    context.strokeStyle = PALETTE.hiveDark;
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(-36, 12);
    context.lineTo(36, 12);
    context.moveTo(-32, -10);
    context.lineTo(32, -10);
    context.moveTo(-24, -26);
    context.lineTo(24, -26);
    context.stroke();
    context.fillStyle = '#5b3a00';
    context.beginPath();
    context.arc(0, 22, 7, 0, TAU);
    context.fill();
    context.restore();
    // Two bees circling the hive.
    for (let i = 0; i < 2; i += 1) {
      const a = state.time * 1.6 + i * Math.PI;
      const bx = HIVE.x + Math.cos(a) * 62;
      const by = HIVE.y - 30 + Math.sin(a * 1.7) * 22;
      circle(bx, by, 5, '#ffd94d');
      context.strokeStyle = '#5b3a00';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(bx - 2, by - 4);
      context.lineTo(bx + 2, by - 4);
      context.stroke();
      context.fillStyle = 'rgba(255,255,255,0.8)';
      context.beginPath();
      context.ellipse(bx - 2, by - 7, 4, 2.5, -0.5, 0, TAU);
      context.fill();
    }
  }

  function drawPlot(plot, selected, affordable) {
    context.fillStyle = PALETTE.soilEdge;
    circle(plot.x, plot.y, PLOT_RADIUS + 3, PALETTE.soilEdge);
    circle(plot.x, plot.y, PLOT_RADIUS, PALETTE.soil);
    context.fillStyle = 'rgba(0,0,0,0.18)';
    circle(plot.x - 8, plot.y - 6, 4, 'rgba(0,0,0,0.18)');
    circle(plot.x + 9, plot.y + 5, 5, 'rgba(0,0,0,0.18)');
    circle(plot.x + 4, plot.y - 10, 3, 'rgba(0,0,0,0.18)');
    if (selected) {
      context.strokeStyle = '#fff';
      context.lineWidth = 3;
      context.setLineDash([8, 6]);
      context.beginPath();
      context.arc(plot.x, plot.y, PLOT_RADIUS + 9, 0, TAU);
      context.stroke();
      context.setLineDash([]);
    } else if (affordable) {
      context.strokeStyle = 'rgba(255,255,255,0.65)';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(plot.x, plot.y, PLOT_RADIUS + 6, 0, TAU);
      context.stroke();
    }
  }

  // ---- flowers (towers) ----

  function drawFlowerHead(key, x, y, r, sway) {
    const def = TOWERS[key];
    context.save();
    context.translate(x, y);
    context.rotate(Math.sin(sway) * 0.08);
    if (key === 'flytrap') {
      // Open jaws, snapping shut on a timer.
      const open = 0.45 + Math.sin(sway * 2.2) * 0.25;
      context.fillStyle = def.petal;
      context.beginPath();
      context.moveTo(0, 0);
      context.arc(0, 0, r + 4, Math.PI + open, TAU - open);
      context.closePath();
      context.fill();
      context.beginPath();
      context.moveTo(0, 0);
      context.arc(0, 0, r + 4, -open, Math.PI - open);
      context.closePath();
      context.fill();
      context.fillStyle = def.core;
      for (let i = 0; i < 5; i += 1) {
        const a = -open + (i / 4) * open * 2;
        context.fillRect(Math.cos(a) * (r - 2) - 1.5, Math.sin(a) * (r - 2) - 4, 3, 8);
      }
      context.fillStyle = '#fff';
      circle(-r * 0.4, -r * 0.5, 2.5, '#fff');
      circle(r * 0.4, -r * 0.5, 2.5, '#fff');
      context.restore();
      return;
    }
    if (key === 'lavender') {
      context.fillStyle = def.petal;
      for (let i = -2; i <= 2; i += 1) {
        context.beginPath();
        context.ellipse(i * 5, -Math.abs(i) * 2 - 6, 4, 9 - Math.abs(i), 0, 0, TAU);
        context.fill();
      }
      context.fillStyle = def.core;
      circle(0, -2, 4, def.core);
      context.restore();
      return;
    }
    const petals = key === 'rose' ? 6 : key === 'sunflower' ? 12 : 8;
    context.fillStyle = def.petal;
    for (let i = 0; i < petals; i += 1) {
      const a = (i / petals) * TAU;
      context.beginPath();
      context.ellipse(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, r * 0.52, r * 0.3, a, 0, TAU);
      context.fill();
    }
    circle(0, 0, r * 0.52, def.color === '#ffffff' ? '#fff8d6' : def.color);
    context.fillStyle = def.core;
    circle(0, 0, r * 0.34, def.core);
    context.fillStyle = 'rgba(0,0,0,0.25)';
    circle(-r * 0.1, -r * 0.1, r * 0.07, 'rgba(0,0,0,0.25)');
    circle(r * 0.12, r * 0.08, r * 0.07, 'rgba(0,0,0,0.25)');
    context.restore();
  }

  function drawTower(tower, state, selected) {
    const stats = towerStats(tower.key, tower.level);
    const sway = state.time * 1.4 + tower.x * 0.01;
    // Stem and leaves.
    context.strokeStyle = '#2f9e44';
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(tower.x, tower.y + 8);
    context.quadraticCurveTo(tower.x + Math.sin(sway) * 4, tower.y - 8, tower.x, tower.y - 12);
    context.stroke();
    context.fillStyle = '#40c057';
    context.beginPath();
    context.ellipse(tower.x - 10, tower.y + 2, 8, 4, -0.5, 0, TAU);
    context.fill();
    context.beginPath();
    context.ellipse(tower.x + 10, tower.y + 4, 8, 4, 0.5, 0, TAU);
    context.fill();
    // The range ring shows only for the selected tower, so the lawn stays clean.
    if (selected) {
      context.strokeStyle = tower.key === 'lavender' ? 'rgba(151,117,250,0.5)' : 'rgba(255,255,255,0.5)';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(tower.x, tower.y - 6, stats.range, 0, TAU);
      context.stroke();
    }
    drawFlowerHead(tower.key, tower.x, tower.y - 16, 13 + tower.level * 2, sway);
    // Level pips.
    for (let i = 0; i < tower.level; i += 1) {
      circle(tower.x - 10 + i * 10, tower.y + 14, 3.5, '#ffd94d');
    }
    context.strokeStyle = '#b8860b';
    context.lineWidth = 1;
    for (let i = 0; i < tower.level; i += 1) {
      context.beginPath();
      context.arc(tower.x - 10 + i * 10, tower.y + 14, 3.5, 0, TAU);
      context.stroke();
    }
  }

  // ---- bugs ----

  function drawEnemy(enemy, state) {
    const def = ENEMIES[enemy.key];
    const wobble = Math.sin(state.time * 6 + enemy.wobble) * 2;
    const x = enemy.x;
    const y = enemy.y + wobble * 0.4;
    context.save();
    context.translate(x, y);
    if (enemy.flash > 0) context.globalAlpha = 0.6;
    // Legs.
    context.strokeStyle = def.dark;
    context.lineWidth = 2;
    for (let i = -1; i <= 1; i += 1) {
      context.beginPath();
      context.moveTo(i * 6, 0);
      context.lineTo(i * 8 + (i === 0 ? 0 : i * 3), 8);
      context.stroke();
      context.beginPath();
      context.moveTo(i * 6, 0);
      context.lineTo(i * 8 + (i === 0 ? 0 : i * 3), -8);
      context.stroke();
    }
    if (enemy.key === 'caterpillar') {
      for (let i = 0; i < 4; i += 1) circle(-12 + i * 8, Math.sin(state.time * 8 + i) * 1.5, 7, i % 2 ? def.color : '#c0eb75');
      circle(14, 0, 6, def.color);
    } else if (enemy.key === 'snail') {
      context.fillStyle = '#ffe8cc';
      context.beginPath();
      context.ellipse(0, 6, 16, 7, 0, 0, TAU);
      context.fill();
      circle(-2, -6, 11, def.color);
      context.strokeStyle = def.dark;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(-2, -6, 6, 0, TAU);
      context.stroke();
      circle(6, -14, 2, def.dark);
      circle(10, -13, 2, def.dark);
    } else if (enemy.key === 'locust') {
      context.fillStyle = def.color;
      context.beginPath();
      context.ellipse(0, 0, 22, 12, 0, 0, TAU);
      context.fill();
      context.fillStyle = 'rgba(255,255,255,0.5)';
      context.beginPath();
      context.ellipse(-6, -10, 16, 6, -0.4, 0, TAU);
      context.fill();
      context.beginPath();
      context.ellipse(4, -11, 16, 6, 0.3, 0, TAU);
      context.fill();
      circle(20, -3, 7, def.color);
      context.fillStyle = '#fff';
      circle(22, -5, 2.5, '#fff');
      context.fillStyle = '#ffd94d';
      context.beginPath();
      context.moveTo(16, 8);
      context.lineTo(20, 16);
      context.lineTo(22, 8);
      context.closePath();
      context.fill();
      context.fillStyle = '#ffd94d';
      context.beginPath();
      context.moveTo(-8, -14);
      context.lineTo(-4, -22);
      context.lineTo(0, -14);
      context.lineTo(4, -22);
      context.lineTo(8, -14);
      context.closePath();
      context.fill();
    } else {
      // Aphid / beetle: round body, head, antennae.
      circle(0, 0, enemy.radius, def.color);
      context.fillStyle = def.dark;
      circle(0, 0, enemy.radius * 0.55, def.dark);
      circle(enemy.radius * 0.55, -2, enemy.radius * 0.45, def.color);
      context.strokeStyle = def.dark;
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(enemy.radius * 0.6, -6);
      context.quadraticCurveTo(enemy.radius * 0.9, -12, enemy.radius * 0.7, -14);
      context.moveTo(enemy.radius * 0.9, -4);
      context.quadraticCurveTo(enemy.radius * 1.2, -9, enemy.radius * 1.1, -12);
      context.stroke();
      context.fillStyle = '#fff';
      circle(enemy.radius * 0.6, -4, 2, '#fff');
    }
    context.restore();
    // Slow ring.
    if (state.time < enemy.slowUntil) {
      context.strokeStyle = 'rgba(151,117,250,0.9)';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(x, y, enemy.radius + 4, 0, TAU);
      context.stroke();
    }
    // HP bar.
    if (enemy.hp < enemy.maxHp) {
      const w = Math.max(24, enemy.radius * 2);
      context.fillStyle = 'rgba(0,0,0,0.45)';
      context.fillRect(x - w / 2, y - enemy.radius - 12, w, 5);
      context.fillStyle = enemy.hp / enemy.maxHp > 0.5 ? '#69db7c' : enemy.hp / enemy.maxHp > 0.25 ? '#ffd94d' : '#ff6b6b';
      context.fillRect(x - w / 2, y - enemy.radius - 12, w * (enemy.hp / enemy.maxHp), 5);
    }
  }

  function drawProjectiles(state) {
    for (const p of state.projectiles) {
      if (!p.active) continue;
      context.save();
      context.translate(p.x, p.y);
      context.rotate(Math.atan2(p.ty - p.y, p.tx - p.x));
      context.fillStyle = p.color;
      context.beginPath();
      context.ellipse(0, 0, 7, 4, 0, 0, TAU);
      context.fill();
      context.fillStyle = '#fff';
      circle(-2, 0, 2, '#fff');
      context.restore();
    }
  }

  function drawParticles(fx) {
    for (const p of fx.parts) {
      if (!p.active) continue;
      context.save();
      context.globalAlpha = Math.max(0, p.life / p.maxLife);
      context.translate(p.x, p.y);
      context.rotate(p.angle);
      context.fillStyle = p.color;
      context.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      context.restore();
    }
    context.textAlign = 'center';
    for (const f of fx.floaters) {
      if (!f.active) continue;
      context.globalAlpha = Math.min(1, (f.life / f.maxLife) * 1.6);
      text(f.text, f.x, f.y, f.size, f.color, 'center', 'bold');
    }
    context.globalAlpha = 1;
  }

  // ---- HUD and buttons ----

  function button(id, x, y, w, h, label, enabled, accent) {
    context.fillStyle = enabled ? (accent || PALETTE.button) : '#c9c2a8';
    roundRect(x, y, w, h, 10);
    context.fill();
    context.strokeStyle = enabled ? PALETTE.buttonEdge : '#a8a184';
    context.lineWidth = 2;
    context.stroke();
    text(label, x + w / 2, y + h / 2 + 7, 19, enabled ? PALETTE.buttonText : '#7a7561', 'center', 'bold');
    return { id, x, y, w, h };
  }

  /**
   * Every clickable rectangle for the current screen, in field coordinates. The renderer
   * draws them and main.js hit-tests clicks against the same list, so they can never drift.
   */
  function layoutButtons(screen, state, ui) {
    const zones = [];
    if (screen === SCREEN_TITLE) {
      zones.push({ id: 'play', x: 490, y: 470, w: 300, h: 62 });
      zones.push({ id: 'howto', x: 530, y: 548, w: 220, h: 46 });
      return zones;
    }
    if (screen === SCREEN_HOWTO) {
      zones.push({ id: 'close-howto', x: 490, y: 560, w: 300, h: 54 });
      return zones;
    }
    if (screen === SCREEN_VICTORY || screen === SCREEN_OVER) {
      zones.push({ id: 'restart', x: 440, y: 440, w: 400, h: 58 });
      zones.push({ id: 'menu', x: 530, y: 572, w: 220, h: 44 });
      return zones;
    }
    if (screen === SCREEN_PAUSED) {
      zones.push({ id: 'resume', x: 490, y: 430, w: 300, h: 56 });
      zones.push({ id: 'restart', x: 490, y: 500, w: 300, h: 56 });
      return zones;
    }
    // Play screen HUD buttons (top right).
    zones.push({ id: 'send', x: 880, y: 8, w: 150, h: 40 });
    zones.push({ id: 'speed', x: 1040, y: 8, w: 70, h: 40 });
    zones.push({ id: 'pause', x: 1120, y: 8, w: 40, h: 40 });
    zones.push({ id: 'mute', x: 1170, y: 8, w: 40, h: 40 });
    // Build / tower menu, floating beside the selected plot.
    if (state.selectedPlot >= 0) {
      const slot = state.towers[state.selectedPlot];
      const plot = PLOTS[state.selectedPlot];
      if (slot.tower) {
        const mx = Math.min(FIELD.width - 440, Math.max(20, plot.x - 210));
        const my = plot.y < 420 ? plot.y + 44 : plot.y - 168;
        zones.push({ id: 'upgrade', x: mx + 20, y: my + 76, w: 180, h: 42 });
        zones.push({ id: 'sell', x: mx + 220, y: my + 76, w: 180, h: 42 });
        zones.push({ id: 'close-menu', x: mx + 396, y: my + 8, w: 30, h: 30 });
      } else {
        const mw = 560;
        const mh = 132;
        const mx = Math.min(FIELD.width - mw - 16, Math.max(16, plot.x - mw / 2));
        const my = plot.y < 400 ? plot.y + 44 : plot.y - mh - 44;
        for (let i = 0; i < TOWER_ORDER.length; i += 1) {
          zones.push({ id: 'build:' + TOWER_ORDER[i], x: mx + 12 + i * 108, y: my + 44, w: 100, h: 76 });
        }
        zones.push({ id: 'close-menu', x: mx + mw - 38, y: my + 8, w: 30, h: 30 });
      }
    }
    return zones;
  }

  function drawHud(state, ui, zones) {
    context.fillStyle = 'rgba(255,253,240,0.92)';
    context.fillRect(0, 0, FIELD.width, HUD_H);
    context.fillStyle = PALETTE.panelEdge;
    context.fillRect(0, HUD_H, FIELD.width, 3);
    context.textBaseline = 'alphabetic';
    // Gold.
    circle(30, 28, 11, PALETTE.gold);
    context.fillStyle = '#8a6d00';
    context.font = 'bold 20px ' + FONT;
    context.textAlign = 'center';
    context.fillText('g', 30, 35);
    text(goldLabel(state.gold), 48, 36, 24, '#8a6d00', 'left', 'bold');
    // Lives: one heart icon plus the count (20 tiny hearts merge into a squiggle).
    const hx = 185;
    context.fillStyle = PALETTE.heart;
    context.beginPath();
    context.arc(hx - 4, 26, 5, 0, TAU);
    context.arc(hx + 4, 26, 5, 0, TAU);
    context.moveTo(hx - 8, 28);
    context.lineTo(hx + 8, 28);
    context.lineTo(hx, 38);
    context.closePath();
    context.fill();
    text(livesLabel(state.lives), hx + 14, 36, 22, PALETTE.text, 'left', 'bold');
    text(waveLabel(state.wave === 0 ? '–' : state.wave) + ' / 10', 640, 36, 24, PALETTE.text, 'center', 'bold');
    text(scoreLabel(state.score), 748, 36, 22, PALETTE.muted, 'left');
    const sendZone = zones.find((z) => z.id === 'send');
    const waveRunning = state.phase === 'wave';
    button('send', sendZone.x, sendZone.y, sendZone.w, sendZone.h,
      waveRunning ? `Wave ${state.wave}…` : '▶ Send wave', !waveRunning, waveRunning ? '#c9c2a8' : '#69db7c');
    const speedZone = zones.find((z) => z.id === 'speed');
    button('speed', speedZone.x, speedZone.y, speedZone.w, speedZone.h, ui.speed === 2 ? '2×' : '1×', true);
    const pauseZone = zones.find((z) => z.id === 'pause');
    button('pause', pauseZone.x, pauseZone.y, pauseZone.w, pauseZone.h, 'II', true);
    const muteZone = zones.find((z) => z.id === 'mute');
    button('mute', muteZone.x, muteZone.y, muteZone.w, muteZone.h, ui.muted ? '✕' : '♪', true);
  }

  function drawBuildMenu(state, ui, zones) {
    const plotIndex = state.selectedPlot;
    if (plotIndex < 0) return;
    const slot = state.towers[plotIndex];
    const plot = PLOTS[plotIndex];
    context.textBaseline = 'alphabetic';
    if (slot.tower) {
      const tower = slot.tower;
      const stats = towerStats(tower.key, tower.level);
      const mx = Math.min(FIELD.width - 440, Math.max(20, plot.x - 210));
      const my = plot.y < 420 ? plot.y + 44 : plot.y - 168;
      context.fillStyle = PALETTE.panel;
      roundRect(mx, my, 420, 132, 14);
      context.fill();
      context.strokeStyle = PALETTE.panelEdge;
      context.lineWidth = 2;
      context.stroke();
      drawFlowerHead(tower.key, mx + 34, my + 40, 16, state.time);
      text(`${TOWERS[tower.key].name} — Lv ${tower.level}`, mx + 62, my + 34, 21, PALETTE.text, 'left', 'bold');
      text(`Damage ${Math.round(stats.damage)}  •  Range ${Math.round(stats.range)}  •  ${stats.rate.toFixed(1)}/s${stats.aura ? '  •  Slows ' + Math.round(stats.slow * 100) + '%' : ''}`, mx + 62, my + 58, 15, PALETTE.muted, 'left');
      const cost = upgradeCost(tower.key, tower.level);
      const upZone = zones.find((z) => z.id === 'upgrade');
      if (cost !== null) button('upgrade', upZone.x, upZone.y, upZone.w, upZone.h, `Upgrade ${cost}g [U]`, state.gold >= cost);
      else button('upgrade', upZone.x, upZone.y, upZone.w, upZone.h, 'Max level', false);
      const sellZone = zones.find((z) => z.id === 'sell');
      button('sell', sellZone.x, sellZone.y, sellZone.w, sellZone.h, `Sell +${sellValue(tower)}g [S]`, true, '#ffa94d');
      text('✕', mx + 411, my + 32, 20, PALETTE.muted, 'center', 'bold');
    } else {
      const mw = 560;
      const mh = 132;
      const mx = Math.min(FIELD.width - mw - 16, Math.max(16, plot.x - mw / 2));
      const my = plot.y < 400 ? plot.y + 44 : plot.y - mh - 44;
      context.fillStyle = PALETTE.panel;
      roundRect(mx, my, mw, mh, 14);
      context.fill();
      context.strokeStyle = PALETTE.panelEdge;
      context.lineWidth = 2;
      context.stroke();
      text('Plant a flower — click one, or press 1–5', mx + 16, my + 30, 19, PALETTE.text, 'left', 'bold');
      text('✕', mx + mw - 23, my + 30, 20, PALETTE.muted, 'center', 'bold');
      for (let i = 0; i < TOWER_ORDER.length; i += 1) {
        const key = TOWER_ORDER[i];
        const def = TOWERS[key];
        const zone = zones.find((z) => z.id === 'build:' + key);
        const afford = state.gold >= def.cost;
        const chosen = state.menuKey === key;
        context.fillStyle = chosen ? '#fff3bf' : afford ? '#ffffff' : '#efe9d6';
        roundRect(zone.x, zone.y, zone.w, zone.h, 10);
        context.fill();
        context.strokeStyle = chosen ? PALETTE.buttonEdge : '#d9cf9f';
        context.lineWidth = chosen ? 3 : 1.5;
        context.stroke();
        drawFlowerHead(key, zone.x + zone.w / 2, zone.y + 26, 13, state.time + i);
        text(def.name, zone.x + zone.w / 2, zone.y + 52, 14, PALETTE.text, 'center', 'bold');
        text(`${def.cost}g  [${i + 1}]`, zone.x + zone.w / 2, zone.y + 69, 13, afford ? '#8a6d00' : '#b08968', 'center');
      }
    }
  }

  function drawPanel(title, lines, prompt, zones, primaryId) {
    const width = 640;
    const height = 150 + lines.length * 34 + 70;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(43,58,30,0.45)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    roundRect(x, y, width, height, 18);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 3;
    context.stroke();
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 72, 46, PALETTE.text, 'center', 'bold');
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], FIELD.width / 2, y + 128 + i * 34, 21, PALETTE.muted, 'center');
    }
    if (primaryId) {
      const zone = zones.find((z) => z.id === primaryId);
      if (zone) button(primaryId, zone.x, zone.y, zone.w, zone.h, prompt, true, '#69db7c');
    } else {
      text(prompt, FIELD.width / 2, y + height - 36, 22, '#8a6d00', 'center', 'bold');
    }
  }

  function drawField(state, fx) {
    drawSky(state);
    drawGrass();
    drawPath();
    for (let i = 0; i < PLOTS.length; i += 1) {
      const occupied = state.towers[i].tower !== null;
      drawPlot(PLOTS[i], state.selectedPlot === i, !occupied && state.gold >= 50);
    }
    drawHive(state);
    for (let i = 0; i < state.towers.length; i += 1) {
      if (state.towers[i].tower) drawTower(state.towers[i].tower, state, state.selectedPlot === i);
    }
    for (const enemy of state.enemies) if (enemy.active) drawEnemy(enemy, state);
    drawProjectiles(state);
    drawParticles(fx);
  }

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, fx, screen, best, ui) {
    const zones = layoutButtons(screen, state, ui);
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const shake = fx.shake;
    const sx = shake > 0 ? (Math.random() - 0.5) * shake : 0;
    const sy = shake > 0 ? (Math.random() - 0.5) * shake : 0;
    context.setTransform(view.scale, 0, 0, view.scale, view.x + sx * view.scale, view.y + sy * view.scale);
    drawField(state, fx);
    if (screen === SCREEN_TITLE) {
      context.fillStyle = 'rgba(255,253,240,0.88)';
      roundRect(290, 150, 700, 300, 20);
      context.fill();
      context.strokeStyle = PALETTE.panelEdge;
      context.lineWidth = 3;
      context.stroke();
      drawFlowerHead('daisy', 330, 216, 26, state.time);
      drawFlowerHead('sunflower', 950, 216, 26, state.time + 2);
      text('Bloom Defense', FIELD.width / 2, 235, 58, PALETTE.text, 'center', 'bold');
      text('Plant flowers. Stop the bugs. Save the hive.', FIELD.width / 2, 290, 24, PALETTE.muted, 'center');
      text('10 waves • 5 flowers • 1 very hungry Locust King', FIELD.width / 2, 326, 22, PALETTE.muted, 'center');
      text('Best score: ' + best, FIELD.width / 2, 366, 20, '#8a6d00', 'center', 'bold');
      const playZone = zones.find((z) => z.id === 'play');
      button('play', playZone.x, playZone.y, playZone.w, playZone.h, '▶  Play', true, '#69db7c');
      const howZone = zones.find((z) => z.id === 'howto');
      button('howto', howZone.x, howZone.y, howZone.w, howZone.h, 'How to play', true);
      text('Click or press Space to start', FIELD.width / 2, 632, 18, 'rgba(255,255,255,0.9)', 'center');
      return zones;
    }
    if (screen === SCREEN_HOWTO) {
      drawPanel('How to play', [
        'Click a soil plot, then pick a flower to plant it.',
        'Flowers shoot bugs walking the dirt path to the hive.',
        'Bugs that reach the hive eat lives. Lose all 20 and the garden falls.',
        'Earn gold from every bug, plus a bonus for each wave cleared.',
        'Click a flower to upgrade it (max Lv 3) or sell it back for 70%.',
        'Keys: 1–5 plant • U upgrade • S sell • F speed • Space send wave • Esc pause',
      ], 'Got it!', zones, 'close-howto');
      return zones;
    }
    if (screen === SCREEN_PLAY) {
      drawHud(state, ui, zones);
      drawBuildMenu(state, ui, zones);
    }
    if (state.banner && screen === SCREEN_PLAY) {
      context.fillStyle = 'rgba(255,253,240,0.95)';
      roundRect(390, 76, 500, 64, 12);
      context.fill();
      context.strokeStyle = PALETTE.panelEdge;
      context.lineWidth = 2;
      context.stroke();
      text(state.banner.text, FIELD.width / 2, 104, 26, PALETTE.text, 'center', 'bold');
      text(state.banner.sub, FIELD.width / 2, 128, 16, PALETTE.muted, 'center');
    }
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The bugs are waiting. The flowers are not worried.'], 'Resume', zones, 'resume');
      const restartZone = zones.find((z) => z.id === 'restart');
      button('restart', restartZone.x, restartZone.y, restartZone.w, restartZone.h, 'Restart', true);
    } else if (screen === SCREEN_VICTORY) {
      drawPanel('Garden saved!', [
        `All 10 waves beaten — the hive is safe, the flowers are heroes.`,
        `Score ${state.score}  •  Bugs squashed ${state.kills}  •  Best ${best}`,
        `Wave bonus and bug gold earned you ${state.gold} gold to spare.`,
      ], 'Play again', zones, 'restart');
      const menuZone = zones.find((z) => z.id === 'menu');
      button('menu', menuZone.x, menuZone.y, menuZone.w, menuZone.h, 'Title screen', true);
    } else if (screen === SCREEN_OVER) {
      drawPanel('The garden fell…', [
        `The bugs reached the hive on wave ${state.wave}.`,
        `Score ${state.score}  •  Bugs squashed ${state.kills}  •  Best ${best}`,
        `Tip: plant Lavender near the path corners and upgrade your Daisies.`,
      ], 'Try again', zones, 'restart');
      const menuZone = zones.find((z) => z.id === 'menu');
      button('menu', menuZone.x, menuZone.y, menuZone.w, menuZone.h, 'Title screen', true);
    }
    return zones;
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toField, layoutButtons };
}
