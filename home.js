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
  if (inRouter) return React.createElement(
    RouterLink,
    { to: to, className: className },
    children
  );
  return React.createElement(
    "a",
    { href: typeof to === "string" ? to : "#", className: className, onClick: e => e.preventDefault() },
    children
  );
}

export default function RentScopeHome() {
  const slides = [{
    id: 0,
    kicker: "Forecasts",
    title: "See rent hikes early",
    text: "Enter suburb and current rent. Get a projected increase window and amount so you can plan ahead."
  }, {
    id: 1,
    kicker: "Plan",
    title: "Affordability made clear",
    text: "Track rent as a share of income and set weekly savings toward expected changes."
  }, {
    id: 2,
    kicker: "Protect",
    title: "Safety nets when you need them",
    text: "Compare cheaper suburbs and find temporary options if a move becomes necessary."
  }];

  const [index, setIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIndex(i => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  // Lightweight smoke tests to catch regressions during manual runs
  useEffect(() => {
    console.assert(Array.isArray(slides) && slides.length === 3, "Slides should contain 3 items");
    console.assert(typeof slides[1].title === "string" && slides[1].title.length > 0, "Slide 2 needs a title");
  }, []);

  return React.createElement(
    "div",
    { className: "min-h-screen bg-neutral-50 text-neutral-900" },
    React.createElement(
      "header",
      { className: "sticky top-0 z-20 bg-white/70 backdrop-blur border-b" },
      React.createElement(
        "div",
        { className: "max-w-7xl mx-auto px-6 py-4 flex items-center justify-between" },
        React.createElement(
          SafeLink,
          { to: "/", className: "flex items-center gap-3" },
          React.createElement(
            "div",
            { className: "h-10 w-10 rounded-xl bg-white border shadow-sm flex items-center justify-center" },
            React.createElement(Radar, { className: "h-5 w-5 text-sky-600" })
          ),
          React.createElement(
            "div",
            null,
            React.createElement(
              "div",
              { className: "text-xl font-semibold tracking-tight" },
              "RentScope"
            ),
            React.createElement(
              "div",
              { className: "text-xs text-neutral-500" },
              "Predict. Prepare. Stay secure."
            )
          )
        ),
        React.createElement(
          "nav",
          { className: "hidden md:flex items-center gap-2 text-sm" },
          React.createElement(
            NavLink,
            { to: "/dashboard" },
            "Dashboard"
          ),
          React.createElement(
            NavLink,
            { to: "/accommodation" },
            "Accommodation"
          ),
          React.createElement(
            NavLink,
            { to: "/profile" },
            "Profile"
          )
        ),
        React.createElement(
          "div",
          { className: "flex items-center gap-2" },
          React.createElement(
            SafeLink,
            { to: "/login" },
            React.createElement(
              Button,
              { variant: "secondary", className: "rounded-xl" },
              "Sign in"
            )
          )
        )
      )
    ),
    React.createElement(
      "section",
      { className: "relative overflow-hidden" },
      React.createElement("div", { className: "absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15),transparent_70%),radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.15),transparent_70%)]" }),
      React.createElement(
        "div",
        { className: "max-w-7xl mx-auto px-6 pt-16 pb-20 relative z-10" },
        React.createElement(
          "div",
          { className: "grid lg:grid-cols-12 gap-8 items-center" },
          React.createElement(
            "div",
            { className: "lg:col-span-6" },
            React.createElement(
              motion.div,
              { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 } },
              React.createElement(
                "h1",
                { className: "text-5xl sm:text-6xl font-bold tracking-tight" },
                "RentScope"
              ),
              React.createElement(
                "p",
                { className: "mt-3 text-lg text-neutral-600 max-w-xl" },
                "Predict rent hikes, prepare finances, and stay secure with guidance that is easy to act on."
              ),
              React.createElement(
                "div",
                { className: "mt-6 flex flex-wrap gap-3" },
                React.createElement(
                  SafeLink,
                  { to: "/dashboard" },
                  React.createElement(
                    Button,
                    { className: "rounded-xl px-6 py-3" },
                    "Open dashboard"
                  )
                ),
                React.createElement(
                  SafeLink,
                  { to: "/accommodation" },
                  React.createElement(
                    Button,
                    { variant: "secondary", className: "rounded-xl px-6 py-3" },
                    "Browse accommodation"
                  )
                )
              )
            )
          ),
          React.createElement(
            "div",
            { className: "lg:col-span-6" },
            React.createElement(
              "div",
              { className: "relative rounded-3xl border bg-white/70 backdrop-blur p-6 shadow-sm overflow-hidden" },
              React.createElement(
                "div",
                { className: "text-xs text-neutral-500" },
                slides[index].kicker
              ),
              React.createElement(
                AnimatePresence,
                { mode: "wait" },
                React.createElement(
                  motion.div,
                  {
                    key: slides[index].id,
                    initial: { opacity: 0, y: 10 },
                    animate: { opacity: 1, y: 0 },
                    exit: { opacity: 0, y: -10 },
                    transition: { duration: 0.35 },
                    className: "mt-1"
                  },
                  React.createElement(
                    "div",
                    { className: "text-2xl font-semibold tracking-tight" },
                    slides[index].title
                  ),
                  React.createElement(
                    "div",
                    { className: "text-sm text-neutral-600 mt-2" },
                    slides[index].text
                  ),
                  React.createElement(
                    "div",
                    { className: "mt-4 grid sm:grid-cols-3 gap-3" },
                    React.createElement(Metric, { icon: TrendingUp, label: "Next increase", value: "12 Feb 2026" }),
                    React.createElement(Metric, { icon: Wallet2, label: "Projected rent", value: "$525 / wk" }),
                    React.createElement(Metric, { icon: ShieldCheck, label: "Confidence", value: "92%" })
                  )
                )
              ),
              React.createElement(
                "div",
                { className: "mt-5 flex items-center gap-2" },
                slides.map((s, i) => React.createElement("button", {
                  key: s.id,
                  "aria-label": `Slide ${i + 1}`,
                  onClick: () => setIndex(i),
                  className: `h-2 w-6 rounded-full transition-all ${i === index ? "bg-neutral-900" : "bg-neutral-300"}`
                }))
              )
            )
          )
        )
      )
    ),
    React.createElement(
      "section",
      { className: "max-w-7xl mx-auto px-6 py-12" },
      React.createElement(
        "h2",
        { className: "text-xl font-medium tracking-tight" },
        "What you get"
      ),
      React.createElement(
        "div",
        { className: "mt-4 grid md:grid-cols-3 gap-4" },
        React.createElement(
          FeatureCard,
          { title: "Predict", icon: React.createElement(TrendingUp, { className: "h-5 w-5 text-sky-600" }) },
          "Suburb patterns show when increases happen and by how much."
        ),
        React.createElement(
          FeatureCard,
          { title: "Plan", icon: React.createElement(Wallet2, { className: "h-5 w-5 text-emerald-600" }) },
          "Affordability meter and saving guidance tied to the forecast."
        ),
        React.createElement(
          FeatureCard,
          { title: "Protect", icon: React.createElement(ShieldCheck, { className: "h-5 w-5 text-indigo-600" }) },
          "Cheaper areas and temporary options when stability matters."
        )
      )
    ),
    React.createElement(
      "section",
      { className: "max-w-7xl mx-auto px-6 pb-16" },
      React.createElement(
        Card,
        { className: "rounded-3xl border bg-white/70 backdrop-blur shadow-sm" },
        React.createElement(
          CardHeader,
          { className: "pb-2" },
          React.createElement(
            CardTitle,
            { className: "text-2xl" },
            "Start with a forecast preview"
          ),
          React.createElement(
            CardDescription,
            null,
            "Free demo. No signup required."
          )
        ),
        React.createElement(
          CardContent,
          { className: "flex flex-wrap items-center gap-3" },
          React.createElement(
            SafeLink,
            { to: "/dashboard" },
            React.createElement(
              Button,
              { className: "rounded-xl" },
              "Try a sample forecast"
            )
          ),
          React.createElement(
            SafeLink,
            { to: "/profile" },
            React.createElement(
              Button,
              { variant: "secondary", className: "rounded-xl" },
              "Create an account"
            )
          )
        )
      )
    ),
    React.createElement(
      "footer",
      { className: "max-w-7xl mx-auto px-6 py-10 text-sm text-neutral-600 text-center" },
      "\xA9 2025 RentScope. Built for WA renters."
    )
  );
}

function NavLink({ to, children }) {
  return React.createElement(
    SafeLink,
    {
      to: to,
      className: "inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-neutral-700 hover:bg-neutral-200/60"
    },
    children
  );
}

function FeatureCard({ title, icon, children }) {
  return React.createElement(
    Card,
    { className: "rounded-2xl border bg-white/70 backdrop-blur shadow-sm" },
    React.createElement(
      CardHeader,
      null,
      React.createElement(
        CardTitle,
        { className: "flex items-center gap-2" },
        icon,
        title
      )
    ),
    React.createElement(
      CardContent,
      { className: "text-neutral-600 text-sm" },
      children
    )
  );
}

function Metric({ icon: Icon, label, value }) {
  return React.createElement(
    "div",
    { className: "rounded-2xl border p-4 bg-white/60" },
    React.createElement(
      "div",
      { className: "text-xs text-neutral-500 flex items-center gap-2" },
      Icon && React.createElement(Icon, { className: "h-4 w-4" }),
      " ",
      label
    ),
    React.createElement(
      "div",
      { className: "text-lg font-semibold" },
      value
    )
  );
}

