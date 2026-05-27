import { createFileRoute, Link } from "@tanstack/react-router";

import { useState } from "react";
import Header from "@/components/layout/Header";
import {
  hero_line1,
  hero_line2,
  hero_line2_word,
  hero_line3,
  hero_subtitle,
  open_dashboard,
} from "@/paraglide/messages";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { GithubIcon } from "@hugeicons/core-free-icons";
import { useGitHubStars } from "@/lib/hooks/use-github-stars";
import { FeaturesBento } from "@/components/ui/features-bento";
import Footer from "@/components/layout/Footer";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePageInner() {
  const [isHeroPreviewExpanded, setIsHeroPreviewExpanded] = useState(false);
  const { formattedStarCount } = useGitHubStars();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="relative flex h-screen -mt-14 items-start justify-center overflow-hidden px-6 pt-14 sm:px-10 lg:px-14">
          <div className="absolute inset-0 z-0">
            <img
              src="/hero/background.png"
              alt=""
              className="size-full object-cover"
              width={1440}
              height={900}
              decoding="async"
            />
          </div>
          <div className="relative z-10 flex h-full w-full max-w-5xl flex-col items-start pt-16 text-left sm:pt-20 lg:pt-24">
            <p
              className="mb-3 max-w-3xl font-serif leading-tight text-white"
              style={{ fontSize: "clamp(2.25rem, 6vw, 3.75rem)" }}
            >
              <>
                {hero_line1()}{" "}
                <span className="italic">{hero_line2_word()}</span>
                <br />
                {hero_line2()}{" "}
                <span className="italic text-primary">{hero_line3()}</span>
              </>
            </p>
            <p className="mb-6 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">
              {hero_subtitle()}
            </p>
            <div className="flex flex-wrap items-center justify-start gap-3">
              <Button asChild className="h-11 rounded-2xl px-6 py-3 shadow-sm">
                <Link to="/dashboard">{open_dashboard()}</Link>
              </Button>
              <a
                href="https://github.com/NeitherCupid139/OrchOS"
                target="_blank"
                rel="noreferrer"
              >
                <Button
                  variant="outline"
                  className="h-11 rounded-2xl px-6 py-3 shadow-sm text-white border-white/20 bg-transparent hover:bg-white/10 hover:text-white"
                >
                  <HugeiconsIcon icon={GithubIcon} className="size-4" />
                  GitHub
                  {formattedStarCount ? (
                    <span className="text-xs text-white/60">
                      {formattedStarCount}
                    </span>
                  ) : null}
                </Button>
              </a>
            </div>

            <div
              onMouseEnter={() => setIsHeroPreviewExpanded(true)}
              onMouseLeave={() => setIsHeroPreviewExpanded(false)}
              className={`group mt-auto w-full self-center overflow-hidden rounded-t-md border-x border-t border-white/10 bg-black/20 shadow-2xl backdrop-blur-sm transition-[height] duration-500 ease-out ${
                isHeroPreviewExpanded
                  ? "h-[260px] sm:h-[320px] lg:h-[400px]"
                  : "h-[180px] sm:h-[220px] lg:h-[260px]"
              }`}
            >
              <img
                src="/hero/hero.png"
                alt="OrchOS Hero"
                className="h-full w-full object-contain sm:object-cover object-top dark:hidden"
                width={1200}
                height={800}
                loading="lazy"
                decoding="async"
              />
              <img
                src="/hero/hero-dark.png"
                alt="OrchOS Hero"
                className="hidden h-full w-full object-contain sm:object-cover object-top dark:block"
                width={1200}
                height={800}
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </section>

        <FeaturesBento />
      </main>
      <Footer />
    </div>
  );
}

function HomePage() {
  return <HomePageInner />;
}
