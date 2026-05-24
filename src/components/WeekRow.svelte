<script>
  import { addDays, fmtRange } from '../lib/dates.js';
  import DayCell from './DayCell.svelte';

  const DAY_KEYS = ["mon","tue","wed","thu","fri","sat","sun"];

  let { weekN, phase, weekStart, sessions, progress, today, onDayClick } = $props();
  let weekEnd = $derived(addDays(weekStart, 6));
</script>

<div class="week" style="--phase-c:{phase.color}">
  <div class="week-label">
    <span class="wk">Week</span>
    <span class="wn">{weekN}</span>
    <span class="wd">{fmtRange(weekStart, weekEnd)}</span>
  </div>
  {#each DAY_KEYS as dKey, i}
    {@const date = addDays(weekStart, i)}
    <DayCell
      {weekN}
      {dKey}
      {date}
      session={sessions[dKey]}
      logged={progress.workouts[weekN + '-' + dKey] || null}
      isToday={date.getFullYear()===today.getFullYear() && date.getMonth()===today.getMonth() && date.getDate()===today.getDate()}
      isPast={date < today}
      onClick={() => onDayClick(weekN, dKey, date, sessions[dKey], phase)}
    />
  {/each}
</div>
