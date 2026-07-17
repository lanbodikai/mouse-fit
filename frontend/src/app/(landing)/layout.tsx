export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-theme-primary">{children}</div>;
}
