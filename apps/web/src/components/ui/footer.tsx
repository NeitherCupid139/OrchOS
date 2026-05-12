import { Link } from "@tanstack/react-router";
import { about_orchos, footer_company, footer_help_center, footer_product, footer_resources, footer_rights, integration_github, nav_about, nav_changelog, nav_home, open_dashboard, privacy_policy, terms_of_service } from "@/paraglide/messages";

const COPYRIGHT_YEAR = new Date().getFullYear();

function FooterLink({ to, label }: { to: string; label: string }) {
  const isExternal = to.startsWith("http");

  if (isExternal) {
    return (
      <a
        href={to}
        target="_blank"
        rel="noreferrer"
        className="text-muted-foreground hover:text-foreground transition-colors text-xs md:text-sm"
      >
        {label}
      </a>
    );
  }

  return (
    <Link
      to={to}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="text-muted-foreground hover:text-foreground transition-colors text-xs md:text-sm"
    >
      {label}
    </Link>
  );
}

function FooterSection({
  links,
}: {
  links: { label: string; to: string }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      {links.map((link) => (
        <FooterLink key={link.label} to={link.to} label={link.label} />
      ))}
    </div>
  );
}

export default function Footer() {
  const sections = [
    {
      title: footer_product(),
      links: [
        { label: nav_home(), to: "/" },
        { label: open_dashboard(), to: "/dashboard" },
        { label: nav_changelog(), to: "/changelog" },
      ],
    },
    {
      title: footer_company(),
      links: [
        { label: nav_about(), to: "/about" },
        { label: integration_github(), to: "https://github.com/NeitherCupid139/OrchOS" },
      ],
    },
    {
      title: footer_resources(),
      links: [
        { label: terms_of_service(), to: "/terms" },
        { label: privacy_policy(), to: "/privacy" },
        { label: footer_help_center(), to: "#" },
      ],
    },
  ];

  const copyright = `©${COPYRIGHT_YEAR} ${about_orchos()}. ${footer_rights()}`;

  return (
    <footer className="bg-card py-10 md:py-16 px-4 md:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12 lg:gap-20">
          {sections.map((section) => (
            <FooterSection key={section.title} links={section.links} />
          ))}
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mt-12 pt-8">
          <h2
            className="font-serif italic text-foreground leading-none"
            style={{ fontSize: "clamp(3rem, 8vw, 6rem)" }}
          >
            {about_orchos()}
          </h2>
          <p className="text-muted-foreground text-xs md:text-sm">
            {copyright}
          </p>
        </div>
      </div>
    </footer>
  );
}
