<script>
  import { iconFor } from '../lib/icons.js';

  let { session, phase, weekN, effectivePlanWeek, exKey, ex } = $props();

  const isStrengthWithPlan = $derived(effectivePlanWeek != null && exKey != null);
</script>

{#if isStrengthWithPlan}
  {@const [puS, puR] = effectivePlanWeek[exKey]}
  {@const [crS, crR] = effectivePlanWeek.cr}
  <div class="plan-hint">
    {ex.name} {puS}×{puR} · Crunches {crS}×{crR}
  </div>
{:else if session.details && session.details.length}
  <ol style="margin-top:14px">
    {#each session.details as [name, prescription]}
      {@const icon = iconFor(name)}
      <li>
        {#if icon}
          <div class="ex-icon">{@html icon}</div>
        {:else}
          <div class="ex-icon empty"></div>
        {/if}
        <div class="ex-row">
          <div class="ex-n">{name}</div>
          {#if prescription}
            <div class="ex-p">{prescription}</div>
          {/if}
        </div>
      </li>
    {/each}
  </ol>
{/if}
