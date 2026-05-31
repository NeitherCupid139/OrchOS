import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { docs_audio_open_link } from "@/paraglide/messages";

export function DocsSection({
  title,
  cards,
  columns,
}: {
  title: string;
  cards: ReadonlyArray<{
    href: string;
    title: () => string;
    description: () => string;
  }>;
  columns: string;
}) {
  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
      <div className={`grid gap-4 ${columns}`}>
        {cards.map((card) => (
          <Card
            key={card.href}
            className="border border-border/80 bg-card/70 py-0 transition-colors hover:bg-card"
          >
            <CardHeader className="pt-5">
              <CardTitle>{card.title()}</CardTitle>
              <CardDescription>{card.description()}</CardDescription>
            </CardHeader>
            <CardContent className="pb-5">
              <Button asChild variant="outline">
                <Link to={card.href}>{docs_audio_open_link()}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
