"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, ArrowRight, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push("/");
        router.refresh();
      } else {
        setError(data.message || "Invalid credentials");
      }
    } catch {
      setError("Failed to connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f4f5] flex items-center justify-center p-4 sm:p-6 antialiased text-[#1e1e1e] font-sans">
      <div className="w-full max-w-md bg-white border border-[#e4e4e7] p-6 sm:p-8 rounded-xl shadow-xs transition-all duration-200">
        {/* Hub Title Identity */}
        <div className="flex flex-col items-center mb-6 sm:mb-8 text-center">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-black">
            Personal Tracker
          </h1>
        </div>

        {/* Dynamic Warning Alert Container */}
        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-rose-800 text-xs sm:text-sm animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span className="font-semibold leading-normal">{error}</span>
          </div>
        )}

        {/* Interactive Authorization Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[0.625rem] sm:text-xs font-black uppercase tracking-wider text-[#71717a]">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#a1a1aa] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full h-11 bg-white border border-[#e4e4e7] rounded-lg pl-10 pr-4 py-2 text-black placeholder-[#a1a1aa] focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-sm font-medium shadow-none"
                placeholder="Enter username"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[0.625rem] sm:text-xs font-black uppercase tracking-wider text-[#71717a]">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#a1a1aa] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-11 bg-white border border-[#e4e4e7] rounded-lg pl-10 pr-4 py-2 text-black placeholder-[#a1a1aa] focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-sm font-bold shadow-none"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 mt-6 bg-black hover:bg-[#27272a] text-white font-black rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-40 cursor-pointer text-xs uppercase tracking-wider"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                Authenticating...
              </span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer Device Lock Attribution */}
        <div className="mt-6 pt-4 border-t border-[#f4f4f5] text-center">
          <p className="text-[0.6875rem] font-medium text-[#71717a] leading-relaxed">
            Protected Executive Hub
          </p>
        </div>
      </div>
    </div>
  );
}
