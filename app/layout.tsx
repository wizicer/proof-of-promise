import "./globals.css";
import type { Metadata } from "next";
import { PresenceModeProvider } from "@/components/PresenceMode";

export const metadata: Metadata = {
  title: "Borrow From A Human",
  description: "A promise you can make to a stranger."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PresenceModeProvider>{children}</PresenceModeProvider>
      </body>
    </html>
  );
}
