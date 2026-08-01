import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ReviewForm } from "@/components/admin/review-form";
import { VideoTestimonialForm } from "@/components/admin/video-testimonial-form";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import {
  toggleReviewPublishedAction,
  deleteReviewAction,
  toggleVideoTestimonialPublishedAction,
  deleteVideoTestimonialAction
} from "@/app/admin/actions";

export const dynamic = "force-dynamic";

type ReviewRowData = {
  id: string;
  authorName: string;
  authorRole: string | null;
  quote: string;
  rating: number | null;
  isPublished: boolean;
  sortOrder: number;
  userId: string | null;
  createdAt: Date;
  submittedBy: { name: string; email: string } | null;
};

function ReviewRow({ review }: { review: ReviewRowData }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">{review.authorName}</p>
            {review.rating != null && (
              <span className="text-xs text-accent" aria-label={`${review.rating} out of 5`}>
                {"★".repeat(review.rating)}
                <span className="text-muted">{"★".repeat(5 - review.rating)}</span>
              </span>
            )}
            <Badge tone={review.userId ? "accent" : "neutral"}>
              {review.userId ? "Member submission" : "Admin"}
            </Badge>
            <Badge tone={review.isPublished ? "success" : "warning"}>
              {review.isPublished ? "Published" : "Pending"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted">“{review.quote}”</p>
          <p className="mt-1 text-xs text-muted">
            {review.authorRole ? `${review.authorRole} · ` : ""}
            {review.submittedBy ? `by ${review.submittedBy.email} · ` : ""}order {review.sortOrder} ·
            added {formatDate(review.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form action={toggleReviewPublishedAction}>
            <input type="hidden" name="reviewId" value={review.id} />
            <Button type="submit" size="sm" variant={review.isPublished ? "secondary" : "primary"}>
              {review.isPublished ? "Unpublish" : "Verify & publish"}
            </Button>
          </form>
          <form action={deleteReviewAction}>
            <input type="hidden" name="reviewId" value={review.id} />
            <Button type="submit" size="sm" variant="ghost">
              Delete
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

type VideoRowData = {
  id: string;
  authorName: string;
  authorRole: string | null;
  provider: "YOUTUBE" | "INSTAGRAM";
  sourceUrl: string;
  isPublished: boolean;
  sortOrder: number;
  userId: string | null;
  createdAt: Date;
  submittedBy: { name: string; email: string } | null;
};

function VideoRow({ video }: { video: VideoRowData }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">{video.authorName}</p>
            <Badge tone="accent">{video.provider === "YOUTUBE" ? "YouTube" : "Instagram"}</Badge>
            <Badge tone={video.userId ? "accent" : "neutral"}>
              {video.userId ? "Member submission" : "Admin"}
            </Badge>
            <Badge tone={video.isPublished ? "success" : "warning"}>
              {video.isPublished ? "Published" : "Pending"}
            </Badge>
          </div>
          <a
            href={video.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block truncate text-sm text-accent underline underline-offset-2"
          >
            {video.sourceUrl}
          </a>
          <p className="mt-1 text-xs text-muted">
            {video.authorRole ? `${video.authorRole} · ` : ""}
            {video.submittedBy ? `by ${video.submittedBy.email} · ` : ""}order {video.sortOrder} ·
            added {formatDate(video.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form action={toggleVideoTestimonialPublishedAction}>
            <input type="hidden" name="videoId" value={video.id} />
            <Button type="submit" size="sm" variant={video.isPublished ? "secondary" : "primary"}>
              {video.isPublished ? "Unpublish" : "Verify & publish"}
            </Button>
          </form>
          <form action={deleteVideoTestimonialAction}>
            <input type="hidden" name="videoId" value={video.id} />
            <Button type="submit" size="sm" variant="ghost">
              Delete
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default async function AdminReviewsPage() {
  const [reviews, videos] = await Promise.all([
    prisma.review.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: { submittedBy: { select: { name: true, email: true } } }
    }),
    prisma.videoTestimonial.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: { submittedBy: { select: { name: true, email: true } } }
    })
  ]);
  const pending = reviews.filter((r) => !r.isPublished);
  const published = reviews.filter((r) => r.isPublished);
  const pendingVideos = videos.filter((v) => !v.isPublished);
  const publishedVideos = videos.filter((v) => v.isPublished);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reviews</h1>
        <p className="mt-1 text-sm text-muted">
          Member feedback shown on the home page. Verify only real, consented feedback about the
          <strong> service experience</strong> — never returns or performance (SEBI ad-code rules).
        </p>
      </div>

      <Card>
        <CardTitle className="flex items-center gap-2">
          Pending verification
          {pending.length > 0 && <Badge tone="warning">{pending.length}</Badge>}
        </CardTitle>
        <p className="mt-1 text-sm text-muted">
          Member-submitted (and unpublished) reviews awaiting your approval. Read each one — reject
          anything that mentions returns/profits — then verify to publish.
        </p>
        {pending.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="Nothing to verify" hint="New member submissions will appear here." />
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {pending.map((review) => (
              <ReviewRow key={review.id} review={review} />
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>Add a review</CardTitle>
        <p className="mt-1 text-sm text-muted">Publish a review directly (e.g. collected offline).</p>
        <div className="mt-4">
          <ReviewForm />
        </div>
      </Card>

      <Card>
        <CardTitle>Published on the home page</CardTitle>
        {published.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No published reviews" hint="Verify a pending one or add your own above." />
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {published.map((review) => (
              <ReviewRow key={review.id} review={review} />
            ))}
          </div>
        )}
      </Card>

      <div className="pt-2">
        <h2 className="text-xl font-semibold">Video reels</h2>
        <p className="mt-1 text-sm text-muted">
          YouTube / Instagram reels shown on the home page. Same rule — verify only service-experience
          feedback, never returns or performance.
        </p>
      </div>

      <Card>
        <CardTitle className="flex items-center gap-2">
          Pending verification
          {pendingVideos.length > 0 && <Badge tone="warning">{pendingVideos.length}</Badge>}
        </CardTitle>
        <p className="mt-1 text-sm text-muted">
          Member-submitted reels awaiting approval. Open each link, watch it, then verify to publish.
        </p>
        {pendingVideos.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="Nothing to verify" hint="New member video submissions will appear here." />
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {pendingVideos.map((video) => (
              <VideoRow key={video.id} video={video} />
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>Add a video reel</CardTitle>
        <p className="mt-1 text-sm text-muted">Publish a reel directly from a YouTube/Instagram link.</p>
        <div className="mt-4">
          <VideoTestimonialForm />
        </div>
      </Card>

      <Card>
        <CardTitle>Published on the home page</CardTitle>
        {publishedVideos.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No published reels" hint="Verify a pending one or add your own above." />
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {publishedVideos.map((video) => (
              <VideoRow key={video.id} video={video} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
