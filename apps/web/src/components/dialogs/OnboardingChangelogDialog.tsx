import { useEffect, useState } from "react";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { FramerCarousel, type CarouselItem } from "@/components/ui/framer-carousel";
import { cn } from "@/lib/utils";
import {
  dismiss,
  next,
  previous,
  welcome_to_orchos,
  agents,
  creation,
  bookmarks,
  board,
  calendar,
  mail,
  observability,
  onboarding_agents_desc,
  onboarding_creation_desc,
  onboarding_bookmarks_desc,
  onboarding_board_desc,
  onboarding_calendar_desc,
  onboarding_mail_desc,
  onboarding_observability_desc,
} from "@/paraglide/messages";

function OnboardingPreviewImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={`h-full w-full object-cover object-top ${className ?? ""}`}
      loading="lazy"
      draggable={false}
    />
  );
}

const ONBOARDING_SECTIONS: CarouselItem[] = [
  {
    id: "agents",
    media: (
      <OnboardingPreviewImage
        src="/hero/bento1.png"
        alt="Agents configuration preview"
      />
    ),
    title: agents(),
    desc: onboarding_agents_desc(),
  },
  {
    id: "creation",
    media: (
      <OnboardingPreviewImage
        src="/hero/hero.png"
        alt="Creation workspace preview"
      />
    ),
    title: creation(),
    desc: onboarding_creation_desc(),
  },
  {
    id: "bookmarks",
    media: (
      <OnboardingPreviewImage
        src="/hero/bento2.png"
        alt="Bookmarks workspace preview"
      />
    ),
    title: bookmarks(),
    desc: onboarding_bookmarks_desc(),
  },
  {
    id: "board",
    media: (
      <OnboardingPreviewImage
        src="/hero/hero.png"
        alt="Board workspace preview"
      />
    ),
    title: board(),
    desc: onboarding_board_desc(),
  },
  {
    id: "calendar",
    media: (
      <OnboardingPreviewImage
        src="/hero/bento2.png"
        alt="Calendar workspace preview"
      />
    ),
    title: calendar(),
    desc: onboarding_calendar_desc(),
  },
  {
    id: "mail",
    media: (
      <OnboardingPreviewImage
        src="/hero/bento1.png"
        alt="Mail workspace preview"
      />
    ),
    title: mail(),
    desc: onboarding_mail_desc(),
  },
  {
    id: "observability",
    media: (
      <OnboardingPreviewImage
        src="/hero/hero.png"
        alt="Observability workspace preview"
      />
    ),
    title: observability(),
    desc: onboarding_observability_desc(),
  },
];

interface OnboardingChangelogDialogProps {
  open: boolean;
  onClose: () => void;
}

export function OnboardingChangelogDialog({ open, onClose }: OnboardingChangelogDialogProps) {
  const [index, setIndex] = useState(0);
  const isFirstSlide = index === 0;
  const isLastSlide = index === ONBOARDING_SECTIONS.length - 1;
  useEffect(() => {
    if (open) {
      setIndex(0);
    }
  }, [open]);

  return (
    <AppDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      title={welcome_to_orchos()}
      description={
        <div className="flex items-center gap-2 pt-1">
          {ONBOARDING_SECTIONS.map((section, sectionIndex) => (
            <button
              key={section.id}
              type="button"
              aria-label={`Go to ${section.title}`}
              onClick={() => setIndex(sectionIndex)}
              className={`h-1.5 rounded-full transition-[width,background-color,opacity] ${
                sectionIndex === index
                  ? "w-6 bg-primary"
                  : "w-2.5 bg-muted-foreground/20 hover:bg-muted-foreground/35"
              }`}
            />
          ))}
        </div>
      }
      size="lg"
      className="max-w-4xl"
      bodyClassName="p-3 md:p-4"
    >
      <div className="flex h-full flex-col gap-3">
        <FramerCarousel
          items={ONBOARDING_SECTIONS}
          index={index}
          onIndexChange={setIndex}
          flush
        />
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
          <div className="grid min-w-0">
            {ONBOARDING_SECTIONS.map((section, i) => (
              <div
                key={section.id}
                className={cn(
                  "col-span-full row-span-full",
                  i !== index && "invisible",
                )}
              >
                <div className="text-[15px] font-semibold text-foreground [text-wrap:balance]">
                  {section.title}
                </div>
                <div className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground [text-wrap:pretty]">
                  {section.desc}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              type="button"
              variant="outline"
              disabled={isFirstSlide}
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
            >
              {previous()}
            </Button>
            <Button
              size="sm"
              type="button"
              onClick={() => {
                if (isLastSlide) {
                  onClose();
                  return;
                }

                setIndex((current) =>
                  Math.min(ONBOARDING_SECTIONS.length - 1, current + 1),
                );
              }}
            >
              {isLastSlide ? dismiss() : next()}
            </Button>
          </div>
        </div>
      </div>
    </AppDialog>
  );
}
