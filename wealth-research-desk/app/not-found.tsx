import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container-page flex min-h-[70vh] flex-col items-center justify-center text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">Error 404</p>
      <h1 className="mt-3 text-3xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-muted">The page you are looking for does not exist or has moved.</p>
      <Link href="/" className="mt-6 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-background">
        Back to homepage
      </Link>
    </main>
  );
}
