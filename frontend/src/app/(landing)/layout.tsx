export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-hidden bg-black">
      {children}
    </div>
  );
}
