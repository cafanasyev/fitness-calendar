<script>
  import { fmtDayDate } from '../lib/dates.js';

  const DAY_NAMES = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };

  let { weekN, dKey, date, session, logged, isToday, isPast, onClick } = $props();

  function tagLabel(t) {
    if (!t) return "";
    if (t.startsWith("strength")) return "Workout";
    if (t === "mob")    return "Walk";
    if (t === "car")    return "Jump rope";
    if (t === "rest")   return "Rest";
    if (t === "test")   return "Test";
    if (t === "deload") return "Easy week";
    return t;
  }

  let tagClass = $derived(session?.tag && !session.tag.startsWith("strength") ? session.tag : "");
</script>

<div
  class="day"
  class:today={isToday}
  class:past={isPast}
  class:logged-done={logged?.status === 'done'}
  class:logged-skipped={logged?.status === 'skipped'}
  onclick={onClick}
  role="button"
  tabindex="0"
  onkeydown={e => e.key === 'Enter' && onClick()}
>
  <div class="head">
    <span class="dn">{DAY_NAMES[dKey]}</span>
    <span class="dd">{fmtDayDate(date)}</span>
  </div>
  <span class="tag {tagClass}">{tagLabel(session?.tag)}</span>
  <div class="ttl">{session?.title ?? ''}</div>
  {#if session?.summary}
    <div class="sum">{session.summary}</div>
  {/if}
</div>
