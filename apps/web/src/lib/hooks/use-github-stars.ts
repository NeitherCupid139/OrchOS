import { useState, useEffect } from "react";

const starCountFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

// Module-level cache to avoid re-fetching on every mount
let cachedStarCount: number | null = null;
let cachedStarCountPromise: Promise<number | null> | null = null;

export function useGitHubStars() {
  const [starCount, setStarCount] = useState<number | null>(null);

  useEffect(() => {
    if (cachedStarCount !== null) {
      setStarCount(cachedStarCount);
      return;
    }
    if (cachedStarCountPromise !== null) {
      cachedStarCountPromise.then(setStarCount).catch(() => {});
      return;
    }
    cachedStarCountPromise = fetch("/api/github-stars")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        const count =
          typeof (data as { stargazers_count?: number }).stargazers_count ===
          "number"
            ? (data as { stargazers_count: number }).stargazers_count
            : null;
        cachedStarCount = count;
        return count;
      })
      .catch(() => {
        cachedStarCount = null;
        return null;
      });
    cachedStarCountPromise.then(setStarCount).catch(() => {});
  }, []);

  const formatted =
    starCount === null ? null : starCountFormatter.format(starCount);

  return { starCount, formattedStarCount: formatted };
}
