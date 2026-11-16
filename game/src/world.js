// The game's rules and state, with no drawing and no browser in it: the garden plots, the
// flower towers, the bugs on the path, projectiles, gold, lives and the ten waves. step()
// advances one fixed step and returns what happened as bit flags, so the caller can react
// (sounds, announcements) without the world knowing about screens or sound.

import {
  ENEMIES, HIVE, MAX_WAVE, PLOTS, PLOT_RADIUS, POOL_PROJECTILES,
  START_GOLD, START_LIVES, TOWERS,
} from './config.js';
import { createEnemy, pathProgress, updateEnemy } from './enemies.js';
import { sellValue, towerStats, upgradeCost } from './towers.js';
import { waveBonus, waveComposition, waveTotal } from './waves.js';
import { createParticles } from './particles.js';

export const EVENT_SHOOT = 1;
export const EVENT_KILL = 2;
export const EVENT_COIN = 4;
export const EVENT_LEAK = 8;
export const EVENT_WAVE_CLEAR = 16;
export const EVENT_WIN = 32;
export const EVENT_LOSE = 64;
export const EVENT_BUILD = 128;
export const EVENT_ERROR = 256;
export const EVENT_HORN = 512;
export const EVENT_BITE = 1024;

/** Plot order the autopilot (and the "best spot" hint) prefers: plots between two path runs first. */
export const PLOT_PRIORITY = [1, 2, 6, 7, 3, 8, 0, 5, 11, 12, 4, 9, 10, 13];

/** What the autopilot builds on each priority plot, in order, before it starts upgrading. */
export const AUTO_BUILD_PLAN = [
  'daisy', 'daisy', 'sunflower', 'daisy', 'rose', 'sunflower', 'daisy', 'lavender',
  'flytrap', 'rose', 'sunflower', 'daisy', 'flytrap', 'lavender',
];

