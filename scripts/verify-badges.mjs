// Standalone checker: confirms shields.io actually recognises every logo slug
// this profile's README actually uses. shields.io answers HTTP 200 even for a
// slug it has never heard of — it just silently omits the icon, rendering a
// narrower badge with a blank gap where the logo should be. Status codes are
// therefore useless for detection.
//
// The reliable signal (already validated empirically) is the presence of the
// substring `<image` in the returned SVG. A recognised slug is embedded as
// `<image ... href="data:image/svg+xml;base64,...">`; an unrecognised slug
// produces no `<image>` element at all.
//
// Rather than hand-maintaining a candidate list (which drifts from the README
// the moment either file changes), this script reads README.md itself and
// extracts every distinct `logo=<slug>` value it finds, then checks exactly
// those. That makes it a self-updating regression guard: it can only ever
// flag slugs the README actually references right now.
//
// Usage: node scripts/verify-badges.mjs
// Exit code: 0 if every referenced slug has an icon, 1 otherwise.

import { readFile } from "node:fs/promises";

const README = "README.md";

/** Extracts every distinct `logo=<slug>` value referenced in the README. */
export function extractLogoSlugs(readme) {
  const slugs = new Set();
  for (const match of readme.matchAll(/logo=([a-zA-Z0-9]+)/g)) {
    slugs.add(match[1]);
  }
  return [...slugs].sort();
}

async function checkSlug(logo) {
  const url = `https://img.shields.io/badge/x-${logo}?style=for-the-badge&logo=${logo}&logoColor=white`;
  const res = await fetch(url);
  const svg = await res.text();
  const hasIcon = svg.includes("<image");
  return { logo, hasIcon };
}

async function main() {
  const readme = await readFile(README, "utf8");
  const slugs = extractLogoSlugs(readme);

  const results = await Promise.all(slugs.map(checkSlug));

  const labelWidth = Math.max(...results.map((r) => r.logo.length));
  for (const { logo, hasIcon } of results) {
    const status = hasIcon ? "OK" : "NO-ICON";
    console.log(`${logo.padEnd(labelWidth)}  ${status}`);
  }

  const missing = results.filter((r) => !r.hasIcon).map((r) => r.logo);

  console.log("");
  console.log(`Checked ${results.length} slugs: ${results.length - missing.length} OK, ${missing.length} NO-ICON.`);
  if (missing.length > 0) {
    console.log(`NO-ICON: ${missing.join(", ")}`);
    process.exitCode = 1;
  } else {
    console.log("All slugs recognised.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
