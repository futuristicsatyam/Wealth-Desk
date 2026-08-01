import { Quote, Star } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";

type Review = {
  id: string;
  authorName: string;
  authorRole: string | null;
  quote: string;
  rating: number | null;
};

/**
 * Member service-feedback section for the home page. Deliberately frames these
 * as experience-of-the-service feedback — no returns/performance claims — to
 * stay within SEBI's advertisement code. Renders nothing when there are no
 * published reviews, so the section never shows empty.
 */
export function Testimonials({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return null;

  return (
    <section className="container-page py-20 md:py-28">
      <Reveal className="mx-auto max-w-2xl text-center sm:mx-0 sm:text-left">
        <p className="text-xs uppercase tracking-[0.22em] text-accent">Member feedback</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
          What members say about the desk
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
          Feedback on the research experience — discipline, clarity and risk-first thinking.
        </p>
      </Reveal>

      <Stagger className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review) => (
          <StaggerItem
            key={review.id}
            className="relative flex flex-col rounded-2xl border border-border bg-card p-6 transition-colors duration-200 hover:border-border-strong"
          >
            <Quote size={20} className="text-accent/40" aria-hidden />
            {review.rating != null && (
              <div className="mt-3 flex gap-0.5" aria-label={`${review.rating} out of 5`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={i < review.rating! ? "fill-accent text-accent" : "text-border-strong"}
                  />
                ))}
              </div>
            )}
            <p className="mt-3 flex-1 text-sm leading-relaxed text-foreground/90">“{review.quote}”</p>
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-sm font-semibold">{review.authorName}</p>
              {review.authorRole && <p className="text-xs text-muted">{review.authorRole}</p>}
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
