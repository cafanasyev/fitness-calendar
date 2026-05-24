<script>
  import { toISO } from '../lib/dates.js';

  let {
    currentUser,
    currentStart,
    phases,
    devToday,
    onStartChange,
    signIn,
    signOut,
    onTodayClick,
    onDevTodayChange,
  } = $props();
</script>

<header>
  <div>
    <h1>6-Month Bodyweight Program</h1>
    <div class="sub">Push-ups · Pull-ups · Squats · Crunches · Jump rope</div>
  </div>
  <div class="controls">
    <div class="legend">
      {#each phases as p}
        <span><span class="swatch" style="background:{p.color}"></span>B{p.n}</span>
      {/each}
    </div>
    <div class="start-picker">
      <label for="startDate">Week 1 Mon</label>
      <input
        type="date"
        id="startDate"
        value={toISO(currentStart)}
        onchange={e => onStartChange(e.target.value)}
      />
    </div>
    <button onclick={onTodayClick}>Today</button>
    <div class="auth-control">
      {#if currentUser}
        <div class="auth-user">
          {#if currentUser.photoURL && /^https:\/\//.test(currentUser.photoURL)}
            <img src={currentUser.photoURL} alt="" />
          {/if}
          <span>{currentUser.displayName || currentUser.email || ''}</span>
          <button onclick={signOut}>Sign out</button>
        </div>
      {:else}
        <button onclick={signIn} class="sign-in-google">
          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Sign in with Google
        </button>
      {/if}
    </div>
  </div>
</header>

{#if location.hostname === 'localhost'}
  <div id="dev-today">
    <label for="devTodayInput">Dev today</label>
    <input
      type="date"
      id="devTodayInput"
      value={devToday}
      onchange={e => onDevTodayChange(e.target.value)}
    />
  </div>
{/if}
