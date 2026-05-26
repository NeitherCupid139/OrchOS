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

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = React.useState<
    "mobile" | "tablet" | "desktop"
  >("mobile");

  React.useEffect(() => {
    const mqlSm = window.matchMedia("(min-width: 640px)");
    const mqlLg = window.matchMedia("(min-width: 1024px)");

    const update = () => {
      if (mqlLg.matches) setBreakpoint("desktop");
      else if (mqlSm.matches) setBreakpoint("tablet");
      else setBreakpoint("mobile");
    };

    update();
    mqlSm.addEventListener("change", update);
    mqlLg.addEventListener("change", update);
    return () => {
      mqlSm.removeEventListener("change", update);
      mqlLg.removeEventListener("change", update);
    };
  }, []);

  return breakpoint;
}
