import { signal } from '@preact/signals';

/**
 * Monotonic tick that advances every TICK_INTERVAL_MS so subscribers
 * (currently SaveStatus' relative-time pill) re-render on a fixed cadence
 * without spawning a per-component setInterval.
 *
 * The tick value is just `Date.now()` — components that read it will see
 * an updated wall-clock and recompute "Saved Xs ago" accordingly.
 */
export const nowTick = signal<number>(Date.now());

const TICK_INTERVAL_MS = 10_000;

let started = false;

export function startNowTick(): void {
  if (started || typeof setInterval === 'undefined') return;
  started = true;
  setInterval(() => {
    nowTick.value = Date.now();
  }, TICK_INTERVAL_MS);
}
