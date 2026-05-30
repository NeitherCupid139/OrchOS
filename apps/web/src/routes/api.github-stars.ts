import { createFileRoute } from "@tanstack/react-router";

const GITHUB_REPO_API_URL = "https://api.github.com/repos/NeitherCupid139/OrchOS";
const GITHUB_STARS_CACHE_TTL_MS = 1000 * 60 * 30;

let githubStarsCache: {
  value: number;
  expiresAt: number;
} | null = null;

async function handleGithubStars() {
  const now = Date.now();

  if (githubStarsCache && githubStarsCache.expiresAt > now) {
    return Response.json(
      { stargazers_count: githubStarsCache.value, cached: true },
      {
        headers: {
          "Cache-Control": "public, max-age=1800, stale-while-revalidate=86400",
        },
      },
    );
  }

  const response = await fetch(GITHUB_REPO_API_URL, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "OrchOS-Web",
    },
  }).catch((error: unknown) => {
    if (githubStarsCache) {
      return null;
    }

    if (error instanceof Error && error.name === "AbortError") {
      return null;
    }

    throw error;
  });

  if (!response) {
    if (githubStarsCache) {
      return Response.json(
        { stargazers_count: githubStarsCache.value, cached: true, stale: true },
        {
          headers: {
            "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
          },
        },
      );
    }

    return Response.json({ error: "GitHub stars request was aborted" }, { status: 499 });
  }

  if (!response.ok) {
    if (githubStarsCache) {
      return Response.json(
        { stargazers_count: githubStarsCache.value, cached: true, stale: true },
        {
          headers: {
            "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
          },
        },
      );
    }

    return Response.json({ error: "Failed to load GitHub stars" }, { status: 502 });
  }

  const data = (await response.json()) as { stargazers_count?: number };
  const starCount =
    typeof data.stargazers_count === "number" ? data.stargazers_count : null;

  if (starCount === null) {
    return Response.json({ error: "Invalid GitHub stars response" }, { status: 502 });
  }

  githubStarsCache = {
    value: starCount,
    expiresAt: now + GITHUB_STARS_CACHE_TTL_MS,
  };

  return Response.json(
    { stargazers_count: starCount, cached: false },
    {
      headers: {
        "Cache-Control": "public, max-age=1800, stale-while-revalidate=86400",
      },
    },
  );
}

export const Route = createFileRoute("/api/github-stars")({
  server: {
    handlers: {
      GET: handleGithubStars,
    },
  },
});
