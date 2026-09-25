import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Borrow From A Human",
  description: "A promise you can make to a stranger."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <a href="/" className="brand">Borrow From A Human</a>
          <span className="protocol">Proof of Promise</span>
        </header>
        {children}
      </body>
    </html>
  );
}