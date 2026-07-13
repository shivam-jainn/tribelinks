"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const ENABLE_SIGNUP = process.env.NEXT_PUBLIC_ENABLE_SIGNUP === "true";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!ENABLE_SIGNUP) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl">🔒</div>
          <h1 className="text-xl font-semibold text-white">Signups are closed</h1>
          <p className="text-white/40 text-sm">Reach out to the admin to get access.</p>
          <Link href="/auth/login" className="text-violet-400 text-sm hover:text-violet-300 transition-colors">
            ← Back to login
          </Link>
        </div>
      </main>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) return;
    setLoading(true);

    try {
      // 1. Create account
      const signupRes = await fetch("/api/proxy/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password
        }),
      });

      if (!signupRes.ok) {
        const data = await signupRes.json();
        throw new Error(data.error || "Signup failed");
      }

      const { sessionToken } = await signupRes.json();

      // 2. Log in with the sessionToken returned from signup
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken }),
      });

      if (!loginRes.ok) throw new Error("Auto-login failed");

      toast.success("Account created! Redirecting to dashboard…");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-violet-600/8 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block text-sm text-white/30 hover:text-white/50 transition-colors mb-4">
            ← Tribelinks
          </Link>
          <h1 className="text-3xl font-black gradient-text">Create account</h1>
          <p className="text-white/40 text-sm">Start tracking links in seconds.</p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-7 space-y-5 border border-white/[0.07]">
          <div className="space-y-2">
            <label className="text-xs text-white/40 uppercase tracking-wider">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/8 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/50 focus:bg-white/8 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-white/40 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/8 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/50 focus:bg-white/8 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-white/40 uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/8 text-white placeholder-white/20 text-sm focus:outline-none focus:border-violet-500/50 focus:bg-white/8 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all disabled:opacity-40"
          >
            {loading ? "Creating…" : "Create account →"}
          </button>
        </form>

        <p className="text-center text-xs text-white/25">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-violet-400 hover:text-violet-300 transition-colors">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
