// Keyboard and pointer input. One-shot presses (confirm, pause, hotkeys, clicks) are queued
// as bit flags and taken once by the loop, so a press between two frames is never lost and
// never counted twice. Pointer clicks arrive with their position in field coordinates, via
// the `toField` converter the renderer supplies.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_SEND_WAVE = 4;
export const ACTION_SPEED = 8;
export const ACTION_UPGRADE = 16;
export const ACTION_SELL = 32;
/** A pointer tap: starts the game on the title/end screens, but never sends a wave. */
export const ACTION_CLICK = 64;

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(target, toField) {
  let actions = 0;
  let towerKey = null; // '1'..'5' pressed since last take
  const clicks = [];

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (event.code === 'KeyF') {
      if (!event.repeat) actions |= ACTION_SPEED;
    } else if (event.code === 'KeyU') {
      if (!event.repeat) actions |= ACTION_UPGRADE;
    } else if (event.code === 'KeyS') {
      if (!event.repeat) actions |= ACTION_SELL;
    } else if (event.code === 'KeyW') {
      if (!event.repeat) actions |= ACTION_SEND_WAVE;
    } else if (event.code.startsWith('Digit')) {
      const n = Number(event.code.slice(5));
      if (n >= 1 && n <= 5 && !event.repeat) towerKey = n;
    } else {
      return;
    }
    event.preventDefault();
  });

  target.addEventListener('pointerdown', (event) => {
    const rect = target.getBoundingClientRect();
    const point = toField(event.clientX - rect.left, event.clientY - rect.top);
    clicks.push(point);
    actions |= ACTION_CLICK;
  });

  return {
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The tower hotkey (1..5) pressed since the last call, or null. */
    takeTowerKey() {
      const taken = towerKey;
      towerKey = null;
      return taken;
    },
    /** Click positions (field coordinates) since the last call. */
    takeClicks() {
      return clicks.splice(0, clicks.length);
    },
  };
}
