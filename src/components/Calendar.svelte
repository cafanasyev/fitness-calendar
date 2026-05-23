<script>
  import { addDays } from '../lib/dates.js';
  import WeekRow from './WeekRow.svelte';

  let { plan, buildWeekSessions, progress, currentStart, today, phaseOf, onDayClick } = $props();
</script>

{#each plan as p}
  {@const phase = phaseOf(p.wk)}
  {@const prevPhase = p.wk > 1 ? phaseOf(p.wk - 1) : null}
  {#if !prevPhase || prevPhase.n !== phase.n}
    <div class="phase-banner" style="--phase-c:{phase.color}">
      <span class="num">Block {phase.n}</span>
      <h2>{phase.name}</h2>
      <span class="note">{phase.note}</span>
    </div>
  {/if}
  <WeekRow
    weekN={p.wk}
    {phase}
    weekStart={addDays(currentStart, (p.wk - 1) * 7)}
    sessions={buildWeekSessions(p.wk)}
    {progress}
    {today}
    {onDayClick}
  />
{/each}
