"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Link as LinkIcon,
  Compass,
  Sparkles,
  Smartphone,
  BarChart3,
  Copy,
  Check,
  QrCode,
  Globe,
  Shuffle,
  Code,
  Lock,
  Laptop,
  Tablet,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { config } from "@tracker/config";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

// Mock initial chart data for live preview
const INITIAL_CHART_DATA = [
  { time: "09:00", clicks: 120 },
  { time: "10:00", clicks: 145 },
  { time: "11:00", clicks: 180 },
  { time: "12:00", clicks: 290 },
  { time: "13:00", clicks: 210 },
  { time: "14:00", clicks: 310 },
  { time: "15:00", clicks: 280 },
  { time: "16:00", clicks: 340 },
  { time: "17:00", clicks: 420 },
];

export default function HomePage() {
  // URL Shortener Interactive States
  const [longUrl, setLongUrl] = useState("");
  const [isShortening, setIsShortening] = useState(false);
  const [shortenedKey, setShortenedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  // Live Analytics States (driven by "Test Redirect")
  const [clickCount, setClickCount] = useState(2437);
  const [chartData, setChartData] = useState(INITIAL_CHART_DATA);
  const [analyticsTab, setAnalyticsTab] = useState<
    "referrers" | "locations" | "devices"
  >("referrers");

  // Bento Card Routing States
  const [routingType, setRoutingType] = useState<"geo" | "device" | "ab">(
    "geo",
  );

  // Live Stats values
  const [referrers, setReferrers] = useState([
    { name: "Twitter / X", clicks: 942, percentage: 38, icon: "🐦" },
    { name: "GitHub", clicks: 680, percentage: 28, icon: "🐙" },
    { name: "Hacker News", clicks: 485, percentage: 20, icon: "🟠" },
    { name: "Direct / Email", clicks: 330, percentage: 14, icon: "✉️" },
  ]);

  const [locations, setLocations] = useState([
    {
      name: "United States",
      code: "US",
      clicks: 1120,
      percentage: 46,
      flag: "🇺🇸",
    },
    {
      name: "United Kingdom",
      code: "GB",
      clicks: 487,
      percentage: 20,
      flag: "🇬🇧",
    },
    { name: "Germany", code: "DE", clicks: 365, percentage: 15, flag: "🇩🇪" },
    { name: "Japan", code: "JP", clicks: 243, percentage: 10, flag: "🇯🇵" },
    { name: "Others", code: "ALL", clicks: 222, percentage: 9, flag: "🌐" },
  ]);

  const [devices, setDevices] = useState([
    { name: "Desktop", clicks: 1462, percentage: 60, icon: Laptop },
    { name: "Mobile", clicks: 828, percentage: 34, icon: Smartphone },
    { name: "Tablet", clicks: 147, percentage: 6, icon: Tablet },
  ]);

  // Handle fake shortening
  const handleShorten = (e: React.FormEvent) => {
    e.preventDefault();
    if (!longUrl) {
      toast.error("Please enter a URL to shorten");
      return;
    }

    // Simple validation
    if (!longUrl.startsWith("http://") && !longUrl.startsWith("https://")) {
      toast.error("URL must start with http:// or https://");
      return;
    }

    setIsShortening(true);
    setTimeout(() => {
      // Generate a nice key based on domain or random
      let key = "promo";
      try {
        const parsed = new URL(longUrl);
        const hostParts = parsed.hostname.split(".");
        key = hostParts[hostParts.length - 2] || "link";
      } catch (err) {
        key = "link";
      }
      // Add a random suffix to make it feel authentic
      const randomSuffix = Math.random().toString(36).substring(2, 5);
      setShortenedKey(`${key}-${randomSuffix}`);
      setIsShortening(false);
      toast.success("Short link created successfully!");
    }, 600);
  };

  const handleCopy = () => {
    if (!shortenedKey) return;
    const fullUrl = `tribelinks.io/${shortenedKey}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white relative overflow-hidden font-sans select-none antialiased">
      {/* Sleek Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* Decorative ambient radial light */}
      <div className="absolute top-[-10%] left-[50%] -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-transparent blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-transparent blur-[150px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-red-900/30 bg-zinc-950/60 backdrop-blur-md transition-all">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:px-12">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-700 text-white shadow-lg transition-transform group-hover:scale-105">
              <LinkIcon className="h-4.5 w-4.5" />
            </div>
            <span className="font-semibold text-lg tracking-tight text-white group-hover:text-zinc-100 transition-colors">
              Tribelinks
            </span>
          </Link>

          {/* Center Links (Dub.co style list) */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="#features"
              className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Features
            </Link>
            <Link
              href="#analytics"
              className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Analytics
            </Link>
            <Link
              href="#sdk"
              className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              SDK & API
            </Link>
          </nav>

          {/* Right Action buttons */}
          <div className="flex items-center gap-4">
            <Link
              href={config.public.enableAuth ? "/auth/login" : "/dashboard"}
              className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Log in
            </Link>
            <Link
              href={config.public.enableAuth ? "/auth/signup" : "/dashboard"}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 active:scale-[0.98] transition-all"
            >
              Start for free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 sm:px-12 pt-24 pb-16 text-center space-y-8">
        {/* Animated Pill Badge
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-900/30 bg-zinc-800 text-white text-xs font-medium cursor-pointer hover:bg-red-700 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span>Introducing Tribelinks 2.0 with offline Geo routing</span>
          <ArrowRight className="w-3 h-3" />
        </motion.div> */}

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl sm:text-7xl font-bold tracking-tight text-white max-w-4xl mx-auto leading-[1.1]"
        >
          Short links with <span className="text-white">superpowers.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed"
        >
          Tribelinks is the open-source link management infrastructure for
          modern marketing teams. Create, share, and track short links with
          custom targeting, instant redirects, and deep offline analytics.
        </motion.p>

        {/* Shortener Box Component */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="max-w-2xl mx-auto"
        >
          <div className="bg-zinc-950 border border-red-900/30 rounded-2xl p-5 shadow-2xl space-y-4">
            <form
              onSubmit={handleShorten}
              className="flex flex-col sm:flex-row gap-3"
            >
              <div className="flex-1 flex items-center bg-zinc-950 border border-red-900/30 rounded-xl px-3 focus-within:border-zinc-700 transition-colors">
                <span className="text-zinc-400 text-sm font-medium mr-1.5 select-none font-mono">
                  tribelinks.io /
                </span>
                <input
                  type="text"
                  placeholder="your_url"
                  value={longUrl}
                  onChange={(e) => setLongUrl(e.target.value)}
                  className="flex-1 bg-transparent py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-300"
                />
              </div>
              <button
                type="submit"
                disabled={isShortening}
                className="px-6 py-3 rounded-xl bg-red-600 text-white hover:bg-red-700 font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                {isShortening ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Shortening...
                  </>
                ) : (
                  <>
                    Shorten
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Animate Results */}
            <AnimatePresence mode="wait">
              {shortenedKey && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-t border-red-900/30 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 rounded bg-red-600 border border-red-900/30 text-[11px] text-zinc-400 font-mono">
                      Short Link
                    </span>
                    <span className="text-sm font-mono text-zinc-100 font-semibold">
                      tribelinks.io/{shortenedKey}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={handleCopy}
                      className="p-2.5 rounded-lg border border-red-900/30 bg-zinc-950 hover:bg-red-600 text-zinc-400 hover:text-zinc-100 transition-colors relative flex items-center gap-1.5 text-xs"
                      title="Copy short link"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      {copied ? "Copied" : "Copy"}
                    </button>

                    <button
                      onClick={() => setShowQr(!showQr)}
                      className={`p-2.5 rounded-lg border transition-colors flex items-center gap-1.5 text-xs ${
                        showQr
                          ? "border-red-800/50 bg-zinc-800 text-white hover:bg-red-700"
                          : "border-red-900/30 bg-zinc-950 hover:bg-red-600 text-zinc-400 hover:text-zinc-100"
                      }`}
                      title="Toggle QR Code"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      QR Code
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* QR Code Popover */}
            {showQr && shortenedKey && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-2 p-5 border border-red-900/30 rounded-xl bg-zinc-950 flex flex-col items-center gap-4 max-w-sm mx-auto"
              >
                <div className="w-40 h-40 bg-zinc-950 p-2.5 rounded-lg flex items-center justify-center shadow-lg relative group">
                  {/* Styled Mock QR Code */}
                  <div className="absolute inset-0 bg-transparent rounded-lg pointer-events-none" />
                  <svg
                    viewBox="0 0 100 100"
                    className="w-full h-full text-white"
                  >
                    <rect width="25" height="25" fill="currentColor" />
                    <rect x="75" width="25" height="25" fill="currentColor" />
                    <rect y="75" width="25" height="25" fill="currentColor" />
                    <rect x="6" y="6" width="13" height="13" fill="white" />
                    <rect x="81" y="6" width="13" height="13" fill="white" />
                    <rect x="6" y="81" width="13" height="13" fill="white" />
                    {/* Fill with random blocks to make it look like a QR code */}
                    <rect
                      x="35"
                      y="10"
                      width="10"
                      height="5"
                      fill="currentColor"
                    />
                    <rect
                      x="50"
                      y="5"
                      width="15"
                      height="10"
                      fill="currentColor"
                    />
                    <rect
                      x="30"
                      y="30"
                      width="20"
                      height="15"
                      fill="currentColor"
                    />
                    <rect
                      x="60"
                      y="35"
                      width="10"
                      height="20"
                      fill="currentColor"
                    />
                    <rect
                      x="10"
                      y="45"
                      width="15"
                      height="10"
                      fill="currentColor"
                    />
                    <rect
                      x="35"
                      y="60"
                      width="25"
                      height="15"
                      fill="currentColor"
                    />
                    <rect
                      x="70"
                      y="70"
                      width="20"
                      height="20"
                      fill="currentColor"
                    />
                    <rect
                      x="10"
                      y="60"
                      width="10"
                      height="10"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-zinc-100">
                    Scan to visit short link
                  </p>
                  <p className="text-[10px] text-zinc-400 font-mono mt-1">
                    tribelinks.io/{shortenedKey}
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </section>

      {/* Live Interactive Analytics Section */}
      <section
        id="analytics"
        className="mx-auto max-w-7xl px-6 sm:px-12 py-20 border-t border-red-900/30 bg-zinc-950"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Heading */}
          <div className="lg:col-span-4 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-800 bg-emerald-950 text-emerald-600 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live Analytics Tracker
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
              Real-time analytics <br />
              that matter.
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Track who is clicking your links, where they reside, and what
              device they are using. Clean charts, fast responses, zero clutter.
            </p>
          </div>

          {/* Right Column: Interactive Analytics Dashboard Mock */}
          <div className="lg:col-span-8">
            <div className="bg-zinc-950 border border-red-900/30 rounded-2xl overflow-hidden shadow-2xl">
              {/* Dashboard Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-red-900/30 p-5 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-600 border border-red-900/30 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">
                      Link Performance
                    </h4>
                    <p className="text-[10px] text-zinc-400 font-mono">
                      tribelinks.io/github
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                      Total Clicks
                    </span>
                    <span className="text-base font-bold text-zinc-100 font-mono">
                      {clickCount.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                      Avg Duration
                    </span>
                    <span className="text-base font-bold text-zinc-100 font-mono">
                      82ms
                    </span>
                  </div>
                </div>
              </div>

              {/* Chart widget */}
              <div className="p-5 border-b border-red-900/30">
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                    >
                      <XAxis
                        dataKey="time"
                        stroke="#52525b"
                        fontSize={9}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#52525b"
                        fontSize={9}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0b0b0e",
                          borderColor: "#27272a",
                          borderRadius: "12px",
                        }}
                        labelClassName="text-[10px] font-semibold text-zinc-400"
                        itemStyle={{ fontSize: "11px", color: "#38bdf8" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="clicks"
                        stroke="#0284c7"
                        strokeWidth={2}
                        fillOpacity={0.1}
                        fill="#0284c7"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Tabs Section */}
              <div className="grid grid-cols-1 md:grid-cols-12">
                {/* Tabs bar */}
                <div className="md:col-span-4 border-r border-red-900/30 p-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible">
                  <button
                    onClick={() => setAnalyticsTab("referrers")}
                    className={`flex-1 md:flex-initial py-2.5 px-3 rounded-lg text-left text-xs font-semibold transition-all flex items-center gap-2 ${
                      analyticsTab === "referrers"
                        ? "bg-red-600 text-white border border-red-900/30"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    Top Referrers
                  </button>
                  <button
                    onClick={() => setAnalyticsTab("locations")}
                    className={`flex-1 md:flex-initial py-2.5 px-3 rounded-lg text-left text-xs font-semibold transition-all flex items-center gap-2 ${
                      analyticsTab === "locations"
                        ? "bg-red-600 text-white border border-red-900/30"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Top Countries
                  </button>
                  <button
                    onClick={() => setAnalyticsTab("devices")}
                    className={`flex-1 md:flex-initial py-2.5 px-3 rounded-lg text-left text-xs font-semibold transition-all flex items-center gap-2 ${
                      analyticsTab === "devices"
                        ? "bg-red-600 text-white border border-red-900/30"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    Devices Breakup
                  </button>
                </div>

                {/* Tab content */}
                <div className="md:col-span-8 p-5 min-h-[180px]">
                  <AnimatePresence mode="wait">
                    {analyticsTab === "referrers" && (
                      <motion.div
                        key="referrers"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="space-y-3.5"
                      >
                        {referrers.map((ref) => (
                          <div key={ref.name} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-medium">
                              <span className="text-zinc-200 flex items-center gap-1.5">
                                <span className="text-sm">{ref.icon}</span>
                                {ref.name}
                              </span>
                              <span className="text-zinc-400 font-mono">
                                {ref.clicks} clicks ({ref.percentage}%)
                              </span>
                            </div>
                            <div className="w-full bg-red-600 rounded-full h-1.5 overflow-hidden border border-red-900/30/50">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${ref.percentage}%` }}
                                className="bg-red-600 h-full rounded-full"
                              />
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}

                    {analyticsTab === "locations" && (
                      <motion.div
                        key="locations"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="space-y-3.5"
                      >
                        {locations.map((loc) => (
                          <div key={loc.name} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-medium">
                              <span className="text-zinc-200 flex items-center gap-1.5">
                                <span className="text-sm">{loc.flag}</span>
                                {loc.name}
                              </span>
                              <span className="text-zinc-400 font-mono">
                                {loc.clicks} clicks ({loc.percentage}%)
                              </span>
                            </div>
                            <div className="w-full bg-red-600 rounded-full h-1.5 overflow-hidden border border-red-900/30/50">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${loc.percentage}%` }}
                                className="bg-red-600 h-full rounded-full"
                              />
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}

                    {analyticsTab === "devices" && (
                      <motion.div
                        key="devices"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="space-y-3.5"
                      >
                        {devices.map((dev) => {
                          const IconComp = dev.icon;
                          return (
                            <div key={dev.name} className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-medium">
                                <span className="text-zinc-200 flex items-center gap-1.5">
                                  <IconComp className="w-3.5 h-3.5 text-zinc-400" />
                                  {dev.name}
                                </span>
                                <span className="text-zinc-400 font-mono">
                                  {dev.clicks} clicks ({dev.percentage}%)
                                </span>
                              </div>
                              <div className="w-full bg-red-600 rounded-full h-1.5 overflow-hidden border border-red-900/30/50">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${dev.percentage}%` }}
                                  className="bg-red-600 h-full rounded-full"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="mx-auto max-w-7xl px-6 sm:px-12 py-24 border-t border-red-900/30 bg-zinc-950 w-full"
      >
        <div className="space-y-16 w-full">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Every tool you need to grow.
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              We design infrastructure that empowers developers, creators, and
              teams to track URLs instantly and securely.
            </p>
          </div>

          {/* Premium Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full">
            {/* 1. Advanced Custom Routing (Geo/Device/AB) (Span 8) - Cold Theme */}
            {config.public.enableDynamicRouting && (
              <div className="md:col-span-8 bg-zinc-950 border border-red-900/30 rounded-2xl p-7 flex flex-col justify-between gap-8 hover:border-red-800/50 transition-all duration-300 group">
                <div className="space-y-3">
                  <div className="w-9 h-9 rounded-lg bg-red-600 border border-red-900/30 flex items-center justify-center">
                    <Compass className="w-4.5 h-4.5 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-100">
                    Dynamic Link Routing
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
                    Configure custom targeting rules to route visitors based on
                    geo-location, client operating systems, or run weighted A/B
                    split tests.
                  </p>
                </div>

                {/* Visual Flow Widget */}
                <div className="bg-zinc-950/40 border border-red-900/30 rounded-xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-mono">
                    <div className="px-3 py-1.5 rounded-lg bg-red-600 border border-red-900/30 text-zinc-400">
                      Incoming Request
                    </div>
                    <div className="text-zinc-300">→</div>
                    <div className="px-3 py-1.5 rounded-lg bg-zinc-800 text-white border border-red-900/30">
                      Evaluate Targeting Rules
                    </div>
                    <div className="text-zinc-300">→</div>
                    <div className="flex gap-2">
                      <span className="px-2.5 py-1 rounded-md bg-zinc-800 text-white border border-red-900/30">
                        uk.shop (UK)
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-zinc-800 text-white border border-red-900/30">
                        app.store (iOS)
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-1.5 p-0.5 bg-red-600/50 border border-red-900/30 rounded-lg max-w-xs">
                    {(["geo", "device", "ab"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setRoutingType(mode)}
                        className={`flex-1 py-1 rounded text-[9px] font-bold transition-all capitalize ${
                          routingType === mode
                            ? "bg-zinc-800 text-white"
                            : "text-zinc-400 hover:text-zinc-400"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. Campaigns Hub (Span 4) - Warm Theme */}
            <div
              className={`${config.public.enableDynamicRouting ? "md:col-span-4" : "md:col-span-6"} bg-zinc-950 border border-red-900/30 rounded-2xl p-7 flex flex-col justify-between gap-8 hover:border-red-800/50 transition-all duration-300 group`}
            >
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-lg bg-red-600 border border-red-900/30 flex items-center justify-center">
                  <BarChart3 className="w-4.5 h-4.5 text-white" />
                </div>
                <h3 className="text-base font-bold text-zinc-100">
                  Campaigns Management
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Group links by channel, run organized email outreach
                  campaigns, and analyze contact interactions.
                </p>
              </div>

              {/* Visual Contact State Widget */}
              <div className="border border-red-900/30 bg-zinc-950/40 rounded-xl p-4.5 space-y-2.5">
                <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono">
                  <span>List: Launch Invitees</span>
                  <span className="text-white font-bold">2/3 Clicked</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] bg-red-600/30 px-2.5 py-1.5 rounded-lg border border-red-900/30/60">
                    <span className="text-zinc-200 font-medium">
                      Alice (Dev)
                    </span>
                    <span className="text-white bg-zinc-800 px-2 py-0.5 rounded-md border border-red-900/30 text-[8px] font-bold uppercase tracking-wider">
                      Clicked
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] bg-red-600/30 px-2.5 py-1.5 rounded-lg border border-red-900/30/60">
                    <span className="text-zinc-200 font-medium">
                      Bob (Design)
                    </span>
                    <span className="text-white bg-zinc-800 px-2 py-0.5 rounded-md border border-red-900/30 text-[8px] font-bold uppercase tracking-wider">
                      Clicked
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] bg-red-600/30 px-2.5 py-1.5 rounded-lg border border-red-900/30/60">
                    <span className="text-zinc-400 font-medium">
                      Carol (Marketing)
                    </span>
                    <span className="text-zinc-400 bg-red-600 px-2 py-0.5 rounded-md border border-red-900/30 text-[8px] font-medium uppercase tracking-wider">
                      Sent
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Pixel Retargeting (Span 4) - Cold Theme */}
            <div
              className={`${config.public.enableDynamicRouting ? "md:col-span-4" : "md:col-span-6"} bg-zinc-950 border border-red-900/30 rounded-2xl p-7 flex flex-col justify-between gap-8 hover:border-red-800/50 transition-all duration-300 group`}
            >
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-lg bg-red-600 border border-red-900/30 flex items-center justify-center">
                  <Sparkles className="w-4.5 h-4.5 text-white" />
                </div>
                <h3 className="text-base font-bold text-zinc-100">
                  Pixel Tracking & Analytics
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Automatically fire retargeting scripts from Meta, Google, or
                  LinkedIn Analytics on redirects.
                </p>
              </div>

              {/* Visual Config Switches Widget */}
              <div className="border border-red-900/30 bg-zinc-950/40 rounded-xl p-4.5 space-y-2 font-mono text-[9px]">
                <div className="flex justify-between items-center p-1.5 bg-red-600/20 rounded-md border border-red-900/30">
                  <span className="text-white flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-sky-400 animate-ping" />
                    Meta Pixel
                  </span>
                  <span className="text-zinc-400">Connected</span>
                </div>
                <div className="flex justify-between items-center p-1.5 bg-red-600/20 rounded-md border border-red-900/30">
                  <span className="text-white flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-sky-400 animate-ping" />
                    Google Analytics
                  </span>
                  <span className="text-zinc-400">Active</span>
                </div>
                <div className="flex justify-between items-center p-1.5 bg-red-600/20 rounded-md border border-red-900/30">
                  <span className="text-white flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-orange-450" />
                    Custom Webhook
                  </span>
                  <span className="text-zinc-650">Listening</span>
                </div>
              </div>
            </div>

            {/* 4. Developer Composable SDK (Span 8) - Cold Theme */}
            <div
              className={`${!config.public.enableDynamicRouting && !config.public.enableOneTimeLinks && !config.public.enableReferralEngine ? "md:col-span-12" : "md:col-span-8"} relative`}
            >
              <div
                id="sdk"
                className={`h-full bg-zinc-950 border border-red-900/30 rounded-2xl p-7 flex flex-col justify-between gap-8 hover:border-red-800/50 transition-all duration-300 group ${
                  !config.public.enableApiKeys
                    ? "blur-[3px] select-none pointer-events-none opacity-60"
                    : ""
                }`}
              >
                <div className="space-y-3">
                  <div className="w-9 h-9 rounded-lg bg-red-600 border border-red-900/30 flex items-center justify-center">
                    <Code className="w-4.5 h-4.5 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-100">
                    Developer Composable SDK
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
                    Shorten, track, and route links programmatically. Build rich
                    custom workflows with our fully typed TypeScript package.
                  </p>
                </div>

                {/* IDE Editor Visual Widget */}
                <div className="bg-[#040406] border border-red-900/30 rounded-xl overflow-hidden shadow-inner">
                  {/* Editor Header */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-red-900/30 bg-red-600/40">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-850" />
                      <span className="text-[9px] font-mono text-zinc-400">
                        index.ts
                      </span>
                    </div>
                    <span className="text-[8px] font-mono text-zinc-650">
                      TypeScript
                    </span>
                  </div>
                  {/* Editor Code */}
                  <div className="p-4 font-mono text-[10px] text-zinc-400 space-y-1 overflow-x-auto select-text leading-relaxed">
                    <div>
                      <span className="text-white">import</span> &#123;
                      Tribelinks &#125; <span className="text-white">from</span>{" "}
                      <span className="text-white">"@tribelinks/sdk"</span>;
                    </div>
                    <div>
                      <span className="text-white">const</span> sdk ={" "}
                      <span className="text-white">new</span> Tribelinks(&#123;
                      apiKey: <span className="text-white">"tl_prod_k9h"</span>{" "}
                      &#125;);
                    </div>
                    <div>
                      <span className="text-white">const</span> link ={" "}
                      <span className="text-white">await</span>{" "}
                      sdk.links.create(&#123;
                    </div>
                    <div className="pl-4">
                      url:{" "}
                      <span className="text-white">
                        "https://github.com/tribelinks"
                      </span>
                      ,
                    </div>
                    <div className="pl-4">
                      key: <span className="text-white">"product-launch"</span>
                    </div>
                    <div>&#125;);</div>
                  </div>
                </div>
              </div>
              {!config.public.enableApiKeys && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-950/10 rounded-2xl">
                  <span className="px-4 py-2 rounded-full bg-sky-500/20 border border-sky-500/30 text-xs font-semibold text-sky-300 uppercase tracking-widest animate-pulse shadow-lg shadow-sky-500/5">
                    Coming Soon
                  </span>
                  <p className="text-zinc-400 text-xs mt-2 font-medium">
                    Developer SDK & API Key access are coming soon
                  </p>
                </div>
              )}
            </div>

            {/* 5. One-Time Click Links (Span 6) - Warm Theme */}
            {config.public.enableOneTimeLinks && (
              <div className="md:col-span-6 bg-zinc-950 border border-red-900/30 rounded-2xl p-7 flex flex-col justify-between gap-8 hover:border-red-800/50 transition-all duration-300 group">
                <div className="space-y-3">
                  <div className="w-9 h-9 rounded-lg bg-red-600 border border-red-900/30 flex items-center justify-center">
                    <Lock className="w-4.5 h-4.5 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-100">
                    One-Time Click Short Links
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Generate secure URLs that expire automatically after the
                    very first redirect click. Perfect for sensitive documents.
                  </p>
                </div>

                {/* Visual Single Use Widget */}
                <div className="border border-red-900/30 bg-zinc-950/40 rounded-xl p-4.5 flex flex-col items-center justify-center gap-2">
                  <div className="text-[10px] font-mono text-zinc-400">
                    tribelinks.io/r/secret-keys
                  </div>
                  <div className="px-3 py-1 rounded bg-zinc-800 border border-red-900/30 text-[9px] font-bold text-white uppercase tracking-widest animate-pulse">
                    Expires on Redirect Click
                  </div>
                </div>
              </div>
            )}

            {/* 6. Referral Links & SDK (Span 6) - Warm Theme */}
            {config.public.enableReferralEngine && (
              <div className="md:col-span-6 bg-zinc-950 border border-red-900/30 rounded-2xl p-7 flex flex-col justify-between gap-8 hover:border-red-800/50 transition-all duration-300 group">
                <div className="space-y-3">
                  <div className="w-9 h-9 rounded-lg bg-red-600 border border-red-900/30 flex items-center justify-center">
                    <Shuffle className="w-4.5 h-4.5 text-white" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-100">
                    Product Referral Engines
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Launch customer referral programs. Embed user invite codes
                    and track referred signups easily via the developer SDK.
                  </p>
                </div>

                {/* Visual Rewards Widget */}
                <div className="border border-red-900/30 bg-zinc-950/40 rounded-xl p-4.5 flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <span className="text-[8px] uppercase tracking-wider text-zinc-400 font-mono">
                      Invite Code
                    </span>
                    <span className="font-mono text-zinc-200 block">
                      launch-code-2026
                    </span>
                  </div>
                  <div className="flex gap-4 text-right">
                    <div>
                      <span className="text-[8px] uppercase tracking-wider text-zinc-400 font-mono block">
                        Invites
                      </span>
                      <span className="font-bold text-zinc-200">1,480</span>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase tracking-wider text-zinc-400 font-mono block">
                        Success
                      </span>
                      <span className="font-bold text-white">2.8%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 sm:px-12 py-24 text-center border-t border-red-900/30">
        <div className="bg-zinc-950 border border-red-900/30 rounded-3xl p-8 sm:p-12 space-y-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-transparent blur-[80px] pointer-events-none" />

          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Power up your links today.
          </h2>
          <p className="text-zinc-400 text-sm max-w-lg mx-auto">
            Get started for free. Upgrade whenever you need custom domains, team
            collaboration, and higher volume redirects.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-red-600 text-white hover:bg-red-700 font-semibold text-sm transition-all"
            >
              Start tracking free
            </Link>
            <Link
              href="#features"
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-red-900/30 bg-red-600/50 hover:bg-zinc-850 text-zinc-200 font-semibold text-sm transition-all"
            >
              Learn more
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-red-900/30 bg-zinc-950 text-zinc-400 text-xs py-12 relative z-10">
        <div className="mx-auto max-w-7xl px-6 sm:px-12 grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="space-y-3">
            <h5 className="font-semibold text-zinc-200">Product</h5>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="#features"
                  className="hover:text-zinc-200 transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="#analytics"
                  className="hover:text-zinc-200 transition-colors"
                >
                  Analytics
                </Link>
              </li>
              <li>
                <Link
                  href="#sdk"
                  className="hover:text-zinc-200 transition-colors"
                >
                  Developer SDK
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h5 className="font-semibold text-zinc-200">Resources</h5>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/dashboard"
                  className="hover:text-zinc-200 transition-colors"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-zinc-200 transition-colors"
                >
                  GitHub Repository
                </a>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="hover:text-zinc-200 transition-colors"
                >
                  Changelog
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h5 className="font-semibold text-zinc-200">Company</h5>
            <ul className="space-y-2.5">
              <li>
                <span className="hover:text-zinc-200 transition-colors cursor-pointer">
                  About us
                </span>
              </li>
              <li>
                <span className="hover:text-zinc-200 transition-colors cursor-pointer">
                  Blog
                </span>
              </li>
              <li>
                <span className="hover:text-zinc-200 transition-colors cursor-pointer">
                  Careers
                </span>
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <h5 className="font-semibold text-zinc-200">Legal</h5>
            <ul className="space-y-2.5">
              <li>
                <span className="hover:text-zinc-200 transition-colors cursor-pointer">
                  Privacy Policy
                </span>
              </li>
              <li>
                <span className="hover:text-zinc-200 transition-colors cursor-pointer">
                  Terms of Service
                </span>
              </li>
              <li>
                <span className="hover:text-zinc-200 transition-colors cursor-pointer">
                  Security info
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 sm:px-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-red-900/30/50 pt-8">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-600 border border-red-900/30 text-zinc-400">
              <LinkIcon className="h-3 w-3" />
            </div>
            <span className="font-semibold text-zinc-400 text-xs">
              Tribelinks
            </span>
          </div>
          <p>© {new Date().getFullYear()} Tribelinks. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
