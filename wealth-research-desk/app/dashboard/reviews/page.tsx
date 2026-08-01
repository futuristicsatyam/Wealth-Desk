import { Card, CardTitle } from "@/components/ui/card";
import { ReviewSubmitForm } from "@/components/dashboard/review-submit-form";
import { VideoSubmitForm } from "@/components/dashboard/video-submit-form";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardReviewsPage() {
  const user = await requireUser();
  const [myReview, myVideo] = await Promise.all([
    prisma.review.findUnique({
      where: { userId: user.id },
      select: { quote: true, authorRole: true, rating: true, isPublished: true }
    }),
    prisma.videoTestimonial.findUnique({
      where: { userId: user.id },
      select: { sourceUrl: true, authorRole: true, provider: true, isPublished: true }
    })
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reviews</h1>
        <p className="mt-1 text-sm text-muted">
          Share how the research desk has worked for you. Approved reviews appear on our home page.
        </p>
      </div>

      <Card className="space-y-4">
        <div>
          <CardTitle>Share your experience</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Tell us about the research experience — discipline, clarity and risk-first thinking. Your
            feedback is reviewed before it goes live.
          </p>
        </div>
        <ReviewSubmitForm existing={myReview} />
      </Card>

      <Card className="space-y-4">
        <div>
          <CardTitle>Share a video reel</CardTitle>
          <p className="mt-1 text-sm text-muted">
            Prefer video? Paste a YouTube or Instagram reel link and, once approved, it appears in the
            video stories on our home page.
          </p>
        </div>
        <VideoSubmitForm existing={myVideo} />
      </Card>
    </div>
  );
}
