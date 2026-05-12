import React from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MenuToggleIcon } from "@/components/ui/menu-toggle-icon";
import { useScroll } from "@/components/ui/use-scroll";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import ThemeToggle from "@/components/layout/ThemeToggle";
import LocaleToggle from "@/components/layout/LocaleToggle";
import { nav_about, nav_changelog, nav_home, toggle_menu } from "@/paraglide/messages";
import { HugeiconsIcon } from "@hugeicons/react";
import { GithubIcon } from "@hugeicons/core-free-icons";

const starCountFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function Header() {
  const [open, setOpen] = React.useState(false);
  const scrolled = useScroll(10);
  const [starCount, setStarCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    fetch("/api/github-stars")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (typeof (data as { stargazers_count?: number }).stargazers_count === "number") {
          setStarCount((data as { stargazers_count: number }).stargazers_count);
        }
      })
      .catch(() => {});
  }, []);

  const formattedStarCount =
    starCount === null
      ? null
      : starCountFormatter.format(starCount);

  const links = [
    {
      label: nav_home(),
      to: "/",
    },
    {
      label: nav_changelog(),
      to: "/changelog",
    },
    {
      label: nav_about(),
      to: "/about",
    },
  ];

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-background/95 supports-[backdrop-filter]:bg-background/50 backdrop-blur-lg",
        {
          "border-border": scrolled,
          "border-transparent": !scrolled,
        },
      )}
    >
      <nav className="flex h-14 w-full items-center justify-between pl-6 pr-4">
        <Link to="/" className="hover:bg-accent flex items-center gap-2 rounded-md p-2 ml-32">
          <OrchOSLogoIcon className="size-6" />
          <span className="font-serif text-sm font-semibold italic text-foreground">OrchOS</span>
        </Link>
        <div className="hidden items-center gap-2 md:flex">
          {links.map((link) => (
            <Link key={link.label} className={buttonVariants({ variant: "ghost" })} to={link.to}>
              {link.label}
            </Link>
          ))}
          <a
            href="https://github.com/NeitherCupid139/OrchOS"
            target="_blank"
            rel="noreferrer"
            className="mr-20"
          >
            <Button variant="outline">
              <HugeiconsIcon icon={GithubIcon} className="size-4" />
              GitHub
              {formattedStarCount ? (
                <span className="text-xs text-muted-foreground">{formattedStarCount}</span>
              ) : null}
            </Button>
          </a>
          <div className="ml-auto flex items-center gap-1">
            <LocaleToggle />
            <ThemeToggle />
          </div>
        </div>
        <Button
          size="icon"
          variant="outline"
          onClick={() => setOpen(!open)}
          className="md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={toggle_menu()}
        >
          <MenuToggleIcon open={open} className="size-5" duration={300} />
        </Button>
      </nav>
      <MobileMenu open={open} className="flex flex-col justify-between gap-2">
        <div className="grid gap-y-2">
          {links.map((link) => (
            <Link
              key={link.label}
              className={buttonVariants({
                variant: "ghost",
                className: "justify-start",
              })}
              to={link.to}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <LocaleToggle />
          <ThemeToggle />
          <a
            href="https://github.com/NeitherCupid139/OrchOS"
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
          >
            <Button variant="outline" className="w-full bg-transparent">
              <HugeiconsIcon icon={GithubIcon} className="size-4" />
              GitHub
              {formattedStarCount ? (
                <span className="text-xs text-muted-foreground">{formattedStarCount}</span>
              ) : null}
            </Button>
          </a>
        </div>
      </MobileMenu>
    </header>
  );
}

type MobileMenuProps = React.ComponentProps<"div"> & {
  open: boolean;
};

function MobileMenu({ open, children, className, ...props }: MobileMenuProps) {
  if (!open || typeof window === "undefined") return null;

  return createPortal(
    <div
      id="mobile-menu"
      className={cn(
        "bg-background/95 supports-[backdrop-filter]:bg-background/50 backdrop-blur-lg",
        "fixed top-14 right-0 bottom-0 left-0 z-40 flex flex-col overflow-hidden border-y md:hidden",
      )}
    >
      <div
        data-slot={open ? "open" : "closed"}
        className={cn(
          "data-[slot=open]:animate-in data-[slot=open]:zoom-in-97 ease-out",
          "size-full p-4",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export const OrchOSLogoIcon = (props: React.ComponentProps<"svg">) => (
  <svg viewBox="0 0 185 185" fill="none" {...props}>
    <rect width="185" height="185" rx="38" fill="#0048EF" />
    <circle cx="77" cy="86" r="40" stroke="white" strokeWidth="16" />
    <circle cx="77" cy="86" r="17.5" stroke="white" strokeWidth="15" />
    <rect x="67" y="106" width="20" height="41" fill="white" />
    <rect x="117" y="86" width="20" height="41" fill="white" />
    <rect x="137" y="107" width="20" height="40" fill="white" />
    <rect x="67" y="147" width="20" height="50" transform="rotate(-90 67 147)" fill="white" />
    <rect x="117" y="127" width="20" height="35" transform="rotate(-90 117 127)" fill="white" />
  </svg>
);
