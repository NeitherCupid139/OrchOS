import { useEffect, useState } from "react";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { FramerCarousel, type CarouselItem } from "@/components/ui/framer-carousel";
import { m } from "@/paraglide/messages";

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
    id: "creation",
    media: (
      <OnboardingPreviewImage
        src="/hero/hero.png"
        alt="Creation workspace preview"
      />
    ),
    title: "Creation",
    desc: "Your AI command center — chat, search, and create with agents all in one place.",
  },
  {
    id: "inbox",
    media: (
      <OnboardingPreviewImage
        src="/hero/bento2.png"
        alt="Inbox workspace preview"
      />
    ),
    title: "Inbox",
    desc: "Review GitHub updates, mentions, and agent activity in a single triage surface.",
  },
  {
    id: "runtimes",
    media: (
      <OnboardingPreviewImage
        src="/hero/bento1.png"
        alt="Runtimes setup preview"
      />
    ),
    title: "Runtimes",
    desc: "Detect local coding runtimes, connect them, and bring agents online without leaving the app.",
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
      title={m.welcome_to_orchos()}
      size="lg"
      className="max-w-4xl"
      bodyClassName="p-5 md:p-6"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              type="button"
              variant="outline"
              disabled={isFirstSlide}
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
            >
              上一页
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
              {isLastSlide ? m.dismiss() : "下一页"}
            </Button>
          </div>
        </div>
      }
    >
      <FramerCarousel
        items={ONBOARDING_SECTIONS}
        index={index}
        onIndexChange={setIndex}
      />
    </AppDialog>
  );
}
