// Everything that talks to GitHub, plus the pure derivations that depend on
// GitHub's data shapes. This is the only module that knows about tokens.

/**
 * Current and longest contribution streaks.
 * `days` must be ascending by date. A zero on `today` does not break the
 * current streak — the day is not over yet — but a zero on any earlier day does.
 */
export function computeStreaks(days, today = new Date().toISOString().slice(0, 10)) {
  let longest = 0;
  let run = 0;
  for (const d of days) {
    run = d.count > 0 ? run + 1 : 0;
    if (run > longest) longest = run;
  }

  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const day = days[i];
    if (day.count > 0) {
      current++;
      continue;
    }
    if (day.date === today) continue; // today is still in progress
    break;
  }

  return { current, longest };
}

export function sumStars(repos) {
  return repos.filter((r) => !r.fork).reduce((n, r) => n + r.stargazers_count, 0);
}

const API = "https://api.github.com";

function headers() {
  const h = { "User-Agent": "MacroMaster101", Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function rest(path) {
  const res = await fetch(`${API}${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`GitHub REST ${res.status} on ${path}`);
  return res.json();
}

export function fetchRepos(user) {
  return rest(`/users/${user}/repos?per_page=100&sort=pushed`);
}

export function fetchProfile(user) {
  return rest(`/users/${user}`);
}

/** Sums per-language byte counts across every non-fork repo. */
export async function fetchLanguageTotals(repos) {
  const owned = repos.filter((r) => !r.fork);
  const totals = {};
  for (const r of owned) {
    const langs = await rest(`/repos/${r.full_name}/languages`);
    for (const [name, bytes] of Object.entries(langs)) {
      totals[name] = (totals[name] ?? 0) + bytes;
    }
  }
  return totals;
}

const CONTRIB_QUERY = `
query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

export async function fetchContributions(user) {
  const res = await fetch(`${API}/graphql`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ query: CONTRIB_QUERY, variables: { login: user } }),
  });
  if (!res.ok) throw new Error(`GitHub GraphQL ${res.status}`);
  const body = await res.json();
  if (body.errors) throw new Error(`GitHub GraphQL: ${body.errors[0].message}`);

  const c = body.data.user.contributionsCollection;
  const days = c.contributionCalendar.weeks
    .flatMap((w) => w.contributionDays)
    .map((d) => ({ date: d.date, count: d.contributionCount }));

  return {
    totalCommits: c.totalCommitContributions,
    totalPRs: c.totalPullRequestContributions,
    totalContributions: c.contributionCalendar.totalContributions,
    days,
  };
}
