import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-cyan-500/8 blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-6">
        <span className="text-sm font-medium text-white/40 tracking-widest uppercase">
          Tribelinks
        </span>
        <div className="flex items-center gap-6">
          <Link
            href="/auth/signup"
            className="text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            Sign up
          </Link>
          <Link
            href="/dashboard"
            className="text-sm px-4 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all"
          >
            Dashboard →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 mb-8 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/5 text-violet-300 text-xs tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          Link tracking, reimagined
        </div>

        {/* Main heading */}
        <h1 className="text-7xl sm:text-8xl font-black tracking-tight leading-none mb-6">
          <span className="gradient-text">Tribe</span>
          <span className="text-white">links</span>
        </h1>

        <p className="text-lg text-white/40 font-light leading-relaxed max-w-md mx-auto mb-12">
          Short links with soul. Track who clicks, when, and from where —{" "}
          <span className="text-white/60">down to the person.</span>
        </p>

        {/* CTAs */}
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="group px-8 py-3 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all glow-purple"
          >
            Open Dashboard
            <span className="ml-2 group-hover:translate-x-0.5 inline-block transition-transform">
              →
            </span>
          </Link>
          <Link
            href="/auth/signup"
            className="px-8 py-3 rounded-full border border-white/10 text-white/60 text-sm font-medium hover:border-white/20 hover:text-white/80 transition-all"
          >
            Create account
          </Link>
        </div>

        {/* Feature pills */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-3">
          {[
            "URL Shortening",
            "Person-of-Interest Tracking",
            "Geo Analytics",
            "Pixel Tracking",
            "API Keys",
            "Bulk Creation",
          ].map((feat) => (
            <span
              key={feat}
              className="px-3 py-1 rounded-full text-xs text-white/30 border border-white/8 bg-white/3"
            >
              {feat}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none" />
    </main>
  );
}
