"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";

export function ThemeProvider({
  children,
  nonce
}: {
  children: React.ReactNode;
  nonce?: string;
}) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      // Fresh key: ignores any previously-stored "light" preference under the old
      // default key, so dark is the effective default for new and returning visitors.
      storageKey="wrd-theme"
      disableTransitionOnChange
      nonce={nonce}
    >
      {children}
    </NextThemeProvider>
  );
}
