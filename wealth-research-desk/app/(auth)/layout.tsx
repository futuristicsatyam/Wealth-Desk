import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="container-page flex h-16 items-center">
          <Link href="/" className="text-sm font-semibold tracking-[0.18em] text-gradient">
            WEALTH RESEARCH DESK
          </Link>
        </div>
      </header>
      <main className="container-page flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="border-t border-border py-5 text-center text-xs text-muted">
        Investments in securities markets are subject to risk.
      </footer>
    </div>
  );
}
