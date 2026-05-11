import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DNA診断AI — 自分の分身AIを作るための診断",
  description: "命術16診断 + 心理診断 + 自由記述による深掘りで、あなたの分身AIを作るオールインワン自己診断ツール",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased min-h-screen bg-navy-deep text-offwhite">{children}</body>
    </html>
  );
}
