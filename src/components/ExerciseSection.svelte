<script>
  import { untrack } from 'svelte';
  import { iconFor } from '../lib/icons.js';
  import { timerState, startTimer, cancelTimer } from '../lib/timer.svelte.js';

  let { exKey, name, plannedArr, prefillVal, onSave, onSkip, restSeconds = 90, disabled = false, onDisabledClick } = $props();

  function guard(action) {
    if (disabled) { onDisabledClick?.(); return; }
    action();
  }

  const plannedSets = untrack(() => plannedArr[0]);
  const plannedReps = untrack(() => plannedArr[1]);
  const icon = $derived(iconFor(name));

  let inputs = $state(
    Array.from({ length: plannedSets }, (_, i) =>
      Array.isArray(prefillVal) ? (prefillVal[i] ?? plannedReps) : plannedReps
    )
  );

  const timerActive = $derived(timerState.active && timerState.exKey === exKey);
  const timerPct    = $derived(timerActive && timerState.duration > 0 ? (timerState.seconds / timerState.duration) * 100 : 0);
  const timerLabel  = $derived(
    timerActive
      ? Math.floor(timerState.seconds / 60) + ':' + String(timerState.seconds % 60).padStart(2, '0')
      : ''
  );

  function gestureAction(node, idx) {
    const onWheel = e => {
      e.preventDefault();
      inputs[idx] = Math.max(0, Math.min(99, inputs[idx] + (e.deltaY < 0 ? 1 : -1)));
    };
    node.addEventListener('wheel', onWheel, { passive: false });

    let touchStartY, touchStartVal;
    const onTouchStart = e => {
      touchStartY   = e.touches[0].clientY;
      touchStartVal = inputs[idx];
    };
    const onTouchMove = e => {
      if (touchStartY === undefined) return;
      e.preventDefault();
      const delta = Math.round((touchStartY - e.touches[0].clientY) / 8);
      inputs[idx] = Math.max(0, Math.min(99, touchStartVal + delta));
    };
    const onTouchEnd = () => { touchStartY = undefined; };
    node.addEventListener('touchstart',  onTouchStart, { passive: true });
    node.addEventListener('touchmove',   onTouchMove,  { passive: false });
    node.addEventListener('touchend',    onTouchEnd,   { passive: true });
    node.addEventListener('touchcancel', onTouchEnd,   { passive: true });

    return {
      destroy() {
        node.removeEventListener('wheel',       onWheel);
        node.removeEventListener('touchstart',  onTouchStart);
        node.removeEventListener('touchmove',   onTouchMove);
        node.removeEventListener('touchend',    onTouchEnd);
        node.removeEventListener('touchcancel', onTouchEnd);
      }
    };
  }
</script>

<div class="log-ex-section" data-ex={exKey}>
  <div class="log-ex-header">
    {#if icon}
      <div class="log-ex-icon">{@html icon}</div>
    {/if}
    <span class="log-ex-name">{name}</span>
  </div>
  <div class="log-set-rows">
    <div class="log-set-row log-set-header">
      <span class="log-set-num">Set</span>
      <span class="log-set-col-head">Reps</span>
    </div>
    {#each inputs as _, i}
      <div class="log-set-row">
        <span class="log-set-num">{i + 1}</span>
        <input
          type="number"
          class="log-set-input"
          bind:value={inputs[i]}
          min="0"
          max="99"
          placeholder="—"
          use:gestureAction={i}
        />
      </div>
    {/each}
  </div>
  <div class="log-scroll-hint">↕ scroll · swipe · tap to type</div>
  <div class="log-ex-actions">
    <button class="log-ex-save" aria-disabled={disabled} onclick={() => guard(() => {
      const reps = inputs.filter(v => v > 0);
      if (reps.length) onSave(exKey, reps);
    })}>Save</button>
    <button class="log-ex-skip" aria-disabled={disabled} onclick={() => guard(() => onSkip(exKey))}>Skip</button>
    {#if timerActive}
      <div class="log-ex-timer-chip">
        <span class="log-ex-timer-label">{timerLabel}</span>
        <span class="log-ex-timer-sep">|</span>
        <button class="log-ex-timer-cancel" aria-label="Cancel rest timer" onclick={cancelTimer}>✕</button>
      </div>
    {:else}
      <button class="log-ex-rest" aria-disabled={disabled} onclick={() => guard(() => startTimer(exKey, restSeconds))}>⏱ Rest {Math.floor(restSeconds / 60)}:{String(restSeconds % 60).padStart(2, '0')}</button>
    {/if}
  </div>
  {#if timerActive}
    <div class="log-ex-timer-bar-track">
      <div class="log-ex-timer-bar" style="width: {timerPct}%"></div>
    </div>
  {/if}
</div>
