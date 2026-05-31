import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div className="rounded-xl2 border border-border bg-card p-8 text-center">
      <p className="text-base font-semibold">Page not found</p>
      <Link href="/dashboard" className="mt-3 inline-block text-sm text-accent">
        Back to overview
      </Link>
    </div>
  );
}
