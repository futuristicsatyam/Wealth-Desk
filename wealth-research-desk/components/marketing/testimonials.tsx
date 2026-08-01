import { Reveal } from "@/components/motion/reveal";
import { TestimonialsCarousel } from "@/components/marketing/testimonials-carousel";

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
 * published reviews, so the section never shows empty. Cards live in a
 * horizontally scrollable carousel so the section scales to many reviews.
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

      <TestimonialsCarousel reviews={reviews} />
    </section>
  );
}
