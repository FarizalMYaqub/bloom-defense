// Stats for one tower type at one level, and the economy around building it.
// Pure numbers, no drawing and no browser in here.

import { LEVEL_MULT, SELL_REFUND, TOWERS } from './config.js';

export function towerStats(key, level) {
  const def = TOWERS[key];
  const i = level - 1;
  return {
    key,
    level,
    range: def.range * LEVEL_MULT.range[i],
    damage: def.damage * LEVEL_MULT.damage[i],
    rate: def.rate * LEVEL_MULT.rate[i],
    splash: def.splash,
    aura: def.aura,
    slow: def.aura ? LEVEL_MULT.slow[i] : 0,
    projSpeed: def.projSpeed,
  };
}

export function upgradeCost(key, level) {
  // level is the level being upgraded FROM (1 -> 2, 2 -> 3).
  if (level >= 3) return null;
  return TOWERS[key].upCost[level - 1];
}

/** Gold spent on a tower so far (base + upgrades bought), for the sell refund. */
export function investedGold(tower) {
  let total = TOWERS[tower.key].cost;
  for (let level = 1; level < tower.level; level += 1) total += TOWERS[tower.key].upCost[level - 1];
  return total;
}

export function sellValue(tower) {
  return Math.floor(investedGold(tower) * SELL_REFUND);
}
