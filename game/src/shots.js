// The screenshot scenes behind ?shot=title|play|upgrade|victory. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by the same greedy
// builder a decent player would use (spend gold on the plan, upgrade, send the wave), so the
// frame is what a real game looks like and the same seed always gives the same frame.

import { STEP } from './config.js';
import { EVENT_HORN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY } from './render.js';

/** Cap on simulated seconds per scene, so a shot can never hang the page. */
const LIMIT_SECONDS = 1500;

function stepUntil(world, seconds, done) {
  const steps = Math.min(LIMIT_SECONDS, seconds) / STEP;
  for (let i = 0; i < steps; i += 1) {
    world.step(STEP);
    if (done && done()) break;
  }
}

/** A lively title backdrop: a few flowers planted and the first bugs already on the path. */
function stageTitle(world) {
  world.reset();
  world.state.gold = 9999;
  world.buildTower(1, 'daisy');
  world.buildTower(2, 'daisy');
  world.buildTower(6, 'sunflower');
  world.buildTower(3, 'rose');
  world.state.gold = 150;
  world.sendWave();
  stepUntil(world, 7, null);
  return { screen: SCREEN_TITLE, best: 0 };
}

/** Mid-wave action: two waves cleared, towers firing on wave 3. */
function stagePlay(world) {
  world.reset();
  world.state.gold = 650;
  world.autoBuild();
  world.sendWave();
  stepUntil(world, 60, () => world.state.phase === 'build' && world.state.wave >= 1);
  world.autoBuild();
  world.sendWave();
  stepUntil(world, 60, () => world.state.phase === 'build' && world.state.wave >= 2);
  world.autoBuild();
  world.sendWave();
  stepUntil(world, 9, null);
  return { screen: SCREEN_PLAY, best: world.state.score };
}

/** The upgrade panel open on a level-2 Sunflower, mid-wave. */
function stageUpgrade(world) {
  world.reset();
  world.state.gold = 650;
  world.autoBuild();
  world.sendWave();
  stepUntil(world, 8, null);
  // Make sure plot 6 holds a level-2 Sunflower and open its panel.
  const slot = world.state.towers[6];
  if (!slot.tower) {
    world.state.gold = Math.max(world.state.gold, 300);
    world.buildTower(6, 'sunflower');
  }
  if (slot.tower && slot.tower.level < 2) {
    world.state.gold = Math.max(world.state.gold, 200);
    world.upgradeTower(6);
  }
  world.state.selectedPlot = 6;
  return { screen: SCREEN_PLAY, best: world.state.score };
}

/** Play the whole campaign with the greedy builder. Falls back to a staged victory board
 *  only if the builder loses — the frame is still a real render of the victory screen. */
function stageVictory(world) {
  world.reset();
  world.state.gold = 650;
  let guard = 0;
  while (world.state.phase !== 'won' && world.state.phase !== 'lost' && guard < 12) {
    guard += 1;
    world.autoBuild();
    const sent = world.sendWave();
    if (!(sent & EVENT_HORN)) break;
    stepUntil(world, LIMIT_SECONDS, () => world.state.phase !== 'wave');
  }
  if (world.state.phase !== 'won') {
    world.state.phase = 'won';
    world.state.wave = 10;
    world.state.lives = Math.max(1, world.state.lives);
    world.state.enemies = [];
  }
  return { screen: SCREEN_VICTORY, best: world.state.score };
}

/**
 * Set `world` to the named scene (title, play, upgrade or victory; any other name is title)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  if (name === 'play') return stagePlay(world);
  if (name === 'upgrade') return stageUpgrade(world);
  if (name === 'victory') return stageVictory(world);
  return stageTitle(world);
}

export { SCREEN_OVER };
