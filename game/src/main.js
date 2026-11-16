// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is there.
// The game moves between six screens: title, how to play, play, paused, victory and game
// over. Clicks hit-test the same button rectangles the renderer draws, so a button is
// exactly where it looks.
//
// ?seed=N fixes the garden's randomness. ?shot=title|play|upgrade|victory (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, PLOTS, PLOT_RADIUS, STEP, TOWER_ORDER } from './config.js';
import { createRandom } from './random.js';
import {
  EVENT_BITE, EVENT_BUILD, EVENT_COIN, EVENT_ERROR, EVENT_HORN, EVENT_KILL,
  EVENT_LEAK, EVENT_LOSE, EVENT_SHOOT, EVENT_WAVE_CLEAR, EVENT_WIN, createWorld,
} from './world.js';
import {
  ACTION_CLICK, ACTION_CONFIRM, ACTION_PAUSE, ACTION_SELL, ACTION_SEND_WAVE, ACTION_SPEED,
  ACTION_UPGRADE, createInput,
} from './input.js';
import {
  SCREEN_HOWTO, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE,
  SCREEN_VICTORY, createRenderer,
} from './render.js';
import { stageShot } from './shots.js';
import { createAudio } from './audio.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();
const ui = { speed: 1, muted: false };

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  const best = Math.max(readBest(), scene.best);
  // A small handle for automated playtests (and curious players in devtools).
  window.__bloom = { world, ui, get screen() { return scene.screen; } };
  let painted = 0;
  function paint() {
    renderer.draw(world.state, world.particles, scene.screen, best, ui);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, (x, y) => renderer.toField(x, y));
  let screen = SCREEN_TITLE;
  // A small handle for automated playtests (and curious players in devtools).
  window.__bloom = { world, ui, get screen() { return screen; } };
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let lastShootSound = 0;
  let lastPopSound = 0;
  let lastZones = [];

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    audio.startMusic();
    world.reset();
    accumulator = 0;
    ui.speed = 1;
    screen = SCREEN_PLAY;
    announce(`Playing. ${world.state.lives} lives, ${world.state.gold} gold. Click a soil plot to plant a flower.`);
  }

  function finishGame(won) {
    screen = won ? SCREEN_VICTORY : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (won) {
      audio.win();
      announce(`Victory! All ten waves beaten. Score ${world.state.score}.`);
    } else {
      audio.lose();
      announce(`Game over on wave ${world.state.wave}. Score ${world.state.score}. Best ${best}.`);
    }
  }

  function handleEvents(events) {
    const now = performance.now();
    if (events & EVENT_SHOOT && now - lastShootSound > 90) {
      audio.shoot();
      lastShootSound = now;
    }
    if (events & EVENT_BITE) audio.bite();
    if (events & EVENT_KILL && now - lastPopSound > 120) {
      audio.pop();
      lastPopSound = now;
    }
    if (events & EVENT_COIN) audio.coin();
    if (events & EVENT_HORN) audio.horn();
    if (events & EVENT_LEAK) {
      audio.leak();
      announce(`A bug reached the hive! ${world.state.lives} lives left.`);
    }
    if (events & EVENT_WAVE_CLEAR && !(events & EVENT_WIN)) audio.coin();
    if (events & EVENT_BUILD) audio.build();
    if (events & EVENT_ERROR) audio.error();
    if (events & EVENT_WIN) finishGame(true);
    else if (events & EVENT_LOSE) finishGame(false);
  }

  function plotAt(point) {
    for (let i = 0; i < PLOTS.length; i += 1) {
      const dx = point.x - PLOTS[i].x;
      const dy = point.y - PLOTS[i].y;
      if (dx * dx + dy * dy <= (PLOT_RADIUS + 10) * (PLOT_RADIUS + 10)) return i;
    }
    return -1;
  }

  function clickZone(point) {
    for (let i = lastZones.length - 1; i >= 0; i -= 1) {
      const z = lastZones[i];
      if (point.x >= z.x && point.x <= z.x + z.w && point.y >= z.y && point.y <= z.y + z.h) return z.id;
    }
    return null;
  }

  function handleClick(point) {
    audio.unlock();
    const zone = clickZone(point);
    if (zone) {
      if (zone === 'play') { startGame(); return; }
      if (zone === 'howto') { screen = SCREEN_HOWTO; return; }
      if (zone === 'close-howto') { screen = SCREEN_TITLE; return; }
      if (zone === 'restart') { startGame(); return; }
      if (zone === 'menu') { world.reset(); screen = SCREEN_TITLE; return; }
      if (zone === 'resume') { screen = SCREEN_PLAY; return; }
      if (zone === 'pause') { screen = SCREEN_PAUSED; announce('Paused.'); return; }
      if (zone === 'mute') {
        ui.muted = !ui.muted;
        audio.setMuted(ui.muted);
        return;
      }
      if (zone === 'speed') { ui.speed = ui.speed === 1 ? 2 : 1; return; }
      if (zone === 'send') {
        const events = world.sendWave();
        handleEvents(events);
        return;
      }
      if (zone === 'close-menu') { world.state.selectedPlot = -1; return; }
      if (zone === 'upgrade') {
        handleEvents(world.upgradeTower(world.state.selectedPlot));
        return;
      }
      if (zone === 'sell') {
        handleEvents(world.sellTower(world.state.selectedPlot));
        return;
      }
      if (zone.startsWith('build:')) {
        const key = zone.slice(6);
        world.state.menuKey = key;
        handleEvents(world.buildTower(world.state.selectedPlot, key));
        return;
      }
    }
    if (screen !== SCREEN_PLAY) return;
    const plot = plotAt(point);
    if (plot >= 0) {
      world.state.selectedPlot = plot;
      if (!world.plotTower(plot)) world.state.menuKey = 'daisy';
    } else {
      world.state.selectedPlot = -1;
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    const towerKey = input.takeTowerKey();
    for (const click of input.takeClicks()) handleClick(click);

    if (screen === SCREEN_TITLE) {
      if (actions & (ACTION_CONFIRM | ACTION_CLICK)) startGame();
      return;
    }
    if (screen === SCREEN_HOWTO) {
      if (actions & (ACTION_CONFIRM | ACTION_CLICK | ACTION_PAUSE)) screen = SCREEN_TITLE;
      return;
    }
    if (screen === SCREEN_VICTORY || screen === SCREEN_OVER) {
      if (actions & (ACTION_CONFIRM | ACTION_CLICK)) startGame();
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
    // SCREEN_PLAY
    if (actions & ACTION_PAUSE) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      return;
    }
    if (actions & ACTION_SPEED) ui.speed = ui.speed === 1 ? 2 : 1;
    if (actions & (ACTION_SEND_WAVE | ACTION_CONFIRM)) handleEvents(world.sendWave());
    const selected = world.state.selectedPlot;
    if (towerKey !== null && selected >= 0 && !world.plotTower(selected)) {
      const key = TOWER_ORDER[towerKey - 1];
      world.state.menuKey = key;
      handleEvents(world.buildTower(selected, key));
    }
    if (towerKey !== null && selected >= 0) world.state.menuKey = TOWER_ORDER[towerKey - 1];
    if (actions & ACTION_UPGRADE && selected >= 0) handleEvents(world.upgradeTower(selected));
    if (actions & ACTION_SELL && selected >= 0) handleEvents(world.sellTower(selected));
  }

  function step() {
    const events = world.step(STEP);
    handleEvents(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME) * ui.speed;
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
      // The title screen's garden still breathes: clouds drift, flowers sway.
      world.state.time += 1 / 60;
      world.particles.step(1 / 60);
    }
    lastZones = renderer.draw(world.state, world.particles, screen, best, ui);
  }

  // Leaving the tab pauses a running game rather than letting bugs march unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Bloom Defense. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
