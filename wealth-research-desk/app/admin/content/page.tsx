import { Card, CardTitle } from "@/components/ui/card";
import { PageBanner } from "@/components/ui/page-banner";
import { ContentForm } from "@/components/admin/content-form";
import { prisma } from "@/lib/prisma";
import { buildLegalDocs, LEGAL_SLUGS } from "@/lib/legal";
import { getTrialPlanInfo } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const [overrides, trial] = await Promise.all([
    prisma.managedContent.findMany({
      where: { slug: { startsWith: "legal:" } }
    }),
    getTrialPlanInfo()
  ]);
  const legalDocs = buildLegalDocs(trial.days);
  const overrideMap = new Map(overrides.map((o) => [o.slug, o]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Content</h1>
        <p className="mt-1 text-sm text-muted">
          Edit legal and compliance copy. Saved changes publish immediately.
        </p>
      </div>

      <PageBanner
        tone="info"
        message="Defaults are shown until you save an override. Each document is published at /legal/<slug>."
      />

      <div className="space-y-4">
        {LEGAL_SLUGS.map((slug) => {
          const fallback = legalDocs[slug];
          const override = overrideMap.get(`legal:${slug}`);
          return (
            <Card key={slug}>
              <div className="flex items-center justify-between">
                <CardTitle>{fallback.title}</CardTitle>
                <code className="text-xs text-muted">/legal/{slug}</code>
              </div>
              <div className="mt-4">
                <ContentForm
                  slug={`legal:${slug}`}
                  defaultTitle={override?.title ?? fallback.title}
                  defaultBody={override?.body ?? fallback.body}
                />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
