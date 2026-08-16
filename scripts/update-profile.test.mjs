import test from "node:test";
import assert from "node:assert/strict";
import { buildReadme } from "./update-profile.mjs";

const FIXTURE = [
  "<!-- FOLLOWERS-BADGE:START -->OLD_FOLLOWERS<!-- FOLLOWERS-BADGE:END -->",
  "<!-- REPOS-BADGE:START -->OLD_REPOS<!-- REPOS-BADGE:END -->",
  "<!-- RECENT-REPOS:START -->OLD_TABLE<!-- RECENT-REPOS:END -->",
  "<!-- STATS:START -->OLD_STATS<!-- STATS:END -->",
  "<!-- LANGS:START -->OLD_LANGS<!-- LANGS:END -->",
].join("\n");

const DATA = {
  repos: [{
    name: "demo", full_name: "u/demo", html_url: "https://github.com/u/demo",
    description: "A demo repo", language: "TypeScript", fork: false,
    archived: false, stargazers_count: 4,
  }],
  profile: { followers: 3, public_repos: 20 },
  contributions: {
    totalCommits: 340, totalPRs: 8, totalContributions: 400,
    days: [{ date: "2026-01-01", count: 1 }],
  },
  langTotals: { TypeScript: 900, CSS: 100 },
};

test("buildReadme fills every region when all data is present", () => {
  const { text, warnings } = buildReadme(FIXTURE, DATA);
  assert.deepEqual(warnings, []);
  for (const stale of ["OLD_FOLLOWERS", "OLD_REPOS", "OLD_TABLE", "OLD_STATS", "OLD_LANGS"]) {
    assert.doesNotMatch(text, new RegExp(stale), `${stale} was not replaced`);
  }
});

test("buildReadme preserves the old stats when contributions are missing", () => {
  const { text, warnings } = buildReadme(FIXTURE, { ...DATA, contributions: null });
  assert.match(text, /OLD_STATS/);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /stats/i);
});

test("buildReadme still updates healthy regions when one source fails", () => {
  const { text } = buildReadme(FIXTURE, { ...DATA, contributions: null });
  assert.doesNotMatch(text, /OLD_TABLE/);
  assert.doesNotMatch(text, /OLD_LANGS/);
});

test("buildReadme preserves both badge regions when the profile is missing", () => {
  const { text, warnings } = buildReadme(FIXTURE, { ...DATA, profile: null });
  assert.match(text, /OLD_FOLLOWERS/);
  assert.match(text, /OLD_REPOS/);
  assert.match(text, /OLD_STATS/);
  assert.equal(warnings.length, 2);
});

test("buildReadme preserves stats when repos fail even though contributions succeed", () => {
  const { text, warnings } = buildReadme(FIXTURE, { ...DATA, repos: null });
  assert.match(text, /OLD_STATS/);
  assert.doesNotMatch(text, /Total_Stars-0-/);
  assert.ok(warnings.some((w) => /stats/i.test(w)));
});

test("buildReadme never writes an error string into the document", () => {
  const { text } = buildReadme(FIXTURE, { repos: null, profile: null, contributions: null, langTotals: null });
  assert.doesNotMatch(text, /error|failed|went wrong/i);
  assert.equal(text, FIXTURE);
});

test("buildReadme is idempotent", () => {
  const once = buildReadme(FIXTURE, DATA).text;
  const twice = buildReadme(once, DATA).text;
  assert.equal(once, twice);
});

test("buildReadme throws when a marker pair is missing", () => {
  assert.throws(() => buildReadme("<!-- STATS:START -->x<!-- STATS:END -->", DATA), /RECENT-REPOS|FOLLOWERS/);
});
