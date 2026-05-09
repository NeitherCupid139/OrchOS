import { createFileRoute } from "@tanstack/react-router";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/about")({
  component: About,
});

function About() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-16">
          <h1 className="mb-2 text-4xl font-semibold text-foreground">
            {m.about_orchos()}
          </h1>
          <p className="mb-12 text-lg text-muted-foreground">
            {m.landing_subtitle()}
          </p>

          <div className="space-y-12 text-foreground">
            <div>
              <h2 className="mb-4 text-xl font-semibold">
                {m.about_why_title()}
              </h2>
              <div className="space-y-4 text-muted-foreground leading-7">
                <p>{m.about_why_p1()}</p>
                <p>{m.about_why_p2()}</p>
                <p>{m.about_why_p3()}</p>
                <p>
                  {m.about_why_p4_prefix()}{" "}
                  <strong className="text-foreground">
                    {m.about_why_p4_what()}
                  </strong>{" "}
                  {m.about_why_p4_middle()}{" "}
                  <strong className="text-foreground">
                    {m.about_why_p4_how()}
                  </strong>{" "}
                  {m.about_why_p4_suffix()}
                </p>
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-xl font-semibold">
                {m.about_core_title()}
              </h2>
              <div className="space-y-4 text-muted-foreground leading-7">
                <p>
                  <strong className="text-foreground">
                    {m.about_core_item1_label()}
                  </strong>{" "}
                  {m.about_em_dash()} {m.about_core_item1_desc()}
                </p>
                <p>
                  <strong className="text-foreground">
                    {m.about_core_item2_label()}
                  </strong>{" "}
                  {m.about_em_dash()} {m.about_core_item2_desc()}
                </p>
                <p>
                  <strong className="text-foreground">
                    {m.about_core_item3_label()}
                  </strong>{" "}
                  {m.about_em_dash()} {m.about_core_item3_desc()}
                </p>
                <p>
                  <strong className="text-foreground">
                    {m.about_core_item4_label()}
                  </strong>{" "}
                  {m.about_em_dash()} {m.about_core_item4_desc()}
                </p>
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-xl font-semibold">
                {m.about_problems_title()}
              </h2>
              <div className="space-y-4 text-muted-foreground leading-7">
                <p>
                  <strong className="text-foreground">
                    {m.about_problem1_label()}
                  </strong>{" "}
                  {m.about_em_dash()} {m.about_problem1_desc()}
                </p>
                <p>
                  <strong className="text-foreground">
                    {m.about_problem2_label()}
                  </strong>{" "}
                  {m.about_em_dash()} {m.about_problem2_desc()}
                </p>
                <p>
                  <strong className="text-foreground">
                    {m.about_problem3_label()}
                  </strong>{" "}
                  {m.about_em_dash()} {m.about_problem3_desc()}
                </p>
                <p>
                  <strong className="text-foreground">
                    {m.about_problem4_label()}
                  </strong>{" "}
                  {m.about_em_dash()} {m.about_problem4_desc()}
                </p>
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-xl font-semibold">
                {m.about_users_title()}
              </h2>
              <div className="space-y-4 text-muted-foreground leading-7">
                <p>
                  <strong className="text-foreground">
                    {m.about_user1_label()}
                  </strong>{" "}
                  {m.about_em_dash()} {m.about_user1_desc()}
                </p>
                <p>
                  <strong className="text-foreground">
                    {m.about_user2_label()}
                  </strong>{" "}
                  {m.about_em_dash()} {m.about_user2_desc()}
                </p>
                <p>
                  <strong className="text-foreground">
                    {m.about_user3_label()}
                  </strong>{" "}
                  {m.about_em_dash()} {m.about_user3_desc()}
                </p>
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-xl font-semibold">
                {m.about_future_title()}
              </h2>
              <div className="space-y-4 text-muted-foreground leading-7">
                <p>{m.about_future_p1()}</p>
                <p>{m.about_future_p2()}</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
