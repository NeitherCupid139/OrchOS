import { useEffect, useRef, type ReactNode } from "react";
import { motion, useMotionValue, animate } from "motion/react";

export interface CarouselItem {
  id: string;
  media: ReactNode;
  title: string;
  desc: string;
}

export function FramerCarousel({
  items,
  index: controlledIndex,
  onIndexChange: _onIndexChange,
  flush = false,
}: {
  items: CarouselItem[];
  index?: number;
  onIndexChange?: (index: number) => void;
  flush?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const index = controlledIndex ?? 0;

  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth || 1;
      animate(x, -index * containerWidth, {
        type: "spring",
        stiffness: 300,
        damping: 30,
      });
    }
  }, [index, x]);

  return (
    <div className="relative overflow-hidden" ref={containerRef}>
      <motion.div className="flex" style={{ x }}>
        {items.map((item) => (
          <div key={item.id} className="w-full shrink-0 px-1">
            <div
              className={
                flush
                  ? "relative aspect-[16/9] overflow-hidden rounded-[18px] bg-muted/30"
                  : "overflow-hidden rounded-[22px] bg-[linear-gradient(180deg,rgba(247,248,250,0.96),rgba(241,244,247,0.9))] shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_24px_60px_rgba(15,23,42,0.1)] ring-1 ring-black/8 dark:bg-[linear-gradient(180deg,rgba(24,28,36,0.96),rgba(16,20,27,0.96))] dark:ring-white/10"
              }
            >
              <div
                className={
                  flush
                    ? "h-full w-full"
                    : "relative m-2 aspect-[16/9] overflow-hidden rounded-[18px] bg-muted/30 shadow-[0_1px_0_rgba(255,255,255,0.75)_inset] ring-1 ring-black/10 dark:ring-white/10"
                }
              >
                {item.media}
              </div>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
