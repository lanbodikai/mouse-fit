import type { Metadata } from "next";
import { JetBrains_Mono, Lexend, Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({
  variable: "--font-body",
  subsets: ["latin"],
});
const lexend = Lexend({
  variable: "--font-heading",
  subsets: ["latin"],
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MouseFit",
  description: "MouseFit v2.",
  icons: {
    icon: "/10.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sora.variable} ${lexend.variable} ${jetbrainsMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
