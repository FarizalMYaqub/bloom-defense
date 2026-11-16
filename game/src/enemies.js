// The bugs: what each kind is, and how one walks the garden path.
// Pure data and movement; the world owns the list and calls update on each bug.

import { ENEMIES, HP_PER_WAVE, PATH, SPEED_PER_WAVE } from './config.js';

export function enemyStats(key, wave) {
  const def = ENEMIES[key];
  return {
    key,
    hp: Math.round(def.hp * (1 + HP_PER_WAVE * (wave - 1))),
    speed: def.speed * (1 + Math.min(0.3, SPEED_PER_WAVE * (wave - 1))),
    gold: def.gold,
    lives: def.lives,
    radius: def.radius,
  };
}

/**
 * Make a bug at the start of the path. `offset` staggers bugs that spawn together so they do
 * not sit exactly on top of each other.
 */
export function createEnemy(key, wave, random, offset) {
  const stats = enemyStats(key, wave);
  return {
    key,
    active: true,
    x: PATH[0].x - offset,
    y: PATH[0].y,
    waypoint: 1,
    hp: stats.hp,
    maxHp: stats.hp,
    speed: stats.speed,
    gold: stats.gold,
    lives: stats.lives,
    radius: stats.radius,
    slowUntil: 0,
    slowFactor: 0,
    wobble: random() * Math.PI * 2,
    flash: 0,
  };
}

/** Walk one bug toward its next waypoint. Returns true when it reaches the hive. */
export function updateEnemy(enemy, dt, now) {
  if (enemy.flash > 0) enemy.flash = Math.max(0, enemy.flash - dt);
  const slowed = now < enemy.slowUntil;
  const speed = enemy.speed * (slowed ? 1 - enemy.slowFactor : 1);
  let remaining = speed * dt;
  while (remaining > 0) {
    const target = PATH[enemy.waypoint];
    if (!target) return true;
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= remaining) {
      enemy.x = target.x;
      enemy.y = target.y;
      enemy.waypoint += 1;
      remaining -= dist;
      if (enemy.waypoint >= PATH.length) return true;
    } else {
      enemy.x += (dx / dist) * remaining;
      enemy.y += (dy / dist) * remaining;
      remaining = 0;
    }
  }
  return false;
}

/** Distance along the path, for targeting the bug furthest ahead. */
export function pathProgress(enemy) {
  let total = 0;
  for (let i = 1; i < enemy.waypoint; i += 1) {
    total += Math.hypot(PATH[i].x - PATH[i - 1].x, PATH[i].y - PATH[i - 1].y);
  }
  const prev = PATH[enemy.waypoint - 1];
  total += Math.hypot(enemy.x - prev.x, enemy.y - prev.y);
  return total;
}
