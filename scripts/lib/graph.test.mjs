import test from "node:test";
import assert from "node:assert/strict";
import { renderContributionGraph, toWeeks } from "./graph.mjs";

const mkDays = (counts, start = "2026-01-04") =>
  counts.map((count, i) => ({
    date: new Date(Date.parse(start + "T00:00:00Z") + i * 86400000).toISOString().slice(0, 10),
    count,
  }));

test("toWeeks groups days into 7-day buckets and sums them", () => {
  const weeks = toWeeks(mkDays([1, 1, 1, 1, 1, 1, 1, 2, 2]));
  assert.equal(weeks.length, 2);
  assert.equal(weeks[0].total, 7);
  assert.equal(weeks[1].total, 4);
});

test("toWeeks keeps a partial trailing week rather than dropping it", () => {
  assert.equal(toWeeks(mkDays([5])).length, 1);
  assert.equal(toWeeks(mkDays([5]))[0].total, 5);
});

test("toWeeks dates each bucket by its first day", () => {
  assert.equal(toWeeks(mkDays(new Array(14).fill(0)))[1].date, "2026-01-11");
});

test("renderContributionGraph emits a well-formed svg document", () => {
  const svg = renderContributionGraph(mkDays(new Array(70).fill(3)));
  assert.ok(svg.startsWith("<svg "));
  assert.ok(svg.endsWith("</svg>"));
  assert.match(svg, /viewBox="0 0 820 240"/);
  assert.match(svg, /role="img"/);
  assert.match(svg, /aria-label="[^"]+"/);
});

test("renderContributionGraph never emits NaN, undefined or Infinity", () => {
  for (const counts of [new Array(70).fill(0), [0], new Array(371).fill(9), [1, 0, 0, 0, 0, 0, 0]]) {
    const svg = renderContributionGraph(mkDays(counts));
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/, `bad numeric output for ${counts.length} days`);
  }
});

test("renderContributionGraph survives an all-zero year without dividing by zero", () => {
  const svg = renderContributionGraph(mkDays(new Array(371).fill(0)));
  assert.doesNotMatch(svg, /NaN/);
  assert.match(svg, /0 contributions/);
});

test("renderContributionGraph returns a valid placeholder for no data", () => {
  const svg = renderContributionGraph([]);
  assert.ok(svg.startsWith("<svg "));
  assert.ok(svg.endsWith("</svg>"));
  assert.match(svg, /No contribution data/);
  assert.doesNotMatch(svg, /NaN/);
});

test("renderContributionGraph is deterministic for identical input", () => {
  const days = mkDays(new Array(140).fill(2));
  assert.equal(renderContributionGraph(days), renderContributionGraph(days));
});

test("renderContributionGraph uses a stable gradient id, not a random one", () => {
  const days = mkDays(new Array(70).fill(1));
  assert.match(renderContributionGraph(days, { theme: "dark" }), /id="cg-dark"/);
  assert.match(renderContributionGraph(days, { theme: "light" }), /id="cg-light"/);
});

test("renderContributionGraph themes differ and carry the right background", () => {
  const days = mkDays(new Array(70).fill(1));
  const light = renderContributionGraph(days, { theme: "light" });
  const dark = renderContributionGraph(days, { theme: "dark" });
  assert.notEqual(light, dark);
  assert.match(light, /fill="#ffffff"/);
  assert.match(dark, /fill="#0d1117"/);
});

test("renderContributionGraph falls back to the light theme for an unknown theme", () => {
  const days = mkDays(new Array(70).fill(1));
  assert.match(renderContributionGraph(days, { theme: "chartreuse" }), /fill="#ffffff"/);
});

test("renderContributionGraph reports the true total across all days", () => {
  assert.match(renderContributionGraph(mkDays([1, 2, 3, 4, 5, 6, 7])), /28 contributions/);
});

test("renderContributionGraph escapes the title rather than injecting markup", () => {
  const svg = renderContributionGraph(mkDays([1]), { title: "a<b>&c" });
  assert.doesNotMatch(svg, /<b>/);
  assert.match(svg, /a&lt;b&gt;&amp;c/);
});
