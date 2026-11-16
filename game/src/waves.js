// What each wave sends down the path, and the bonus for clearing it.
// A wave is a list of groups; each group spawns its bugs one at a time, `gap` seconds apart,
// and the next group starts `delay` seconds after the previous group finished.

export const WAVE_BONUS_BASE = 30;
export const WAVE_BONUS_PER_WAVE = 15;

export function waveBonus(wave) {
  return WAVE_BONUS_BASE + WAVE_BONUS_PER_WAVE * wave;
}

/** Groups for wave `n` (1..10). Order inside a wave is the spawn order. */
export function waveComposition(n) {
  switch (n) {
    case 1:
      return [{ type: 'aphid', count: 8, gap: 1.1, delay: 0 }];
    case 2:
      return [
        { type: 'aphid', count: 12, gap: 0.9, delay: 0 },
        { type: 'caterpillar', count: 3, gap: 1.4, delay: 2 },
      ];
    case 3:
      return [
        { type: 'aphid', count: 10, gap: 0.8, delay: 0 },
        { type: 'caterpillar', count: 6, gap: 1.1, delay: 2 },
        { type: 'beetle', count: 2, gap: 2.0, delay: 2 },
      ];
    case 4:
      return [
        { type: 'aphid', count: 14, gap: 0.7, delay: 0 },
        { type: 'caterpillar', count: 8, gap: 1.0, delay: 2 },
        { type: 'beetle', count: 4, gap: 1.6, delay: 2 },
      ];
    case 5:
      return [
        { type: 'caterpillar', count: 10, gap: 0.9, delay: 0 },
        { type: 'beetle', count: 6, gap: 1.4, delay: 2 },
        { type: 'snail', count: 2, gap: 3.0, delay: 2 },
      ];
    case 6:
      return [
        { type: 'aphid', count: 16, gap: 0.6, delay: 0 },
        { type: 'caterpillar', count: 10, gap: 0.9, delay: 2 },
        { type: 'beetle', count: 8, gap: 1.3, delay: 2 },
        { type: 'snail', count: 3, gap: 2.5, delay: 2 },
      ];
    case 7:
      return [
        { type: 'beetle', count: 10, gap: 1.1, delay: 0 },
        { type: 'snail', count: 5, gap: 2.2, delay: 2 },
        { type: 'caterpillar', count: 12, gap: 0.8, delay: 2 },
      ];
    case 8:
      return [
        { type: 'snail', count: 8, gap: 2.0, delay: 0 },
        { type: 'beetle', count: 12, gap: 1.0, delay: 2 },
        { type: 'aphid', count: 20, gap: 0.5, delay: 2 },
      ];
    case 9:
      return [
        { type: 'snail', count: 10, gap: 1.8, delay: 0 },
        { type: 'beetle', count: 14, gap: 0.9, delay: 2 },
        { type: 'caterpillar', count: 14, gap: 0.7, delay: 2 },
        { type: 'aphid', count: 16, gap: 0.5, delay: 2 },
      ];
    default: // wave 10: the Locust King, with an escort before and after him.
      return [
        { type: 'snail', count: 4, gap: 2.0, delay: 0 },
        { type: 'beetle', count: 6, gap: 1.2, delay: 2 },
        { type: 'locust', count: 1, gap: 1.0, delay: 3 },
        { type: 'caterpillar', count: 8, gap: 0.8, delay: 2 },
      ];
  }
}

/** Total bugs in a wave, for the wave progress display. */
export function waveTotal(n) {
  return waveComposition(n).reduce((sum, group) => sum + group.count, 0);
}
