export default function UserPage() {
  return (
    <div className="h-full w-full p-8">
      <div className="mx-auto w-full max-w-[72ch] space-y-6">
        <div className="rounded-[30px] bg-black p-8 border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.45)]">
          <h1 className="text-3xl font-semibold text-white [font-family:var(--font-heading)] mb-4">
            User Profile
          </h1>
          <p className="text-white/60 leading-relaxed">User profile page placeholder.</p>
          <div className="mt-6 space-y-4">
            <button className="rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20 border border-white/10">
              Edit Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
