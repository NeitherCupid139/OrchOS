import { createFileRoute } from "@tanstack/react-router";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { about_core_item1_desc, about_core_item1_label, about_core_item2_desc, about_core_item2_label, about_core_item3_desc, about_core_item3_label, about_core_item4_desc, about_core_item4_label, about_core_title, about_em_dash, about_future_p1, about_future_p2, about_future_title, about_orchos, about_problem1_desc, about_problem1_label, about_problem2_desc, about_problem2_label, about_problem3_desc, about_problem3_label, about_problem4_desc, about_problem4_label, about_problems_title, about_user1_desc, about_user1_label, about_user2_desc, about_user2_label, about_user3_desc, about_user3_label, about_users_title, about_why_p1, about_why_p2, about_why_p3, about_why_p4_how, about_why_p4_middle, about_why_p4_prefix, about_why_p4_suffix, about_why_p4_what, about_why_title, landing_subtitle } from "@/paraglide/messages";

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
            {about_orchos()}
          </h1>
          <p className="mb-12 text-lg text-muted-foreground">
            {landing_subtitle()}
          </p>

          <div className="space-y-12 text-foreground">
            <div>
              <h2 className="mb-4 text-xl font-semibold">
                {about_why_title()}
              </h2>
              <div className="space-y-4 text-muted-foreground leading-7">
                <p>{about_why_p1()}</p>
                <p>{about_why_p2()}</p>
                <p>{about_why_p3()}</p>
                <p>
                  {about_why_p4_prefix()}{" "}
                  <strong className="text-foreground">
                    {about_why_p4_what()}
                  </strong>{" "}
                  {about_why_p4_middle()}{" "}
                  <strong className="text-foreground">
                    {about_why_p4_how()}
                  </strong>{" "}
                  {about_why_p4_suffix()}
                </p>
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-xl font-semibold">
                {about_core_title()}
              </h2>
              <div className="space-y-4 text-muted-foreground leading-7">
                <p>
                  <strong className="text-foreground">
                    {about_core_item1_label()}
                  </strong>{" "}
                  {about_em_dash()} {about_core_item1_desc()}
                </p>
                <p>
                  <strong className="text-foreground">
                    {about_core_item2_label()}
                  </strong>{" "}
                  {about_em_dash()} {about_core_item2_desc()}
                </p>
                <p>
                  <strong className="text-foreground">
                    {about_core_item3_label()}
                  </strong>{" "}
                  {about_em_dash()} {about_core_item3_desc()}
                </p>
                <p>
                  <strong className="text-foreground">
                    {about_core_item4_label()}
                  </strong>{" "}
                  {about_em_dash()} {about_core_item4_desc()}
                </p>
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-xl font-semibold">
                {about_problems_title()}
              </h2>
              <div className="space-y-4 text-muted-foreground leading-7">
                <p>
                  <strong className="text-foreground">
                    {about_problem1_label()}
                  </strong>{" "}
                  {about_em_dash()} {about_problem1_desc()}
                </p>
                <p>
                  <strong className="text-foreground">
                    {about_problem2_label()}
                  </strong>{" "}
                  {about_em_dash()} {about_problem2_desc()}
                </p>
                <p>
                  <strong className="text-foreground">
                    {about_problem3_label()}
                  </strong>{" "}
                  {about_em_dash()} {about_problem3_desc()}
                </p>
                <p>
                  <strong className="text-foreground">
                    {about_problem4_label()}
                  </strong>{" "}
                  {about_em_dash()} {about_problem4_desc()}
                </p>
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-xl font-semibold">
                {about_users_title()}
              </h2>
              <div className="space-y-4 text-muted-foreground leading-7">
                <p>
                  <strong className="text-foreground">
                    {about_user1_label()}
                  </strong>{" "}
                  {about_em_dash()} {about_user1_desc()}
                </p>
                <p>
                  <strong className="text-foreground">
                    {about_user2_label()}
                  </strong>{" "}
                  {about_em_dash()} {about_user2_desc()}
                </p>
                <p>
                  <strong className="text-foreground">
                    {about_user3_label()}
                  </strong>{" "}
                  {about_em_dash()} {about_user3_desc()}
                </p>
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-xl font-semibold">
                {about_future_title()}
              </h2>
              <div className="space-y-4 text-muted-foreground leading-7">
                <p>{about_future_p1()}</p>
                <p>{about_future_p2()}</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
