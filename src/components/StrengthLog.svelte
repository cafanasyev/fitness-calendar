<script>
  import { untrack } from 'svelte';
  import { canSave, buildActual, applyEditAll } from '../lib/workout-state.js';
  import { iconFor } from '../lib/icons.js';
  import ExerciseSection from './ExerciseSection.svelte';

  let { weekN, dKey, exKey, ex, crEx, effectivePlanWeek, logged, onSaved, disabled = false, onDisabledClick } = $props();

  function guard(action) {
    if (disabled) { onDisabledClick?.(); return; }
    action();
  }

  // exState tracks which exercises have been saved in this session
  let exState = $state({});
  // view: 'form' | 'done' | 'skipped'
  let view = $state(
    untrack(() =>
      logged?.status === 'done' && logged?.actual ? 'done'
      : logged?.status === 'skipped' ? 'skipped'
      : 'form'
    )
  );

  // Pre-fill exState if we're editing an already-logged workout
  untrack(() => {
    if (view !== 'form') applyEditAll(exState, logged?.actual || null, exKey);
  });

  function handleSave(key, reps) {
    exState[key] = reps;
    if (canSave(exState, exKey)) {
      const actual = buildActual(exState, exKey);
      onSaved(weekN, dKey, 'done', actual);
    }
  }

  function handleSkip(key) {
    exState[key] = 'skipped';
    if (canSave(exState, exKey)) {
      const actual = buildActual(exState, exKey);
      onSaved(weekN, dKey, 'done', actual);
    }
  }

  function handleEdit() {
    exState = {};
    view = 'form';
  }

  function collapsedBadge(key) {
    const val = exState[key];
    if (val === 'skipped') return { badge: 'skipped', detail: '' };
    if (Array.isArray(val)) return { badge: 'done', detail: val.join(' / ') };
    return null;
  }

  const crName = 'Crunches';
</script>

<div id="log-wrapper">
  {#if view === 'form'}
    {#if exKey in exState}
      {@const c = collapsedBadge(exKey)}
      <div class="log-ex-section" data-ex={exKey}>
        <div class="log-ex-header">
          {#if iconFor(ex.name)}<div class="log-ex-icon">{@html iconFor(ex.name)}</div>{/if}
          <span class="log-ex-name">{ex.name}</span>
        </div>
        <div class="log-ex-done">
          <span class="log-badge-{c.badge}">{c.badge}</span>
          {#if c.detail}<span class="log-ex-reps">{c.detail}</span>{/if}
          <button class="log-ex-edit" onclick={() => { delete exState[exKey]; exState = { ...exState }; }}>edit</button>
        </div>
      </div>
    {:else}
      <ExerciseSection
        {exKey}
        name={ex.name}
        plannedArr={effectivePlanWeek[exKey]}
        prefillVal={null}
        onSave={handleSave}
        onSkip={handleSkip}
        restSeconds={ex.restSeconds}
        {disabled}
        {onDisabledClick}
      />
    {/if}
    <hr class="log-ex-sep" />
    {#if 'cr' in exState}
      {@const c = collapsedBadge('cr')}
      <div class="log-ex-section" data-ex="cr">
        <div class="log-ex-header">
          {#if iconFor(crName)}<div class="log-ex-icon">{@html iconFor(crName)}</div>{/if}
          <span class="log-ex-name">{crName}</span>
        </div>
        <div class="log-ex-done">
          <span class="log-badge-{c.badge}">{c.badge}</span>
          {#if c.detail}<span class="log-ex-reps">{c.detail}</span>{/if}
          <button class="log-ex-edit" onclick={() => { delete exState.cr; exState = { ...exState }; }}>edit</button>
        </div>
      </div>
    {:else}
      <ExerciseSection
        exKey="cr"
        name={crName}
        plannedArr={effectivePlanWeek.cr}
        prefillVal={null}
        onSave={handleSave}
        onSkip={handleSkip}
        restSeconds={crEx.restSeconds}
        {disabled}
        {onDisabledClick}
      />
    {/if}

  {:else}
    {#if logged?.status === 'skipped' && !logged?.actual}
      <div class="log-section">
        <span class="log-status">Logged: Skipped</span>
        <button class="log-edit" aria-disabled={disabled} onclick={() => guard(handleEdit)}>Edit</button>
      </div>
    {:else}
      {@const a = logged?.actual || {}}
      <div class="log-section">
        <div class="log-ex-done-row">
          {#if iconFor(ex.name)}<div class="log-ex-icon-sm">{@html iconFor(ex.name)}</div>{/if}
          <span class="log-ex-name-sm">{ex.name}</span>
          <span class="log-ex-reps">{Array.isArray(a[exKey]) ? a[exKey].join(' / ') : 'skipped'}</span>
        </div>
        <div class="log-ex-done-row">
          {#if iconFor(crName)}<div class="log-ex-icon-sm">{@html iconFor(crName)}</div>{/if}
          <span class="log-ex-name-sm">{crName}</span>
          <span class="log-ex-reps">{Array.isArray(a.cr) ? a.cr.join(' / ') : 'skipped'}</span>
        </div>
        <button class="log-edit" aria-disabled={disabled} onclick={() => guard(handleEdit)}>Edit</button>
      </div>
    {/if}
  {/if}
</div>