function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function createWorld(random) {
  const particles = createParticles(random);
  const projectiles = [];
  for (let i = 0; i < POOL_PROJECTILES; i += 1) {
    projectiles.push({ active: false, x: 0, y: 0, tx: 0, ty: 0, target: null, damage: 0, splash: 0, speed: 400, color: '#fff', radius: 4 });
  }
  const state = {
    gold: START_GOLD,
    lives: START_LIVES,
    wave: 0,
    phase: 'build', // 'build' | 'wave' | 'won' | 'lost'
    score: 0,
    kills: 0,
    leaks: 0,
    time: 0,
    enemies: [],
    towers: PLOTS.map((p) => ({ plot: p, tower: null })),
    projectiles,
    spawnQueue: [],
    spawnClock: 0,
    spawned: 0,
    waveKills: 0,
    selectedPlot: -1,
    menuKey: 'daisy',
    banner: null,
    hiveFlash: 0,
  };

  function reset() {
    state.gold = START_GOLD;
    state.lives = START_LIVES;
    state.wave = 0;
    state.phase = 'build';
    state.score = 0;
    state.kills = 0;
    state.leaks = 0;
    state.time = 0;
    state.enemies = [];
    for (const slot of state.towers) slot.tower = null;
    for (const p of projectiles) { p.active = false; p.target = null; }
    state.spawnQueue = [];
    state.spawnClock = 0;
    state.spawned = 0;
    state.waveKills = 0;
    state.selectedPlot = -1;
    state.menuKey = 'daisy';
    state.banner = null;
    state.hiveFlash = 0;
    particles.reset();
  }

  function setBanner(text, sub, seconds) {
    state.banner = { text, sub: sub || '', timer: seconds || 2.2 };
  }

  function plotTower(plotIndex) {
    return state.towers[plotIndex].tower;
  }

  function canAfford(cost) {
    return state.gold >= cost;
  }

  function buildTower(plotIndex, key) {
    const slot = state.towers[plotIndex];
    if (!slot || slot.tower) return EVENT_ERROR;
    const def = TOWERS[key];
    if (!def) return EVENT_ERROR;
    if (!canAfford(def.cost)) return EVENT_ERROR;
    state.gold -= def.cost;
    slot.tower = { key, level: 1, x: slot.plot.x, y: slot.plot.y, cooldown: 0, auraTimer: 0, shots: 0 };
    state.selectedPlot = plotIndex;
    return EVENT_BUILD;
  }

  function upgradeTower(plotIndex) {
    const tower = plotTower(plotIndex);
    if (!tower) return EVENT_ERROR;
    const cost = upgradeCost(tower.key, tower.level);
    if (cost === null || !canAfford(cost)) return EVENT_ERROR;
    state.gold -= cost;
    tower.level += 1;
    return EVENT_BUILD;
  }

  function sellTower(plotIndex) {
    const slot = state.towers[plotIndex];
    if (!slot || !slot.tower) return EVENT_ERROR;
    state.gold += sellValue(slot.tower);
    slot.tower = null;
    return EVENT_BUILD;
  }

  function sendWave() {
    if (state.phase !== 'build' || state.wave >= MAX_WAVE) return EVENT_ERROR;
    state.wave += 1;
    state.phase = 'wave';
    state.waveKills = 0;
    state.spawned = 0;
    state.spawnClock = 0;
    state.spawnQueue = [];
    let t = 0.5;
    for (const group of waveComposition(state.wave)) {
      t += group.delay;
      for (let i = 0; i < group.count; i += 1) {
        state.spawnQueue.push({ type: group.type, at: t });
        t += group.gap;
      }
    }
    state.selectedPlot = -1;
    return EVENT_HORN;
  }

  /** Greedy builder for the screenshot autopilot: spend gold on the plan, then upgrades. */
  function autoBuild() {
    let spent = true;
    while (spent) {
      spent = false;
      for (let i = 0; i < PLOT_PRIORITY.length; i += 1) {
        const plotIndex = PLOT_PRIORITY[i];
        if (plotTower(plotIndex)) continue;
        const key = AUTO_BUILD_PLAN[i];
        if (canAfford(TOWERS[key].cost)) {
          buildTower(plotIndex, key);
          spent = true;
          break;
        }
      }
      if (spent) continue;
      // Nothing left to build: upgrade the cheapest upgradeable tower.
      let best = null;
      let bestCost = Infinity;
      for (let i = 0; i < state.towers.length; i += 1) {
        const tower = state.towers[i].tower;
        if (!tower) continue;
        const cost = upgradeCost(tower.key, tower.level);
        if (cost !== null && cost < bestCost && canAfford(cost)) {
          best = i;
          bestCost = cost;
        }
      }
      if (best !== null) {
        upgradeTower(best);
        spent = true;
      }
    }
  }

  function freeProjectile() {
    for (let i = 0; i < projectiles.length; i += 1) if (!projectiles[i].active) return projectiles[i];
    return null;
  }

  function fireAt(tower, stats, target) {
    const p = freeProjectile();
    if (!p) return false;
    const def = TOWERS[tower.key];
    p.active = true;
    p.x = tower.x;
    p.y = tower.y - 14;
    p.target = target;
    p.tx = target.x;
    p.ty = target.y;
    p.damage = stats.damage;
    p.splash = stats.splash;
    p.speed = stats.projSpeed;
    p.color = def.petal;
    p.radius = tower.key === 'rose' ? 7 : 5;
    tower.shots += 1;
    return true;
  }

  function damageEnemy(enemy, damage, events) {
    enemy.hp -= damage;
    enemy.flash = 0.12;
    if (enemy.hp > 0) return events;
    enemy.active = false;
    state.kills += 1;
    state.waveKills += 1;
    state.gold += enemy.gold;
    state.score += 10 + enemy.gold;
    particles.petalBurst(enemy.x, enemy.y, ENEMIES[enemy.key].color);
    particles.goldFloater(enemy.x, enemy.y - 10, enemy.gold);
    return events | EVENT_KILL | EVENT_COIN;
  }

  function stepTowers(dt, events) {
    for (const slot of state.towers) {
      const tower = slot.tower;
      if (!tower) continue;
      const stats = towerStats(tower.key, tower.level);
      if (stats.aura) {
        tower.auraTimer -= dt;
        if (tower.auraTimer > 0) continue;
        tower.auraTimer = 0.5;
        let hitAny = false;
        for (const enemy of state.enemies) {
          if (!enemy.active) continue;
          if (dist(tower.x, tower.y, enemy.x, enemy.y) > stats.range) continue;
          enemy.slowUntil = state.time + 1.2;
          enemy.slowFactor = stats.slow;
          events = damageEnemy(enemy, stats.damage, events);
          hitAny = true;
        }
        if (hitAny) events |= EVENT_SHOOT;
        continue;
      }
      tower.cooldown -= dt;
      if (tower.cooldown > 0) continue;
      // Target the bug furthest along the path that is in range.
      let target = null;
      let bestProgress = -1;
      for (const enemy of state.enemies) {
        if (!enemy.active) continue;
        if (dist(tower.x, tower.y, enemy.x, enemy.y) > stats.range) continue;
        const progress = pathProgress(enemy);
        if (progress > bestProgress) {
          bestProgress = progress;
          target = enemy;
        }
      }
      if (!target) continue;
      if (fireAt(tower, stats, target)) {
        tower.cooldown = 1 / stats.rate;
        events |= EVENT_SHOOT;
        if (tower.key === 'flytrap') events |= EVENT_BITE;
      }
    }
    return events;
  }

  function stepProjectiles(dt, events) {
    for (const p of projectiles) {
      if (!p.active) continue;
      if (p.target && p.target.active) {
        p.tx = p.target.x;
        p.ty = p.target.y;
      }
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const d = Math.hypot(dx, dy);
      const stepLen = p.speed * dt;
      if (d <= Math.max(stepLen, 8)) {
        p.active = false;
        const hit = p.target && p.target.active && dist(p.tx, p.ty, p.target.x, p.target.y) < p.target.radius + 14;
        if (p.splash > 0) {
          particles.pollen(p.tx, p.ty, '#ff8fa3');
          for (const enemy of state.enemies) {
            if (!enemy.active) continue;
            if (dist(p.tx, p.ty, enemy.x, enemy.y) <= p.splash + enemy.radius) {
              events = damageEnemy(enemy, p.damage, events);
            }
          }
        } else if (hit) {
          particles.pollen(p.tx, p.ty, p.color);
          events = damageEnemy(p.target, p.damage, events);
        }
        p.target = null;
        continue;
      }
      p.x += (dx / d) * stepLen;
      p.y += (dy / d) * stepLen;
    }
    return events;
  }

  function stepSpawning(dt) {
    if (state.spawnQueue.length === 0) return;
    state.spawnClock += dt;
    while (state.spawnQueue.length > 0 && state.spawnQueue[0].at <= state.spawnClock) {
      const entry = state.spawnQueue.shift();
      const offset = (state.spawned % 3) * 26;
      state.enemies.push(createEnemy(entry.type, state.wave, random, offset));
      state.spawned += 1;
    }
  }

  function step(dt) {
    let events = 0;
    state.time += dt;
    if (state.banner) {
      state.banner.timer -= dt;
      if (state.banner.timer <= 0) state.banner = null;
    }
    if (state.hiveFlash > 0) state.hiveFlash = Math.max(0, state.hiveFlash - dt);
    particles.step(dt);
    if (state.phase === 'build') return events;
    if (state.phase !== 'wave') return events;

    stepSpawning(dt);
    events = stepTowers(dt, events);
    events = stepProjectiles(dt, events);

    for (const enemy of state.enemies) {
      if (!enemy.active) continue;
      if (updateEnemy(enemy, dt, state.time)) {
        enemy.active = false;
        state.lives -= enemy.lives;
        state.leaks += 1;
        state.hiveFlash = 0.5;
        particles.addShake(5);
        events |= EVENT_LEAK;
        if (state.lives <= 0) {
          state.lives = 0;
          state.phase = 'lost';
          return events | EVENT_LOSE;
        }
      }
    }
    state.enemies = state.enemies.filter((e) => e.active);

    if (state.spawnQueue.length === 0 && state.enemies.length === 0) {
      const bonus = waveBonus(state.wave);
      state.gold += bonus;
      state.score += bonus;
      if (state.wave >= MAX_WAVE) {
        state.phase = 'won';
        return events | EVENT_WAVE_CLEAR | EVENT_WIN;
      }
      setBanner(`Wave ${state.wave} clear!`, `Bonus +${bonus} gold — build, then send wave ${state.wave + 1}`, 2.6);
      state.phase = 'build';
      events |= EVENT_WAVE_CLEAR;
    }
    return events;
  }

  function waveProgress() {
    return { spawned: state.spawned, total: waveTotal(Math.max(1, state.wave)), left: state.enemies.length };
  }

  reset();
  return {
    state, particles, reset, buildTower, upgradeTower, sellTower, sendWave, autoBuild,
    step, plotTower, canAfford, waveProgress,
  };
}
