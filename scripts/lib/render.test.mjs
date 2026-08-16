import test from "node:test";
import assert from "node:assert/strict";
import { replaceRegion } from "./render.mjs";

test("replaceRegion swaps content between markers", () => {
  const input = "a\n<!-- X:START -->\nold\n<!-- X:END -->\nb";
  const out = replaceRegion(input, "X", "\nnew\n");
  assert.equal(out, "a\n<!-- X:START -->\nnew\n<!-- X:END -->\nb");
});

test("replaceRegion preserves text outside the markers", () => {
  const input = "head <!-- Y:START -->drop<!-- Y:END --> tail";
  const out = replaceRegion(input, "Y", "keep");
  assert.match(out, /^head /);
  assert.match(out, / tail$/);
  assert.match(out, /keep/);
  assert.doesNotMatch(out, /drop/);
});

test("replaceRegion is idempotent for identical content", () => {
  const input = "<!-- Z:START -->same<!-- Z:END -->";
  assert.equal(replaceRegion(input, "Z", "same"), input);
});

test("replaceRegion throws when the start marker is missing", () => {
  assert.throws(
    () => replaceRegion("no markers here", "Q", "x"),
    /Q:START/
  );
});

test("replaceRegion throws when the end marker precedes the start marker", () => {
  const input = "<!-- W:END --><!-- W:START -->";
  assert.throws(() => replaceRegion(input, "W", "x"), /W/);
});

import { shieldEscape, badgeUrl, badgeImg } from "./render.mjs";

test("shieldEscape doubles hyphens", () => {
  assert.equal(shieldEscape("Scikit-learn"), "Scikit--learn");
});

test("shieldEscape doubles underscores", () => {
  assert.equal(shieldEscape("a_b"), "a__b");
});

test("shieldEscape turns spaces into underscores", () => {
  assert.equal(shieldEscape("Spring Boot"), "Spring_Boot");
});

test("shieldEscape leaves dots alone", () => {
  assert.equal(shieldEscape("Node.js"), "Node.js");
});

test("badgeUrl builds a label-only badge with the fixed style", () => {
  const url = badgeUrl({ label: "React", color: "20232A", logo: "react", logoColor: "61DAFB" });
  assert.equal(
    url,
    "https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB"
  );
});

test("badgeUrl builds a label-value badge with labelColor", () => {
  const url = badgeUrl({ label: "Total Stars", message: "12", color: "6e40c9", logo: "github" });
  assert.equal(
    url,
    "https://img.shields.io/badge/Total_Stars-12-6e40c9?style=for-the-badge&labelColor=0d1117&logo=github&logoColor=white"
  );
});

test("badgeUrl omits the logo params when no logo is given", () => {
  const url = badgeUrl({ label: "Seaborn", color: "4C72B0" });
  assert.equal(url, "https://img.shields.io/badge/Seaborn-4C72B0?style=for-the-badge");
});

test("badgeUrl percent-encodes a percent sign in the message", () => {
  const url = badgeUrl({ label: "TypeScript", message: "38.4%", color: "3178C6" });
  assert.match(url, /TypeScript-38\.4%25-3178C6/);
});

