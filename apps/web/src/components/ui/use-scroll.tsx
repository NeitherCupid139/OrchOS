import { useCallback, useEffect, useRef, useState } from "react";

export function useScroll(threshold: number) {
  const [scrolled, setScrolled] = useState(false);
  const onScrollRef = useRef(() => {
    setScrolled(window.scrollY > threshold);
  });

  const onScroll = useCallback(() => {
    setScrolled(window.scrollY > threshold);
  }, [threshold]);

  onScrollRef.current = onScroll;

  useEffect(() => {
    const handler = () => onScrollRef.current();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    onScroll();
  }, [onScroll]);

  return scrolled;
}
