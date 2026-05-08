import * as React from "react";

export function useMediaQuery(query: string) {
  const getMatches = React.useCallback(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia(query).matches;
  }, [query]);

  const [matches, setMatches] = React.useState(getMatches);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    const handleChange = () => {
      setMatches(mediaQuery.matches);
    };

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}
