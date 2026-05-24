<script>
  let { weekN, dKey, logged, onSaved, disabled = false, onDisabledClick } = $props();

  const isDone    = $derived(logged?.status === 'done');
  const isSkipped = $derived(logged?.status === 'skipped');
  let editing = $state(false);

  function guard(action) {
    if (disabled) { onDisabledClick?.(); return; }
    action();
  }
</script>

<div id="log-wrapper">
  {#if (isDone || isSkipped) && !editing}
    <div class="log-section">
      <span class="log-status">Logged: {isDone ? 'Done' : 'Skipped'}</span>
      <button class="log-edit" aria-disabled={disabled} onclick={() => guard(() => { editing = true; })}>Edit</button>
    </div>
  {:else}
    <div class="log-section">
      <div class="log-actions">
        <button class="log-save" aria-disabled={disabled} onclick={() => guard(() => { editing = false; onSaved(weekN, dKey, 'done', null); })}>Done</button>
        <button class="log-skip" aria-disabled={disabled} onclick={() => guard(() => { editing = false; onSaved(weekN, dKey, 'skipped', null); })}>Skip</button>
      </div>
    </div>
  {/if}
</div>
