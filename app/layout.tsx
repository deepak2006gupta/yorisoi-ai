import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Yorisoi AI | Care Command", description: "Explainable care coordination intelligence" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Browser extensions can add attributes to the document element before React hydrates.
  // This scoped opt-out prevents those external root-only mutations from producing a false error.
  return <html lang="en" suppressHydrationWarning><body suppressHydrationWarning>{children}</body></html>;
}
