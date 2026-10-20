// Renders the contribution timeline as a self-contained SVG.
//
// This exists because the third-party service that used to draw this chart
// (github-readme-activity-graph.vercel.app) had its deployment disabled and
// began returning HTTP 402 for every request. The data was already being
// fetched for the streak badges, so the chart is now drawn from it directly
// and committed to this repo — nothing here can be switched off by someone else.
//
// Pure: data in, SVG string out. No network, no filesystem, no clock.

const THEMES = {
  light: {
    bg: "#ffffff", text: "#57606a", grid: "#d0d7de",
    line: "#6e40c9", area: "#8b6fd6", point: "#1c1230", title: "#1c1230",
  },
  dark: {
    bg: "#0d1117", text: "#8b949e", grid: "#30363d",
    line: "#8b6fd6", area: "#6e40c9", point: "#e6edf3", title: "#e6edf3",
  },
};

const W = 820, H = 240;
const PAD = { top: 48, right: 20, bottom: 34, left: 46 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** Groups ascending days into consecutive 7-day buckets, summing counts. */
export function toWeeks(days) {
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    const chunk = days.slice(i, i + 7);
    weeks.push({
      date: chunk[0].date,
      total: chunk.reduce((n, d) => n + d.count, 0),
    });
  }
  return weeks;
}

function escapeText(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Rounds to 2dp and drops a trailing ".00" so output stays stable and compact. */
const n2 = (v) => Number(v.toFixed(2)).toString();

/**
 * @param days  ascending [{date:'YYYY-MM-DD', count:number}]
 * @param theme 'light' | 'dark'
 * @returns a complete SVG document
 */
export function renderContributionGraph(days, { theme = "light", title = "Contribution Timeline" } = {}) {
  const c = THEMES[theme] ?? THEMES.light;
  const weeks = toWeeks(days);

  if (weeks.length === 0) {
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeText(title)}: no data">`,
      `<rect width="${W}" height="${H}" fill="${c.bg}"/>`,
      `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-family="Segoe UI,Helvetica,Arial,sans-serif" font-size="14" fill="${c.text}">No contribution data</text>`,
      `</svg>`,
    ].join("");
  }

  const max = Math.max(1, ...weeks.map((w) => w.total));
  const stepX = weeks.length > 1 ? PLOT_W / (weeks.length - 1) : 0;
  const x = (i) => PAD.left + i * stepX;
  const y = (v) => PAD.top + PLOT_H - (v / max) * PLOT_H;

  const pts = weeks.map((w, i) => [x(i), y(w.total)]);
  const line = pts.map(([px, py], i) => `${i === 0 ? "M" : "L"}${n2(px)},${n2(py)}`).join(" ");
  const area = `${line} L${n2(pts[pts.length - 1][0])},${n2(PAD.top + PLOT_H)} L${n2(pts[0][0])},${n2(PAD.top + PLOT_H)} Z`;

  // Three gridlines is enough to read the scale without cluttering the plot.
  const ticks = [0, Math.round(max / 2), max];
  const grid = ticks
    .map((t) => {
      const gy = n2(y(t));
      return (
        `<line x1="${PAD.left}" y1="${gy}" x2="${PAD.left + PLOT_W}" y2="${gy}" stroke="${c.grid}" stroke-width="1" stroke-dasharray="3 3"/>` +
        `<text x="${PAD.left - 8}" y="${n2(y(t) + 4)}" text-anchor="end" font-family="Segoe UI,Helvetica,Arial,sans-serif" font-size="11" fill="${c.text}">${t}</text>`
      );
    })
    .join("");

  // Label a month only where it first appears, so ticks never collide.
  let lastMonth = -1;
  const monthLabels = weeks
    .map((w, i) => {
      const m = Number(w.date.slice(5, 7)) - 1;
      if (m === lastMonth) return "";
      lastMonth = m;
      return `<text x="${n2(x(i))}" y="${H - 12}" text-anchor="middle" font-family="Segoe UI,Helvetica,Arial,sans-serif" font-size="11" fill="${c.text}">${MONTHS[m]}</text>`;
    })
    .join("");

  // Only peaks get a dot; 53 dots would read as noise.
  const dots = weeks
    .map((w, i) => (w.total >= max * 0.75 ? `<circle cx="${n2(x(i))}" cy="${n2(y(w.total))}" r="3" fill="${c.point}"/>` : ""))
    .join("");

  const total = days.reduce((n, d) => n + d.count, 0);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeText(title)}: ${total} contributions, peak ${max} in a week">`,
    `<defs><linearGradient id="cg-${theme}" x1="0" y1="0" x2="0" y2="1">`,
    `<stop offset="0%" stop-color="${c.area}" stop-opacity="0.45"/>`,
    `<stop offset="100%" stop-color="${c.area}" stop-opacity="0"/>`,
    `</linearGradient></defs>`,
    `<rect width="${W}" height="${H}" fill="${c.bg}" rx="6"/>`,
    `<text x="${PAD.left}" y="28" font-family="Segoe UI,Helvetica,Arial,sans-serif" font-size="15" font-weight="600" fill="${c.title}">${escapeText(title)}</text>`,
    `<text x="${W - PAD.right}" y="28" text-anchor="end" font-family="Segoe UI,Helvetica,Arial,sans-serif" font-size="12" fill="${c.text}">${total} contributions</text>`,
    grid,
    `<path d="${area}" fill="url(#cg-${theme})"/>`,
    `<path d="${line}" fill="none" stroke="${c.line}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`,
    dots,
    monthLabels,
    `</svg>`,
  ].join("");
}
