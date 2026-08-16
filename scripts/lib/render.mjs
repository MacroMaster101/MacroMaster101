// Pure formatting helpers. No network, no filesystem — everything here takes
// data and returns a string, so it can be tested without a token.

/**
 * Replaces the text between `<!-- NAME:START -->` and `<!-- NAME:END -->`.
 * Throws if the markers are missing or out of order: that means the README
 * structure is broken, which is a real bug worth failing the build over.
 */
export function replaceRegion(text, name, content) {
  const start = `<!-- ${name}:START -->`;
  const end = `<!-- ${name}:END -->`;
  const startIdx = text.indexOf(start);
  if (startIdx === -1) throw new Error(`Marker ${start} not found`);
  const endIdx = text.indexOf(end);
  if (endIdx === -1) throw new Error(`Marker ${end} not found`);
  if (endIdx < startIdx) throw new Error(`Marker ${end} precedes ${start}`);
  return text.slice(0, startIdx + start.length) + content + text.slice(endIdx);
}

const SHIELDS = "https://img.shields.io/badge";

/** Shields.io path escaping: `-` -> `--`, `_` -> `__`, space -> `_`. */
export function shieldEscape(s) {
  return String(s).replace(/-/g, "--").replace(/_/g, "__").replace(/ /g, "_");
}

/**
 * Builds a shields.io URL in the profile's fixed style.
 * A `message` produces a two-part label-value badge and pulls in labelColor;
 * without one it is a single-colour tag badge, matching the Tech Arsenal.
 */
export function badgeUrl({ label, message, color, logo, logoColor = "white" }) {
  const parts = [encodeURIComponent(shieldEscape(label))];
  if (message !== undefined) parts.push(encodeURIComponent(shieldEscape(message)));
  parts.push(color);
  const params = ["style=for-the-badge"];
  if (message !== undefined) params.push("labelColor=0d1117");
  if (logo) params.push(`logo=${logo}`, `logoColor=${logoColor}`);
  return `${SHIELDS}/${parts.join("-")}?${params.join("&")}`;
}

export function badgeImg({ alt, ...spec }) {
  return `<img src="${badgeUrl(spec)}" alt="${alt}"/>`;
}

const LANG_EMOJI = {
  JavaScript: "🟨",
  TypeScript: "🔷",
  Python: "🐍",
  Java: "☕",
  "Jupyter Notebook": "📓",
  HTML: "🌐",
  CSS: "🎨",
};

const DESC_LIMIT = 110;

export function renderRecentRepos(repos, { max = 5, exclude = ["macromaster101"] } = {}) {
  const rows = repos
    .filter((r) => !r.fork && !r.archived)
    .filter((r) => !exclude.includes(r.name.toLowerCase()))
    .filter((r) => r.description && r.description.trim())
    .slice(0, max)
    .map((r) => {
      const lang = r.language ? `${LANG_EMOJI[r.language] ?? "•"} ${r.language}` : "•";
      const desc = r.description.trim();
      const cut = desc.slice(0, 107);
      const short =
        desc.length > DESC_LIMIT
          ? cut.slice(0, cut.lastIndexOf(" ")).trimEnd() + "…"
          : desc;
      return `| [**${r.name}**](${r.html_url}) | ${lang} | ${short} |`;
    });

  return ["| Repository | Language | Description |", "| :--- | :--- | :--- |", ...rows].join("\n");
}

const ACCENT = "6e40c9";

// `star`, `fire` and `trophy` are NOT Simple Icons slugs — verified against
// shields.io on 2026-08-16, all three render a blank gap where the icon should
// be. Those three entries carry `null` so badgeUrl omits the logo params.
const STAT_SPECS = [
  ["stars", "Total Stars", null, "Total stars earned across repositories"],
  ["repos", "Public Repos", "github", "Public repository count"],
  ["commits", "Commits (Year)", "git", "Commits contributed this year"],
  ["prs", "Pull Requests", "github", "Pull requests opened"],
  ["currentStreak", "Current Streak", null, "Current contribution streak in days"],
  ["longestStreak", "Longest Streak", null, "Longest contribution streak in days"],
];

export function renderStatBadges(stats) {
  return STAT_SPECS.map(([key, label, logo, alt]) =>
    badgeImg({ label, message: String(stats[key]), color: ACCENT, logo, alt: `${alt}: ${stats[key]}` })
  ).join("\n");
}

// Brand colours for the languages that actually show up in these repos.
const LANG_STYLE = {
  TypeScript: { color: "3178C6", logo: "typescript" },
  JavaScript: { color: "F7DF1E", logo: "javascript", logoColor: "black" },
  Java: { color: "ED8B00", logo: "openjdk" },
  Python: { color: "3776AB", logo: "python" },
  CSS: { color: "1572B6", logo: "css" },
  HTML: { color: "E34F26", logo: "html5" },
  "Jupyter Notebook": { color: "F37626", logo: "jupyter" },
};

export function renderLanguageBars(totals, { top = 6 } = {}) {
  const all = Object.entries(totals);
  // Percentages are of the WHOLE codebase, not just the displayed slice, so a
  // top-6 view never implies the languages it omits do not exist. The shown
  // values therefore need not sum to 100 — that is the honest result.
  const sum = all.reduce((n, [, bytes]) => n + bytes, 0);
  if (sum === 0) return "";
  const entries = all.sort((a, b) => b[1] - a[1]).slice(0, top);

  return entries
    .map(([name, bytes]) => {
      const pct = ((bytes / sum) * 100).toFixed(1);
      const style = LANG_STYLE[name] ?? { color: "8b949e" };
      return badgeImg({ label: name, message: `${pct}%`, alt: `${name}: ${pct} percent`, ...style });
    })
    .join("\n");
}
