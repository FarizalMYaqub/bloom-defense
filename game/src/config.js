// Every tuning number, colour and layout constant for Bloom Defense in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the window,
// so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const START_GOLD = 150;
export const START_LIVES = 20;
export const MAX_WAVE = 10;
export const SELL_REFUND = 0.7;

/** The winding dirt path the bugs march along, from the garden gate to the hive. */
export const PATH = [
  { x: -40, y: 140 },
  { x: 1050, y: 140 },
  { x: 1050, y: 360 },
  { x: 230, y: 360 },
  { x: 230, y: 580 },
  { x: 1150, y: 580 },
];
export const PATH_WIDTH = 44;
export const HIVE = { x: 1212, y: 580, radius: 46 };

/** Build plots: fixed soil patches in the grass. 14 of them, in three rows. */
export const PLOTS = [
  { x: 110, y: 240 }, { x: 400, y: 240 }, { x: 690, y: 240 }, { x: 900, y: 240 }, { x: 1160, y: 240 },
  { x: 110, y: 460 }, { x: 400, y: 460 }, { x: 690, y: 460 }, { x: 900, y: 460 }, { x: 1160, y: 460 },
  { x: 280, y: 665 }, { x: 560, y: 665 }, { x: 840, y: 665 }, { x: 1080, y: 665 },
];
export const PLOT_RADIUS = 26;

/**
 * The five flower towers. rate is shots per second; splash is the blast radius (0 = single
 * target); lavender is an aura instead of a shooter: every tick it hurts and slows everything
 * in range. upCost is the price of level 2 and level 3; level multipliers are below.
 */
export const TOWERS = {
  daisy: {
    key: 'daisy', name: 'Daisy', emoji: '🌼', cost: 50, range: 115, damage: 7, rate: 2.2,
    projSpeed: 540, splash: 0, aura: false, color: '#ffffff', petal: '#ffd94d', core: '#ff9f1c',
    upCost: [40, 60], blurb: 'Fast & cheap',
  },
  sunflower: {
    key: 'sunflower', name: 'Sunflower', emoji: '🌻', cost: 85, range: 210, damage: 16, rate: 0.85,
    projSpeed: 470, splash: 0, aura: false, color: '#ffd94d', petal: '#ffb703', core: '#7a4a00',
    upCost: [70, 100], blurb: 'Long range',
  },
  rose: {
    key: 'rose', name: 'Rose', emoji: '🌹', cost: 130, range: 135, damage: 12, rate: 0.75,
    projSpeed: 420, splash: 62, aura: false, color: '#ff5d8f', petal: '#e63956', core: '#7a1030',
    upCost: [105, 155], blurb: 'Splash damage',
  },
  flytrap: {
    key: 'flytrap', name: 'Venus Flytrap', emoji: '🪷', cost: 170, range: 95, damage: 55, rate: 0.45,
    projSpeed: 600, splash: 0, aura: false, color: '#7ee081', petal: '#2f9e44', core: '#d6336c',
    upCost: [135, 205], blurb: 'Huge bite',
  },
  lavender: {
    key: 'lavender', name: 'Lavender', emoji: '🪻', cost: 75, range: 125, damage: 4, rate: 2,
    projSpeed: 0, splash: 0, aura: true, color: '#b197fc', petal: '#9775fa', core: '#5f3dc4',
    upCost: [60, 90], blurb: 'Slows bugs',
  },
};
export const TOWER_ORDER = ['daisy', 'sunflower', 'rose', 'flytrap', 'lavender'];
/** Per-level multipliers: [level 1, level 2, level 3]. */
export const LEVEL_MULT = {
  damage: [1, 1.7, 2.6],
  range: [1, 1.12, 1.25],
  rate: [1, 1.15, 1.35],
  slow: [0.45, 0.55, 0.65],
};

/** The five bugs. hp scales with the wave; speed creeps up slightly too. */
export const ENEMIES = {
  aphid: { key: 'aphid', name: 'Aphid', hp: 32, speed: 58, gold: 6, lives: 1, radius: 11, color: '#8ce99a', dark: '#2f9e44' },
  caterpillar: { key: 'caterpillar', name: 'Caterpillar', hp: 85, speed: 40, gold: 9, lives: 1, radius: 14, color: '#a9e34b', dark: '#5c940d' },
  beetle: { key: 'beetle', name: 'Beetle', hp: 200, speed: 30, gold: 15, lives: 2, radius: 16, color: '#748ffc', dark: '#364fc7' },
  snail: { key: 'snail', name: 'Snail', hp: 520, speed: 17, gold: 22, lives: 3, radius: 18, color: '#ffa94d', dark: '#d9480f' },
  locust: { key: 'locust', name: 'Locust King', hp: 4200, speed: 22, gold: 250, lives: 10, radius: 27, color: '#da77f2', dark: '#862e9c' },
};
export const HP_PER_WAVE = 0.2;
export const SPEED_PER_WAVE = 0.02;

export const PALETTE = {
  backdrop: '#7ec8e3',
  skyTop: '#8fd3f4',
  skyBottom: '#c9ecff',
  sun: '#ffd94d',
  sunCore: '#ffb703',
  cloud: 'rgba(255,255,255,0.92)',
  grassLight: '#7ed957',
  grass: '#5cb531',
  grassDark: '#4a9e27',
  path: '#d9a066',
  pathEdge: '#b97f45',
  soil: '#8a5a33',
  soilEdge: '#6b4423',
  hive: '#f2b705',
  hiveDark: '#c98f04',
  panel: 'rgba(255,253,240,0.97)',
  panelEdge: '#e0c98f',
  text: '#2b3a1e',
  muted: '#6b7a5a',
  gold: '#f2b705',
  heart: '#e63956',
  button: '#ffb703',
  buttonEdge: '#d48806',
  buttonText: '#4a2c00',
  danger: '#e63956',
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'bloom-defense.best';

/** Projectile and particle pool sizes; allocated once at boot. */
export const POOL_PROJECTILES = 96;
export const POOL_PARTICLES = 256;
export const POOL_FLOATERS = 32;
export const POOL_ENEMIES = 64;