test("badgeImg wraps the url in an img tag carrying alt text", () => {
  const img = badgeImg({ label: "Docker", color: "2496ED", logo: "docker", alt: "Docker" });
  assert.match(img, /^<img src="https:\/\/img\.shields\.io\/badge\/Docker-2496ED/);
  assert.match(img, /alt="Docker"\/>$/);
});

test("badgeUrl escapes a hyphen in the message", () => {
  const url = badgeUrl({ label: "Streak", message: "5-day", color: "6e40c9" });
  assert.match(url, /Streak-5--day-6e40c9/);
});

test("badgeUrl escapes a space in the message", () => {
  const url = badgeUrl({ label: "Streak", message: "5 days", color: "6e40c9" });
  assert.match(url, /Streak-5_days-6e40c9/);
});

test("badgeUrl percent-encodes a hash in the label", () => {
  const url = badgeUrl({ label: "C#", message: "5.0%", color: "8b949e" });
  assert.match(url, /badge\/C%23-5\.0%25-8b949e/);
});

import { renderRecentRepos } from "./render.mjs";

const repo = (over = {}) => ({
  name: "demo",
  html_url: "https://github.com/u/demo",
  description: "A demo repo",
  language: "TypeScript",
  fork: false,
  archived: false,
  ...over,
});

test("renderRecentRepos emits a header row", () => {
  const out = renderRecentRepos([repo()]);
  assert.match(out, /\| Repository \| Language \| Description \|/);
  assert.match(out, /\| :--- \| :--- \| :--- \|/);
});

test("renderRecentRepos links the repo and maps a language emoji", () => {
  const out = renderRecentRepos([repo()]);
  assert.match(out, /\[\*\*demo\*\*\]\(https:\/\/github\.com\/u\/demo\)/);
  assert.match(out, /🔷 TypeScript/);
});

test("renderRecentRepos falls back to a bullet for an unmapped language", () => {
  const out = renderRecentRepos([repo({ language: "Haskell" })]);
  assert.match(out, /• Haskell/);
});

test("renderRecentRepos falls back to a bullet when language is null", () => {
  const out = renderRecentRepos([repo({ language: null })]);
  assert.match(out, /\| • \|/);
});

test("renderRecentRepos drops forks, archived and description-less repos", () => {
  const out = renderRecentRepos([
    repo({ name: "aa", fork: true }),
    repo({ name: "bb", archived: true }),
    repo({ name: "cc", description: "   " }),
    repo({ name: "dd", description: null }),
    repo({ name: "keep" }),
  ]);
  for (const gone of ["aa", "bb", "cc", "dd"]) {
    assert.doesNotMatch(out, new RegExp(gone));
  }
  assert.match(out, /keep/);
});

test("renderRecentRepos excludes the profile repo case-insensitively", () => {
  const out = renderRecentRepos([repo({ name: "MacroMaster101" }), repo({ name: "keep" })]);
  assert.doesNotMatch(out, /MacroMaster101/);
  assert.match(out, /keep/);
});

test("renderRecentRepos excludes a featured repo passed via the exclude array", () => {
  const out = renderRecentRepos(
    [repo({ name: "Mazora-Network" }), repo({ name: "keep" })],
    { exclude: ["macromaster101", "mazora-network"] }
  );
  assert.doesNotMatch(out, /Mazora-Network/);
  assert.match(out, /keep/);
});

test("renderRecentRepos caps the row count", () => {
  const many = Array.from({ length: 9 }, (_, i) => repo({ name: `r${i}` }));
  const rows = renderRecentRepos(many, { max: 3 }).trim().split("\n");
  assert.equal(rows.length, 5); // header + separator + 3
});

test("renderRecentRepos truncates a long description with an ellipsis", () => {
  const out = renderRecentRepos([repo({ description: "x".repeat(200) })]);
  const cell = out.split("\n").at(-1).split("|")[3].trim();
  assert.ok(cell.length <= 108);
  assert.ok(cell.endsWith("…"));
  // Must break on a space, not mid-word: the character before the ellipsis
  // must not itself be a truncated word fragment glued to a space boundary.
  assert.ok(!cell.slice(0, -1).endsWith(" "));
});

test("renderRecentRepos leaves a short description intact", () => {
  const out = renderRecentRepos([repo({ description: "short one" })]);
  assert.match(out, /\| short one \|/);
});

import { renderStatBadges, renderLanguageBars } from "./render.mjs";

const stats = {
  stars: 12, repos: 20, commits: 340, prs: 8, currentStreak: 5, longestStreak: 21,
};

test("renderStatBadges emits one badge per metric", () => {
  const out = renderStatBadges(stats);
  assert.equal(out.match(/<img /g).length, 6);
});

test("renderStatBadges renders every value", () => {
  const out = renderStatBadges(stats);
  for (const v of ["12", "20", "340", "8", "5", "21"]) {
    assert.ok(out.includes(`-${v}-`), `missing value ${v}`);
  }
});

test("renderStatBadges gives every badge descriptive alt text", () => {
  const out = renderStatBadges(stats);
  const alts = [...out.matchAll(/alt="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(alts.length, 6);
  for (const alt of alts) assert.ok(alt.length > 6, `alt too terse: ${alt}`);
});

test("renderStatBadges uses the fixed accent colour", () => {
  assert.equal(renderStatBadges(stats).match(/6e40c9/g).length, 6);
});

test("renderLanguageBars ranks languages by byte count", () => {
  const out = renderLanguageBars({ CSS: 100, TypeScript: 900, Java: 500 });
  const order = ["TypeScript", "Java", "CSS"].map((l) => out.indexOf(l));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
});

test("renderLanguageBars renders percentages summing sensibly", () => {
  const out = renderLanguageBars({ A: 500, B: 500 });
  assert.equal(out.match(/50\.0%25/g).length, 2);
});

test("renderLanguageBars caps the language count", () => {
  const totals = Object.fromEntries(
    Array.from({ length: 12 }, (_, i) => [`L${i}`, 100 - i])
  );
  assert.equal(renderLanguageBars(totals, { top: 4 }).match(/<img /g).length, 4);
});

test("renderLanguageBars returns an empty string for no data", () => {
  assert.equal(renderLanguageBars({}), "");
});

test("renderLanguageBars computes percentages against all languages, not just the shown ones", () => {
  const totals = { A: 500, B: 300, C: 200 };
  const out = renderLanguageBars(totals, { top: 1 });
  assert.equal(out.match(/<img /g).length, 1);
  assert.match(out, /50\.0%25/); // 500 of 1000 total, not 100% of the top-1 slice
});

test("renderLanguageBars returns an empty string when every byte count is zero", () => {
  assert.equal(renderLanguageBars({ A: 0, B: 0 }), "");
});
