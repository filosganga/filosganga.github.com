/**
 * Project data, resolved at build time.
 *
 * The list below is curated by hand — which repositories are worth showing is
 * a judgement, not something to derive from star counts. Everything that goes
 * stale (stars, forks, last push) is fetched from GitHub during the build, so
 * a deploy is enough to refresh it.
 *
 * If GitHub is unreachable or rate-limits us, each project falls back to the
 * description below and simply renders without its numbers. A personal site
 * should not fail to build because an API had a bad minute.
 */

export interface Project {
  /** owner/name on GitHub */
  repo: string;
  /** Shown as the heading. Usually the repo name, occasionally shorter. */
  name: string;
  /** Ours, not GitHub's: says why it exists rather than what it is. */
  blurb: string;
}

export const PROJECTS: Project[] = [
  {
    repo: 'kaluza-platform/kafka-serialization',
    name: 'kafka-serialization',
    blurb:
      'Composable Kafka serializers and deserializers for Scala. Lego bricks rather than a framework: build the codec you need out of the pieces, instead of configuring one that almost fits.',
  },
  {
    repo: 'filosganga/mnemosyne',
    name: 'mnemosyne',
    blurb:
      'Deduplication for at-least-once systems. Two nodes sharing a processor id will not both run the same work, and the duplicate gets back whatever the first attempt produced — built on nothing more than a conditional write that returns the previous value.',
  },
  {
    repo: 'filosganga/jsonpath',
    name: 'jsonpath',
    blurb:
      'JSONPath for Scala, made composable. The specification has no place for expressions like `$.foo == $.bar` or `1 < 2`; here they are first class. Cross-built for the JVM, Scala.js and Native.',
  },
  {
    repo: 'filosganga/batcher',
    name: 'batcher',
    blurb:
      'Batches similar requests together without the caller knowing. Useful wherever a downstream service is far cheaper per call when you ask it for many things at once.',
  },
];

/** What GitHub tells us about a repository, when it is willing to. */
export interface RepoStats {
  stars: number;
  forks: number;
  language: string | null;
  pushedAt: string;
  archived: boolean;
  url: string;
}

export type ResolvedProject = Project & { stats: RepoStats | null };

async function fetchStats(repo: string): Promise<RepoStats | null> {
  const token = import.meta.env.GITHUB_TOKEN ?? process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'filippodeluca.com-build',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, { headers });
    if (!res.ok) {
      console.warn(`[projects] GitHub returned ${res.status} for ${repo}; rendering without stats`);
      return null;
    }
    const json = await res.json();
    return {
      stars: json.stargazers_count,
      forks: json.forks_count,
      language: json.language,
      pushedAt: json.pushed_at,
      archived: json.archived,
      url: json.html_url,
    };
  } catch (err) {
    console.warn(`[projects] could not reach GitHub for ${repo}; rendering without stats`, err);
    return null;
  }
}

/** Resolves every project. Never throws: a failed lookup yields stats: null. */
export async function resolveProjects(): Promise<ResolvedProject[]> {
  return Promise.all(
    PROJECTS.map(async (p) => ({ ...p, stats: await fetchStats(p.repo) }))
  );
}
