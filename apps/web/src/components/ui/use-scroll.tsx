import { useEffect, useRef, useState } from "react";

export function useScroll(threshold: number) {
  const [scrolled, setScrolled] = useState(() => window.scrollY > threshold);
  const onScrollRef = useRef<() => void>(() => {});

  onScrollRef.current = () => {
    setScrolled(window.scrollY > threshold);
  };

  useEffect(() => {
    const handler = () => onScrollRef.current();
    window.addEventListener("scroll", handler, { passive: true });
    // Sync initial value in case scrollY changed between render and effect.
    onScrollRef.current();
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return scrolled;
}
