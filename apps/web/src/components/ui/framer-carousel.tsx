import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, animate } from "motion/react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";

export interface CarouselItem {
  id: string;
  icon: IconSvgElement;
  title: string;
  desc: string;
}

export function FramerCarousel({ items }: { items: CarouselItem[] }) {
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);

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
    <div className="relative overflow-hidden rounded-lg" ref={containerRef}>
      <motion.div className="flex" style={{ x }}>
        {items.map((item) => (
          <div key={item.id} className="flex w-full shrink-0 items-start gap-3 px-1">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <HugeiconsIcon icon={item.icon} className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{item.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{item.desc}</div>
            </div>
          </div>
        ))}
      </motion.div>

      {items.length > 1 ? (
        <>
          <button
            type="button"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            className={`absolute left-0 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full shadow-sm transition-opacity ${
              index === 0
                ? "pointer-events-none opacity-20"
                : "bg-popover opacity-70 hover:opacity-100"
            }`}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
          </button>

          <button
            type="button"
            disabled={index === items.length - 1}
            onClick={() => setIndex((i) => Math.min(items.length - 1, i + 1))}
            className={`absolute right-0 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full shadow-sm transition-opacity ${
              index === items.length - 1
                ? "pointer-events-none opacity-20"
                : "bg-popover opacity-70 hover:opacity-100"
            }`}
          >
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
          </button>

          <div className="mt-2 flex justify-center gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index
                    ? "w-5 bg-primary"
                    : "w-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/40"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
