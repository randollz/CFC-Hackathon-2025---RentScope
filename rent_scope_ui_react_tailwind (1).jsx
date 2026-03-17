import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link as RouterLink, useInRouterContext } from "react-router-dom";
import { Radar, TrendingUp, ShieldCheck, Wallet2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// SafeLink prevents React Router context errors when this page is rendered
// outside a <Router>. If a router context exists, it uses <RouterLink>.
// Otherwise it renders a simple <a> and prevents navigation.
function SafeLink({ to = "#", className = "", children }) {
  const inRouter = typeof useInRouterContext === "function" ? useInRouterContext() : false;
  if (inRouter) return <RouterLink to={to} className={className}>{children}</RouterLink>;
  return (
    <a href={typeof to === "string" ? to : "#"} className={className} onClick={(e) => e.preventDefault()}>
      {children}
    </a>
  );
}

export default function RentScopeHome() {
  const slides = [
    {
      id: 0,
      kicker: "Forecasts",
      title: "See rent hikes early",
      text: "Enter suburb and current rent. Get a projected increase window and amount so you can plan ahead.",
    },
    {
      id: 1,
      kicker: "Plan",
      title: "Affordability made clear",
      text: "Track rent as a share of income and set weekly savings toward expected changes.",
    },
    {
      id: 2,
      kicker: "Protect",
      title: "Safety nets when you need them",
      text: "Compare cheaper suburbs and find temporary options if a move becomes necessary.",
    },
  ];

  const [index, setIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  // Lightweight smoke tests to catch regressions during manual runs
  useEffect(() => {
    console.assert(Array.isArray(slides) && slides.length === 3, "Slides should contain 3 items");
    console.assert(typeof slides[1].title === "string" && slides[1].title.length > 0, "Slide 2 needs a title");
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      {/* Top Nav */}
      <header className="sticky top-0 z-20 bg-white/70 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <SafeLink to="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white border shadow-sm flex items-center justify-center">
              <Radar className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <div className="text-xl font-semibold tracking-tight">RentScope</div>
              <div className="text-xs text-neutral-500">Predict. Prepare. Stay secure.</div>
            </div>
          </SafeLink>
          <nav className="hidden md:flex items-center gap-2 text-sm">
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/accommodation">Accommodation</NavLink>
            <NavLink to="/profile">Profile</NavLink>
          </nav>
          <div className="flex items-center gap-2">
            <SafeLink to="/login"><Button variant="secondary" className="rounded-xl">Sign in</Button></SafeLink>
          </div>
        </div>
      </header>

      {/* Hero with big name and slideshow */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15),transparent_70%),radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.15),transparent_70%)]" />
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-20 relative z-10">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6">
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">RentScope</h1>
                <p className="mt-3 text-lg text-neutral-600 max-w-xl">
                  Predict rent hikes, prepare finances, and stay secure with guidance that is easy to act on.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <SafeLink to="/dashboard"><Button className="rounded-xl px-6 py-3">Open dashboard</Button></SafeLink>
                  <SafeLink to="/accommodation"><Button variant="secondary" className="rounded-xl px-6 py-3">Browse accommodation</Button></SafeLink>
                </div>
              </motion.div>
            </div>
            <div className="lg:col-span-6">
              <div className="relative rounded-3xl border bg-white/70 backdrop-blur p-6 shadow-sm overflow-hidden">
                <div className="text-xs text-neutral-500">{slides[index].kicker}</div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={slides[index].id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35 }}
                    className="mt-1"
                  >
                    <div className="text-2xl font-semibold tracking-tight">{slides[index].title}</div>
                    <div className="text-sm text-neutral-600 mt-2">{slides[index].text}</div>
                    <div className="mt-4 grid sm:grid-cols-3 gap-3">
                      <Metric icon={TrendingUp} label="Next increase" value="12 Feb 2026" />
                      <Metric icon={Wallet2} label="Projected rent" value="$525 / wk" />
                      <Metric icon={ShieldCheck} label="Confidence" value="92%" />
                    </div>
                  </motion.div>
                </AnimatePresence>
                {/* Dots */}
                <div className="mt-5 flex items-center gap-2">
                  {slides.map((s, i) => (
                    <button
                      key={s.id}
                      aria-label={`Slide ${i + 1}`}
                      onClick={() => setIndex(i)}
                      className={`h-2 w-6 rounded-full transition-all ${i === index ? "bg-neutral-900" : "bg-neutral-300"}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature trio */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <h2 className="text-xl font-medium tracking-tight">What you get</h2>
        <div className="mt-4 grid md:grid-cols-3 gap-4">
          <FeatureCard title="Predict" icon={<TrendingUp className="h-5 w-5 text-sky-600" />}>Suburb patterns show when increases happen and by how much.</FeatureCard>
          <FeatureCard title="Plan" icon={<Wallet2 className="h-5 w-5 text-emerald-600" />}>Affordability meter and saving guidance tied to the forecast.</FeatureCard>
          <FeatureCard title="Protect" icon={<ShieldCheck className="h-5 w-5 text-indigo-600" />}>Cheaper areas and temporary options when stability matters.</FeatureCard>
        </div>
      </section>

      {/* CTA band */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <Card className="rounded-3xl border bg-white/70 backdrop-blur shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">Start with a forecast preview</CardTitle>
            <CardDescription>Free demo. No signup required.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <SafeLink to="/dashboard"><Button className="rounded-xl">Try a sample forecast</Button></SafeLink>
            <SafeLink to="/profile"><Button variant="secondary" className="rounded-xl">Create an account</Button></SafeLink>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-10 text-sm text-neutral-600 text-center">
        © 2025 RentScope. Built for WA renters.
      </footer>
    </div>
  );
}

function NavLink({ to, children }) {
  return (
    <SafeLink
      to={to}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-neutral-700 hover:bg-neutral-200/60"
    >
      {children}
    </SafeLink>
  );
}

function FeatureCard({ title, icon, children }) {
  return (
    <Card className="rounded-2xl border bg-white/70 backdrop-blur shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-neutral-600 text-sm">{children}</CardContent>
    </Card>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border p-4 bg-white/60">
      <div className="text-xs text-neutral-500 flex items-center gap-2">{Icon && <Icon className="h-4 w-4" />} {label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
