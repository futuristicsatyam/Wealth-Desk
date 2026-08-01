import { Quote, Star } from "lucide-react";

type Review = {
  id: string;
  authorName: string;
  authorRole: string | null;
  quote: string;
  rating: number | null;
};

export function TestimonialsCarousel({ reviews }: { reviews: Review[] }) {
  return (
    <div className="relative mt-14">
      <div className="-mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="relative flex w-[80%] shrink-0 snap-start flex-col rounded-2xl border border-border bg-card p-6 transition-colors duration-200 hover:border-border-strong sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)]"
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
          </div>
        ))}
      </div>
    </div>
  );
}
