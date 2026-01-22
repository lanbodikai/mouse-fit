import type { Metadata } from "next";
import { JetBrains_Mono, Lexend, Sora } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";

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
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${sora.variable} ${lexend.variable} ${jetbrainsMono.variable} antialiased`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') || 'dark';
                  document.documentElement.classList.remove('light', 'dark');
                  document.documentElement.classList.add(theme);
                } catch (e) {}
              })();
            `,
          }}
        />
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
