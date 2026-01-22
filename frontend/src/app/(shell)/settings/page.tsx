export default function SettingsPage() {
  return (
    <div className="h-full w-full p-8">
      <div className="mx-auto w-full max-w-[72ch] space-y-6">
        <div className="rounded-[30px] bg-black p-8 border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.45)]">
          <h1 className="text-3xl font-semibold text-white [font-family:var(--font-heading)] mb-4">
            Settings
          </h1>
          <p className="text-white/60 leading-relaxed mb-6">Configure your preferences.</p>
          <div className="space-y-4">
            <div className="rounded-[20px] bg-white/5 p-4 border border-white/10">
              <h3 className="text-white font-semibold mb-2">Theme</h3>
              <p className="text-white/60 text-sm">Dark mode is currently enabled.</p>
            </div>
            <div className="rounded-[20px] bg-white/5 p-4 border border-white/10">
              <h3 className="text-white font-semibold mb-2">Notifications</h3>
              <p className="text-white/60 text-sm">Manage your notification preferences.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
