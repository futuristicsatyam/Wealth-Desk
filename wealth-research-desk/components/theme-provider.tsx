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
      disableTransitionOnChange
      nonce={nonce}
    >
      {children}
    </NextThemeProvider>
  );
}
