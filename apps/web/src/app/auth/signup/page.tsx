"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { config } from "@tracker/config";
import { authClient } from "../../../lib/auth-client";

const ENABLE_SIGNUP = config.public.enableSignup;

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
      const { error } = await authClient.signUp.email({
        email: email.trim(),
        password,
        name: name.trim(),
      });

      if (error) {
        throw new Error(error.message || "Signup failed");
      }

      toast.success("Account created! Redirecting to dashboard…");
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleSocialLogin(provider: "google" | "github") {
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: "/dashboard",
      });
    } catch (err: any) {
      toast.error(err.message || `Failed to sign in with ${provider}`);
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

        <div className="glass rounded-2xl p-7 space-y-5 border border-white/[0.07]">
          <form onSubmit={handleSubmit} className="space-y-5">
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

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="flex-shrink mx-4 text-white/20 text-xs uppercase tracking-wider">or continue with</span>
            <div className="flex-grow border-t border-white/5"></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSocialLogin("google")}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 text-white text-sm transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={() => handleSocialLogin("github")}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 text-white text-sm transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
              GitHub
            </button>
          </div>
        </div>

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
