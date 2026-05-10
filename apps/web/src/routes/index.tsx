import { createFileRoute, Link } from "@tanstack/react-router";

import { useState } from "react";
import Header from "@/components/layout/Header";
import { m } from "@/paraglide/messages";
import { Button } from "@/components/ui/button";
import { FeaturesBento } from "@/components/ui/features-bento";
import Footer from "@/components/layout/Footer";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePageInner() {
  const [isHeroPreviewExpanded, setIsHeroPreviewExpanded] = useState(false);

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
              decoding="async"
            />
          </div>
          <div className="relative z-10 flex h-full w-full max-w-5xl flex-col items-start pt-16 text-left sm:pt-20 lg:pt-24">
            <p
              className="mb-3 max-w-3xl font-serif leading-tight text-white"
              style={{ fontSize: "clamp(2.25rem, 6vw, 3.75rem)" }}
            >
              <>
                {m.hero_line1()}{" "}
                <span className="italic">{m.hero_line2_word()}</span>
                <br />
                {m.hero_line2()}{" "}
                <span className="italic text-primary">{m.hero_line3()}</span>
              </>
            </p>
            <p className="mb-6 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">
              {m.hero_subtitle()}
            </p>
            <div className="flex flex-wrap items-center justify-start gap-3">
              <Button
                asChild
                className="h-auto rounded-2xl px-6 py-3 shadow-sm"
              >
                <Link to="/dashboard">{m.open_dashboard()}</Link>
              </Button>
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
                className="h-full w-full object-cover object-top dark:hidden"
                loading="lazy"
                decoding="async"
              />
              <img
                src="/hero/hero-dark.png"
                alt="OrchOS Hero"
                className="hidden h-full w-full object-cover object-top dark:block"
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
