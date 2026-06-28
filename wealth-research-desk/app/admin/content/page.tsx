import { Card, CardTitle } from "@/components/ui/card";
import { PageBanner } from "@/components/ui/page-banner";
import { ContentForm } from "@/components/admin/content-form";
import { prisma } from "@/lib/prisma";
import { LEGAL_DOCS, LEGAL_SLUGS } from "@/lib/legal";
import { DEFAULT_INDEX_LOT_SIZES, LOT_SIZE_SETTINGS_SLUG } from "@/lib/lot-sizes";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const overrides = await prisma.managedContent.findMany({
    where: {
      OR: [{ slug: { startsWith: "legal:" } }, { slug: LOT_SIZE_SETTINGS_SLUG }]
    }
  });
  const overrideMap = new Map(overrides.map((o) => [o.slug, o]));
  const lotSizeOverride = overrideMap.get(LOT_SIZE_SETTINGS_SLUG);

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
          const fallback = LEGAL_DOCS[slug];
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

        <Card>
          <div className="flex items-center justify-between">
            <CardTitle>Index Lot Sizes (History P&amp;L)</CardTitle>
            <code className="text-xs text-muted">{LOT_SIZE_SETTINGS_SLUG}</code>
          </div>
          <p className="mt-2 text-xs text-muted">
            Enter a JSON object. Example: <code>{`{"NIFTY": 75, "BANKNIFTY": 30}`}</code>.
            Missing keys use defaults.
          </p>
          <div className="mt-4">
            <ContentForm
              slug={LOT_SIZE_SETTINGS_SLUG}
              defaultTitle={lotSizeOverride?.title ?? "Index lot sizes for history P&L"}
              defaultBody={
                lotSizeOverride?.body ?? JSON.stringify(DEFAULT_INDEX_LOT_SIZES, null, 2)
              }
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
