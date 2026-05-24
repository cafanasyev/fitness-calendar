import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { workoutDate, autoSkipPast, getToday } from './schedule.js';

describe('workoutDate', () => {
  test('w1 mon', () => assert.deepStrictEqual(workoutDate('2026-01-05', 1, 'mon'), new Date(2026, 0, 5)));
  test('w1 wed', () => assert.deepStrictEqual(workoutDate('2026-01-05', 1, 'wed'), new Date(2026, 0, 7)));
  test('w1 thu', () => assert.deepStrictEqual(workoutDate('2026-01-05', 1, 'thu'), new Date(2026, 0, 8)));
  test('w1 fri', () => assert.deepStrictEqual(workoutDate('2026-01-05', 1, 'fri'), new Date(2026, 0, 9)));
  test('w2 mon', () => assert.deepStrictEqual(workoutDate('2026-01-05', 2, 'mon'), new Date(2026, 0, 12)));
  test('w2 fri', () => assert.deepStrictEqual(workoutDate('2026-01-05', 2, 'fri'), new Date(2026, 0, 16)));
  test('w3 fri', () => assert.deepStrictEqual(workoutDate('2026-01-05', 3, 'fri'), new Date(2026, 0, 23)));
});

describe('autoSkipPast', () => {
  test('two past days skipped', () => {
    const r = autoSkipPast('2026-01-05', {}, new Date(2026, 0, 8)).map(e => `${e.weekN}-${e.dayKey}`);
    assert.deepStrictEqual(r, ['1-mon', '1-wed']);
  });
  test('existing entry not re-skipped', () => {
    const r = autoSkipPast('2026-01-05', { '1-mon': { status: 'done' } }, new Date(2026, 0, 8))
      .map(e => `${e.weekN}-${e.dayKey}`);
    assert.deepStrictEqual(r, ['1-wed']);
  });
  test('no skips when start is today', () => {
    assert.strictEqual(autoSkipPast('2026-01-08', {}, new Date(2026, 0, 8)).length, 0);
  });
  test('multi-week skip', () => {
    const r = autoSkipPast('2026-01-05', {}, new Date(2026, 0, 14)).map(e => `${e.weekN}-${e.dayKey}`);
    assert.deepStrictEqual(r, ['1-mon', '1-wed', '1-thu', '1-fri', '2-mon']);
  });
});

describe('getToday', () => {
  const mock = val => ({ getItem: () => val });
  test('non-localhost returns real today', () => {
    const d = getToday(mock('2026-01-01'), 'fitness-cal.web.app');
    const real = new Date(); real.setHours(0, 0, 0, 0);
    assert.strictEqual(d.toDateString(), real.toDateString());
  });
  test('localhost with valid stored date returns it', () => {
    assert.deepStrictEqual(getToday(mock('2026-06-15'), 'localhost'), new Date(2026, 5, 15));
  });
  test('localhost with no stored value returns real today', () => {
    const d = getToday(mock(null), 'localhost');
    const real = new Date(); real.setHours(0, 0, 0, 0);
    assert.strictEqual(d.toDateString(), real.toDateString());
  });
  test('localhost with invalid stored value returns real today', () => {
    const d = getToday(mock('not-a-date'), 'localhost');
    const real = new Date(); real.setHours(0, 0, 0, 0);
    assert.strictEqual(d.toDateString(), real.toDateString());
  });
});
