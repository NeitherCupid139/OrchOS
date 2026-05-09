import type { ReactNode, Ref } from "react";
import { memo, useId } from "react";
import { m, LazyMotion, domAnimation, useReducedMotion } from "motion/react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ICON_VARIANTS = {
  left: {
    initial: { scale: 0.8, opacity: 0, x: 0, y: 0, rotate: 0 },
    animate: { scale: 1, opacity: 1, x: 0, y: 0, rotate: -6, transition: { duration: 0.4, delay: 0.1 } },
    hover: { x: -22, y: -5, rotate: -15, scale: 1.1, transition: { duration: 0.2 } },
  },
  center: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: { duration: 0.4, delay: 0.2 } },
    hover: { y: -10, scale: 1.15, transition: { duration: 0.2 } },
  },
  right: {
    initial: { scale: 0.8, opacity: 0, x: 0, y: 0, rotate: 0 },
    animate: { scale: 1, opacity: 1, x: 0, y: 0, rotate: 6, transition: { duration: 0.4, delay: 0.3 } },
    hover: { x: 22, y: -5, rotate: 15, scale: 1.1, transition: { duration: 0.2 } },
  },
} as const;

const CONTENT_VARIANTS = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: { duration: 0.4, delay: 0.2 } },
};

const BUTTON_VARIANTS = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: { duration: 0.4, delay: 0.3 } },
};

const IconContainer = memo(function IconContainer({
  children,
  variant,
  className = "",
}: {
  children: ReactNode;
  variant: keyof typeof ICON_VARIANTS;
  className?: string;
}) {
  return (
    <m.div
      variants={ICON_VARIANTS[variant]}
      className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center relative shadow-lg transition-all duration-300 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 group-hover:shadow-xl group-hover:border-gray-300 dark:group-hover:border-neutral-600",
        className,
      )}
    >
      <div className="text-sm transition-colors duration-300 text-gray-500 dark:text-neutral-400 group-hover:text-gray-700 dark:group-hover:text-neutral-200">
        {children}
      </div>
    </m.div>
  );
});

const MultiIconDisplay = memo(function MultiIconDisplay({
  icons,
}: {
  icons: ReactNode[];
}) {
  if (icons.length < 3) return null;

  return (
    <div className="flex justify-center isolate relative">
      <IconContainer variant="left" className="left-2 top-1 z-10">
        {icons[0]}
      </IconContainer>
      <IconContainer variant="center" className="z-20">
        {icons[1]}
      </IconContainer>
      <IconContainer variant="right" className="right-2 top-1 z-10">
        {icons[2]}
      </IconContainer>
    </div>
  );
});

function Background() {
  return null;
}

const emptyStateVariantClasses: Record<string, string> = {
  default: "border-dashed border-2 border-gray-300 dark:border-neutral-700",
  subtle: "border border-transparent",
  error: "border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/50",
};

type EmptyStateVariant = keyof typeof emptyStateVariantClasses;
type EmptyStateSize = "sm" | "default" | "lg";

const sizeClasses: Record<EmptyStateSize, string> = {
  sm: "p-6",
  default: "p-8",
  lg: "p-12",
};

const titleSizeClasses: Record<EmptyStateSize, string> = {
  sm: "text-base",
  default: "text-lg",
  lg: "text-xl",
};

const descriptionSizeClasses: Record<EmptyStateSize, string> = {
  sm: "text-xs",
  default: "text-sm",
  lg: "text-base",
};

export type EmptyStateAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon?: ReactNode;
};

export type EmptyStateProps = {
  title: string;
  description?: string;
  icons?: ReactNode[];
  action?: EmptyStateAction;
  variant?: EmptyStateVariant;
  size?: EmptyStateSize;
  isIconAnimated?: boolean;
  className?: string;
  ref?: Ref<HTMLElement>;
};

export function EmptyState(
  {
    title,
    description,
    icons,
    action,
    variant = "default",
    size = "default",
    isIconAnimated = true,
    className = "",
    ref,
  }: EmptyStateProps
) {
  const titleId = useId();
  const descriptionId = useId();
  const shouldReduceMotion = useReducedMotion();

  return (
    <LazyMotion features={domAnimation}>
      <m.section
        ref={ref}
        role="region"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          "group relative flex flex-col items-center justify-center overflow-hidden rounded-xl text-center transition-all duration-300 motion-reduce:transition-none",
          sizeClasses[size],
          emptyStateVariantClasses[variant],
          className,
        )}
        initial={shouldReduceMotion ? false : "initial"}
        animate={shouldReduceMotion ? undefined : "animate"}
        whileHover={shouldReduceMotion || !isIconAnimated ? undefined : "hover"}
      >
        <Background />
        <div className="relative z-10 flex flex-col items-center">
          {icons && (
            <div className="mb-6">
              <MultiIconDisplay icons={icons} />
            </div>
          )}

          <m.div variants={CONTENT_VARIANTS} className="space-y-2 mb-6">
            <h2 id={titleId} className={cn("font-semibold transition-colors duration-200 text-zinc-900 dark:text-neutral-100", titleSizeClasses[size])}>
              {title}
            </h2>
            {description && (
              <p
                id={descriptionId}
                className={cn("max-w-md leading-relaxed transition-colors duration-200 text-zinc-600 dark:text-neutral-400", descriptionSizeClasses[size])}
              >
                {description}
              </p>
            )}
          </m.div>

          {action && (
            <m.div variants={BUTTON_VARIANTS}>
              <Button type="button" onClick={action.onClick} disabled={action.disabled}>
                {action.icon ? (
                  <m.span
                    className="transition-transform group-hover/button:rotate-90 motion-reduce:transition-none"
                    whileHover={shouldReduceMotion ? undefined : { rotate: 90 }}
                  >
                    {action.icon}
                  </m.span>
                ) : (
                  <Plus className="size-4" />
                )}
                {action.label}
              </Button>
            </m.div>
          )}
        </div>
      </m.section>
    </LazyMotion>
  );
}
