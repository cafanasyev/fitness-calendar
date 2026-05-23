import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { toISO, fromISO, addDays, startOfWeekMonday, fmtDayDate, fmtRange } from './dates.js';

describe('toISO', () => {
  test('pads month and day', () => assert.strictEqual(toISO(new Date(2026, 0, 1)), '2026-01-01'));
  test('single-digit month and day', () => assert.strictEqual(toISO(new Date(2026, 8, 9)), '2026-09-09'));
  test('Dec 31', () => assert.strictEqual(toISO(new Date(2026, 11, 31)), '2026-12-31'));
  test('leap day', () => assert.strictEqual(toISO(new Date(2000, 1, 29)), '2000-02-29'));
});

describe('fromISO', () => {
  test('Jan 1', () => assert.deepStrictEqual(fromISO('2026-01-01'), new Date(2026, 0, 1)));
  test('Sep 9', () => assert.deepStrictEqual(fromISO('2026-09-09'), new Date(2026, 8, 9)));
  test('Dec 31', () => assert.deepStrictEqual(fromISO('2026-12-31'), new Date(2026, 11, 31)));
  test('leap day', () => assert.deepStrictEqual(fromISO('2000-02-29'), new Date(2000, 1, 29)));
});

describe('toISO/fromISO round-trip', () => {
  for (const s of ['2026-01-01', '2026-06-15', '2026-12-31', '2000-02-29']) {
    test(s, () => assert.strictEqual(toISO(fromISO(s)), s));
  }
});

describe('addDays', () => {
  const jan5 = new Date(2026, 0, 5);
  test('add 0', () => assert.deepStrictEqual(addDays(jan5, 0), new Date(2026, 0, 5)));
  test('add 1', () => assert.deepStrictEqual(addDays(jan5, 1), new Date(2026, 0, 6)));
  test('add 7', () => assert.deepStrictEqual(addDays(jan5, 7), new Date(2026, 0, 12)));
  test('subtract 1', () => assert.deepStrictEqual(addDays(jan5, -1), new Date(2026, 0, 4)));
  test('subtract across year boundary', () => assert.deepStrictEqual(addDays(jan5, -5), new Date(2025, 11, 31)));
  test('add across month boundary', () => assert.deepStrictEqual(addDays(jan5, 27), new Date(2026, 1, 1)));
  test('does not mutate input', () => { addDays(jan5, 5); assert.deepStrictEqual(jan5, new Date(2026, 0, 5)); });
});

describe('startOfWeekMonday', () => {
  test('Monday → same day',         () => assert.deepStrictEqual(startOfWeekMonday(new Date(2026, 0, 5)),  new Date(2026, 0, 5)));
  test('Tuesday → Monday',          () => assert.deepStrictEqual(startOfWeekMonday(new Date(2026, 0, 6)),  new Date(2026, 0, 5)));
  test('Wednesday → Monday',        () => assert.deepStrictEqual(startOfWeekMonday(new Date(2026, 0, 7)),  new Date(2026, 0, 5)));
  test('Thursday → Monday',         () => assert.deepStrictEqual(startOfWeekMonday(new Date(2026, 0, 8)),  new Date(2026, 0, 5)));
  test('Friday → Monday',           () => assert.deepStrictEqual(startOfWeekMonday(new Date(2026, 0, 9)),  new Date(2026, 0, 5)));
  test('Saturday → Monday',         () => assert.deepStrictEqual(startOfWeekMonday(new Date(2026, 0, 10)), new Date(2026, 0, 5)));
  test('Sunday → previous Monday',  () => assert.deepStrictEqual(startOfWeekMonday(new Date(2026, 0, 11)), new Date(2026, 0, 5)));
  test('zeroes time components', () => {
    const r = startOfWeekMonday(new Date(2026, 0, 7, 14, 30, 0));
    assert.strictEqual(r.getHours(), 0);
    assert.strictEqual(r.getMinutes(), 0);
    assert.strictEqual(r.getSeconds(), 0);
  });
  test('does not mutate input', () => {
    const d = new Date(2026, 0, 7, 14, 30, 0);
    startOfWeekMonday(d);
    assert.strictEqual(d.getHours(), 14);
  });
});

describe('fmtDayDate', () => {
  test('returns non-empty string', () => assert.ok(fmtDayDate(new Date(2026, 0, 5)).length > 0));
  test('contains day number 5',   () => assert.ok(fmtDayDate(new Date(2026, 0, 5)).includes('5')));
  test('contains day number 15',  () => assert.ok(fmtDayDate(new Date(2026, 5, 15)).includes('15')));
});

describe('fmtRange', () => {
  test('same-month uses en-dash', () => {
    const s = fmtRange(new Date(2026, 0, 5), new Date(2026, 0, 11));
    assert.ok(s.includes('–'));
    assert.ok(!s.includes(' – '));
    assert.ok(s.includes('11'));
  });
  test('cross-month uses spaced en-dash', () => {
    const s = fmtRange(new Date(2026, 0, 26), new Date(2026, 1, 1));
    assert.ok(s.includes(' – '));
  });
});
