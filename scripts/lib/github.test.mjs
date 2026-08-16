import test from "node:test";
import assert from "node:assert/strict";
import { computeStreaks, sumStars } from "./github.mjs";

const days = (...counts) =>
  counts.map((count, i) => ({
    date: `2026-01-${String(i + 1).padStart(2, "0")}`,
    count,
  }));

test("computeStreaks returns zeroes for an empty calendar", () => {
  assert.deepEqual(computeStreaks([], "2026-01-05"), { current: 0, longest: 0 });
});

test("computeStreaks returns zeroes when nothing was contributed", () => {
  assert.deepEqual(computeStreaks(days(0, 0, 0), "2026-01-03"), { current: 0, longest: 0 });
});

test("computeStreaks counts a run ending today", () => {
  assert.deepEqual(computeStreaks(days(0, 1, 1, 1), "2026-01-04"), { current: 3, longest: 3 });
});

test("computeStreaks treats a zero today as not breaking the streak", () => {
  assert.deepEqual(computeStreaks(days(1, 1, 1, 0), "2026-01-04"), { current: 3, longest: 3 });
});

test("computeStreaks reports zero when the gap predates today", () => {
  assert.deepEqual(computeStreaks(days(1, 1, 0, 0), "2026-01-04"), { current: 0, longest: 2 });
});

test("computeStreaks finds the longest run in the middle", () => {
  const result = computeStreaks(days(1, 1, 1, 1, 0, 1), "2026-01-06");
  assert.equal(result.longest, 4);
  assert.equal(result.current, 1);
});

test("computeStreaks handles a single active day", () => {
  assert.deepEqual(computeStreaks(days(1), "2026-01-01"), { current: 1, longest: 1 });
});

test("sumStars adds stars across non-fork repos", () => {
  const repos = [
    { fork: false, stargazers_count: 3 },
    { fork: false, stargazers_count: 1 },
    { fork: true, stargazers_count: 99 },
  ];
  assert.equal(sumStars(repos), 4);
});

test("sumStars returns zero for no repos", () => {
  assert.equal(sumStars([]), 0);
});
