let state = $state({ exKey: null, seconds: 0, duration: 0, active: false });
let _interval = null;
let _audioCtx = null;

function getAudioCtx() {
  if (!_audioCtx || _audioCtx.state === 'closed') _audioCtx = new AudioContext();
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

function playDone() {
  const ctx = getAudioCtx();
  [523, 659, 784].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    const t = ctx.currentTime + i * 0.2;
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.start(t);
    osc.stop(t + 0.15);
  });
}

export function startTimer(exKey, duration = 90) {
  cancelTimer();
  state.exKey = exKey;
  state.seconds = duration;
  state.duration = duration;
  state.active = true;
  _interval = setInterval(() => {
    if (state.seconds > 0) state.seconds--;
    if (state.seconds <= 0) {
      playDone();
      cancelTimer();
    }
  }, 1000);
}

export function cancelTimer() {
  clearInterval(_interval);
  _interval = null;
  state.active = false;
  state.exKey = null;
  state.seconds = 0;
  state.duration = 0;
}

export { state as timerState };
