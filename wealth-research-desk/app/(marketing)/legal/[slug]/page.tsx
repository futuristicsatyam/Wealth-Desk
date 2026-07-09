import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { buildLegalDocs, LEGAL_SLUGS, LEGAL_TITLES, isLegalSlug } from "@/lib/legal";
import { getTrialPlanInfo } from "@/lib/plans";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return LEGAL_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isLegalSlug(slug)) return { title: "Legal" };
  return { title: LEGAL_TITLES[slug] };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isLegalSlug(slug)) notFound();

  const trial = await getTrialPlanInfo();
  const fallback = buildLegalDocs(trial.days)[slug];
  // ManagedContent overrides allow admins to edit legal copy without a deploy.
  const override = await prisma.managedContent.findUnique({ where: { slug: `legal:${slug}` } });

  const title = override?.title ?? fallback.title;
  const body = override?.body ?? fallback.body;
  const updatedAt = override?.updatedAt;

  return (
    <main className="container-page py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">Legal</p>
      <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
      {updatedAt && (
        <p className="mt-1 text-xs text-muted">
          Last updated {updatedAt.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
        </p>
      )}
      <Card className="mt-6">
        <div className="space-y-4 text-sm leading-relaxed text-foreground/85">
          {body.split("\n\n").map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </Card>
    </main>
  );
}
