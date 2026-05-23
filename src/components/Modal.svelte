<script>
  import { untrack } from 'svelte';
  import WorkoutDetails from './WorkoutDetails.svelte';
  import StrengthLog from './StrengthLog.svelte';
  import JumpRopeLog from './JumpRopeLog.svelte';

  let { data, progress, currentUser, onClose, onSaved } = $props();

  const { weekN, dKey, dDate, session, phase, planWeek, effectivePlanWeek, exEntry, crEx, isFuture } = untrack(() => data);
  const exKey = exEntry ? exEntry[0] : null;
  const ex    = exEntry ? exEntry[1] : null;
  const isStrength = (session.tag || '').startsWith('strength') || session.tag === 'deload';

  const fullDay = dDate.toLocaleDateString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  const logged = $derived(progress.workouts[weekN + '-' + dKey] || null);

  let toast = $state(false);
  let toastTimer;
  function onDisabledClick() {
    toast = true;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast = false, 3000);
  }

  $effect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="scrim open" onclick={e => { if (e.target === e.currentTarget) onClose(); }}>
  <div class="modal" style="--phase-c:{phase.color}">
    <button class="x" aria-label="Close" onclick={onClose}>×</button>
    <div class="meta">
      <span class="pill" style="background:{phase.color}">Block {phase.n} · Week {weekN}</span>
      {fullDay}
    </div>
    <h2>{session.title}</h2>

    <WorkoutDetails
      {session}
      {phase}
      {weekN}
      {effectivePlanWeek}
      {exKey}
      {ex}
    />

    {#if session.note}
      <div class="note">{session.note}</div>
    {/if}

    {#if currentUser && isStrength && planWeek && !planWeek.test}
      <StrengthLog
        {weekN}
        {dKey}
        {exKey}
        {ex}
        {crEx}
        {effectivePlanWeek}
        {logged}
        {onSaved}
        disabled={isFuture}
        {onDisabledClick}
      />
    {/if}

    {#if currentUser && session.tag === 'car'}
      <JumpRopeLog
        {weekN}
        {dKey}
        {logged}
        {onSaved}
        disabled={isFuture}
        {onDisabledClick}
      />
    {/if}

    {#if toast}
      <div class="future-toast" role="status">
        This workout is in the future — logging opens on the day.
      </div>
    {/if}
  </div>
</div>

<style>
  .future-toast {
    position: absolute; bottom: 20px; left: 50%; translate: -50% 0;
    background: #333; color: #fff;
    padding: 10px 18px; border-radius: 8px;
    font-size: 13px; white-space: nowrap;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    animation: toast-in 0.2s ease;
    pointer-events: none;
  }
  @keyframes toast-in {
    from { opacity: 0; translate: -50% 8px; }
    to   { opacity: 1; translate: -50% 0; }
  }
</style>
