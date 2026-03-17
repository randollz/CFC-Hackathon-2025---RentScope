import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Radar,
  Bell,
  Home,
  TrendingUp,
  ShieldCheck,
  Wallet2,
  AlertTriangle,
  LineChart as LineChartIcon,
  MapPin,
  ChevronRight,
  LayoutDashboard,
  Building2,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ---- Dummy data ----
const SUBURB_STATS = {
  Nedlands: {
    suburb: "Nedlands",
    median_rent_weekly: 800,
    distance_to_cbd_km: 7,
    near_university: true,
    periodicity_months: 12,
    percent_increase_per_period: 0.05,
    annual_volatility: 0.02,
    turnover_rate: 0.32,
    eviction_rate: 0.03,
    monthly_growth_last_12: [0.2, 0.3, 0.4, 0.4, 0.2, 0.1, 0.0, -0.1, 0.1, 0.2, 0.3, 0.2],
  },
  "Canning Vale": {
    suburb: "Canning Vale",
    median_rent_weekly: 650,
    distance_to_cbd_km: 17,
    near_university: false,
    periodicity_months: 6,
    percent_increase_per_period: 0.01,
    annual_volatility: 0.01,
    turnover_rate: 0.28,
    eviction_rate: 0.02,
    monthly_growth_last_12: [0.1, 0.1, 0.2, 0.1, 0.1, 0.0, 0.0, 0.0, 0.1, 0.2, 0.1, 0.1],
  },
  Joondalup: {
    suburb: "Joondalup",
    median_rent_weekly: 500,
    distance_to_cbd_km: 26,
    near_university: true,
    periodicity_months: 12,
    percent_increase_per_period: 0.03,
    annual_volatility: 0.015,
    turnover_rate: 0.3,
    eviction_rate: 0.02,
    monthly_growth_last_12: [0.0, 0.1, 0.1, 0.1, 0.0, -0.1, 0.0, 0.1, 0.2, 0.1, 0.1, 0.0],
  },
  Armadale: {
    suburb: "Armadale",
    median_rent_weekly: 450,
    distance_to_cbd_km: 36,
    near_university: false,
    periodicity_months: 12,
    percent_increase_per_period: 0.025,
    annual_volatility: 0.02,
    turnover_rate: 0.33,
    eviction_rate: 0.035,
    monthly_growth_last_12: [0.2, 0.2, 0.1, 0.0, -0.1, -0.1, 0.0, 0.1, 0.2, 0.1, 0.0, 0.0],
  },
  "East Perth": {
    suburb: "East Perth",
    median_rent_weekly: 700,
    distance_to_cbd_km: 2,
    near_university: false,
    periodicity_months: 12,
    percent_increase_per_period: 0.04,
    annual_volatility: 0.03,
    turnover_rate: 0.4,
    eviction_rate: 0.04,
    monthly_growth_last_12: [0.3, 0.2, 0.1, 0.1, 0.1, 0.0, 0.0, 0.2, 0.3, 0.2, 0.2, 0.1],
  },
};

const PROPERTIES = [
  { id: "p1", suburb: "Nedlands", title: "2BR Apartment near UWA", weekly: 720, bedrooms: 2, near_university: true, distance_to_cbd_km: 7, type: "apartment" },
  { id: "p2", suburb: "Canning Vale", title: "3BR Family House", weekly: 580, bedrooms: 3, near_university: false, distance_to_cbd_km: 17, type: "house" },
  { id: "p3", suburb: "Joondalup", title: "3BR House with Yard", weekly: 520, bedrooms: 3, near_university: true, distance_to_cbd_km: 26, type: "house" },
  { id: "p4", suburb: "Armadale", title: "2BR Villa", weekly: 420, bedrooms: 2, near_university: false, distance_to_cbd_km: 36, type: "villa" },
  { id: "p5", suburb: "East Perth", title: "1BR CBD Apartment", weekly: 650, bedrooms: 1, near_university: false, distance_to_cbd_km: 2, type: "apartment" },
];

// ---- Helpers ----
const addMonths = (d, m) => {
  const dateObj = new Date(d.getTime());
  const month = dateObj.getMonth() + m;
  dateObj.setMonth(month);
  if (dateObj.getMonth() !== ((month % 12) + 12) % 12) dateObj.setDate(0);
  return dateObj;
};
const monthsBetween = (d1, d2) => {
  const ydiff = d2.getFullYear() - d1.getFullYear();
  const mdiff = d2.getMonth() - d1.getMonth();
  let m = ydiff * 12 + mdiff;
  if (d2.getDate() < d1.getDate()) m -= 1;
  return m;
};
function predictNextIncrease(lease, stats, today) {
  const lastIncreaseDate = lease.increase_history?.length
    ? lease.increase_history.map((h) => new Date(h.date)).sort((a, b) => a - b).slice(-1)[0]
    : new Date(lease.lease_start);
  const monthsSince = monthsBetween(lastIncreaseDate, today);
  const period = stats.periodicity_months || 12;
  const periodsElapsed = Math.floor(monthsSince / period);
  const nextIncreaseDate = addMonths(lastIncreaseDate, (periodsElapsed + 1) * period);
  const monthsUntil = Math.max(0, monthsBetween(today, nextIncreaseDate));
  const projected = Math.round(lease.weekly_rent * (1 + stats.percent_increase_per_period) * 100) / 100;
  const hist = stats.monthly_growth_last_12?.length ? stats.monthly_growth_last_12 : [0];
  const mean = hist.reduce((a, b) => a + b, 0) / hist.length;
  const variance = hist.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / hist.length;
  const vol = stats.annual_volatility;
  const confidence = Math.max(0.35, Math.min(0.95, 1 - (vol * 3 + variance * 8)));
  return {
    suburb: stats.suburb,
    current_rent_weekly: lease.weekly_rent,
    next_increase_date: nextIncreaseDate,
    months_until_increase: monthsUntil,
    projected_rent_weekly: projected,
    expected_increase_rate: stats.percent_increase_per_period,
    confidence: Math.round(confidence * 100) / 100,
  };
}
function affordability(weeklyRent, weeklyIncome, monthsUntilIncrease, projectedRent) {
  const ratio = weeklyIncome > 0 ? weeklyRent / weeklyIncome : 1;
  const delta = Math.max(0, projectedRent - weeklyRent);
  const weeksUntil = Math.max(1, monthsUntilIncrease * 4);
  const weeklySave = Math.round((delta / weeksUntil) * 100) / 100;
  return {
    rent_to_income_ratio: Math.round(ratio * 1000) / 1000,
    over_30_stress: ratio >= 0.3,
    over_40_severe: ratio >= 0.4,
    weekly_saving_needed_for_hike: weeklySave,
  };
}
function benchmark(stats, currentRent, overpayThreshold = 0.1) {
  const median = stats.median_rent_weekly;
  const overpayPercent = (currentRent - median) / median;
  const overpayingFlag = overpayPercent > overpayThreshold;
  return {
    suburb_median: median,
    overpaying_flag: overpayingFlag,
    overpay_percent: Math.round(overpayPercent * 1000) / 1000,
    suggested_negotiation_range: [Math.round(median * 0.95 * 100) / 100, Math.round(median * 1.05 * 100) / 100],
  };
}
function evictionRisk(lease, user, stats, aff) {
  const drivers = {};
  drivers.rent_burden = Math.min(1, Math.max(0, (aff.rent_to_income_ratio - 0.25) / 0.25));
  drivers.turnover = Math.min(1, stats.turnover_rate / 0.5);
  drivers.eviction_proxy = Math.min(1, stats.eviction_rate / 0.08);
  drivers.landlord_factor = lease.landlord_type === "agency" ? 0.6 : lease.landlord_type === "private" ? 0.5 : 0.4;
  const raw = 0.35 * drivers.rent_burden + 0.25 * drivers.turnover + 0.25 * drivers.eviction_proxy + 0.15 * drivers.landlord_factor;
  const score = Math.min(1, Math.max(0, Math.round(raw * 100) / 100));
  const band = score < 0.33 ? "low" : score < 0.66 ? "moderate" : "high";
  return { risk_score: score, drivers, band };
}
function trendAlert(stats) {
  const last3 = stats.monthly_growth_last_12.slice(-3);
  const m3 = last3.reduce((a, b) => a + b, 0) / last3.length;
  const m12 = stats.monthly_growth_last_12.reduce((a, b) => a + b, 0) / stats.monthly_growth_last_12.length;
  const diff = m3 - m12;
  let alert = null;
  if (diff > 0.15) alert = "Upward trend detected";
  else if (diff < -0.15) alert = "Downward trend detected";
  return { suburb: stats.suburb, recent_vs_longterm_growth_diff: Math.round(diff * 1000) / 1000, alert };
}
function alternatives(currentSuburb, targetWeeklyRent) {
  const current = SUBURB_STATS[currentSuburb];
  const cheaper = Object.values(SUBURB_STATS)
    .filter((s) => s.suburb !== currentSuburb)
    .filter((s) => Math.abs(s.distance_to_cbd_km - current.distance_to_cbd_km) <= 12)
    .filter((s) => s.median_rent_weekly < targetWeeklyRent)
    .sort((a, b) => a.median_rent_weekly - b.median_rent_weekly)
    .slice(0, 3)
    .map((s) => [s.suburb, s.median_rent_weekly]);
  const properties = PROPERTIES.filter((p) => p.suburb === currentSuburb || cheaper.map((c) => c[0]).includes(p.suburb));
  return { cheaper_suburbs: cheaper, properties };
}
function buildDashboardSeries(today, currentRent, projectedRent, stepDate, weeklyIncome, monthsHorizon = 18) {
  const timeline = [];
  const rents = [];
  const ratios = [];
  for (let m = 0; m <= monthsHorizon; m++) {
    const d = addMonths(today, m);
    timeline.push(d);
    const rent = d < stepDate ? currentRent : projectedRent;
    rents.push(rent);
    ratios.push(Number((weeklyIncome > 0 ? rent / weeklyIncome : 1).toFixed(3)));
  }
  return {
    timeline_months: timeline,
    timeline_projected_rents: rents,
    affordability_ratio_series: ratios,
    stress_thresholds: { stress: 0.3, severe: 0.4 },
  };
}
const reportNumber = (n) => (typeof n === "number" ? Number(n).toFixed(2) : String(n));

// ---- UI primitives ----
const Button = ({ children, className = "", ...props }) => (
  <button className={`px-3 py-2 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 transition ${className}`} {...props}>
    {children}
  </button>
);
const Input = ({ className = "", ...props }) => (
  <input className={`w-full px-3 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-sky-400 ${className}`} {...props} />
);
const Select = ({ value, onChange, children }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-sky-400">
    {children}
  </select>
);
const Card = ({ children, className = "" }) => <div className={`rounded-3xl border bg-white/70 backdrop-blur ${className}`}>{children}</div>;
const CardHeader = ({ children, className = "" }) => <div className={`px-5 pt-5 ${className}`}>{children}</div>;
const CardContent = ({ children, className = "" }) => <div className={`px-5 pb-5 ${className}`}>{children}</div>;
const Label = ({ children }) => <label className="text-sm text-neutral-600">{children}</label>;

// ---- App (Dashboard only) ----
export default function App() {
  // Scroll CSS variable for background motion without React re-renders
  useEffect(() => {
    let ticking = false;
    const setVar = () => {
      if (typeof document !== "undefined") {
        document.documentElement.style.setProperty("--sy", String(window.scrollY || 0));
      }
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(setVar);
      }
    };
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--sy", String(window.scrollY || 0));
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const today = useMemo(() => new Date("2025-08-29T12:00:00+08:00"), []);
  const [name, setName] = useState("Alex");
  const [suburb, setSuburb] = useState("Nedlands");
  const [weeklyRent, setWeeklyRent] = useState(500);
  const [weeklyIncome, setWeeklyIncome] = useState(1500);
  const [leaseStart, setLeaseStart] = useState("2024-10-01");
  const [landlordType, setLandlordType] = useState("agency");
  const [overpayThreshold, setOverpayThreshold] = useState(0.1);

  const stats = SUBURB_STATS[suburb];
  const pred = predictNextIncrease({ weekly_rent: Number(weeklyRent), lease_start: new Date(leaseStart), increase_history: [], landlord_type: landlordType }, stats, today);
  const aff = affordability(Number(weeklyRent), Number(weeklyIncome), pred.months_until_increase, pred.projected_rent_weekly);
  const bench = benchmark(stats, Number(weeklyRent), Number(overpayThreshold));
  const risk = evictionRisk({ landlord_type: landlordType }, { weekly_income: Number(weeklyIncome) }, stats, aff);
  const trend = trendAlert(stats);
  const alts = alternatives(suburb, Number(weeklyRent));
  const suggested = useMemo(() => (alts.properties.length ? alts.properties : PROPERTIES).slice(0, 7), [alts]);
  const dashboard = buildDashboardSeries(today, Number(weeklyRent), pred.projected_rent_weekly, pred.next_increase_date, Number(weeklyIncome));
  const chartData = dashboard.timeline_months.map((d, i) => ({ month: d.toISOString().slice(0, 7), rent: dashboard.timeline_projected_rents[i], ratio: dashboard.affordability_ratio_series[i] }));

  // Notifications
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: "n1", text: "Better accommodation available. Click to view.", type: "info", action: () => (window.location.hash = "#alternatives") },
    { id: "n2", text: `Price hike detected in ~${pred.months_until_increase} months. View forecast.`, type: "warn", action: () => window.scrollTo({ top: 600, behavior: "smooth" }) },
    { id: "n3", text: "You are all up to date.", type: "ok" },
  ]);
  const unread = notifications.length;
  const dismiss = (id) => setNotifications((n) => n.filter((x) => x.id !== id));
  const dismissAll = () => setNotifications([]);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      {/* Dynamic background layers (exclude navbar) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Base soft radial wash */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(1200px 600px at 20% -10%, rgba(59,130,246,0.14), transparent 60%)," +
              "radial-gradient(900px 500px at 90% 110%, rgba(16,185,129,0.14), transparent 60%)",
          }}
        />
        {/* Scroll-reactive blue haze */}
        <div
          id="bg-layer-blue"
          className="absolute inset-0 will-change-transform"
          style={{
            background: "radial-gradient(800px 400px at 70% 0%, rgba(59,130,246,0.25), transparent 60%)",
            transform: "translateY(min(40px, calc(var(--sy, 0) / 20)))",
            opacity: "max(0.1, calc(1 - min(1, calc(var(--sy, 0) / 900))))",
            filter: "blur(0.2px)",
          }}
        />
        {/* Scroll-reactive emerald haze */}
        <div
          id="bg-layer-green"
          className="absolute inset-0 will-change-transform"
          style={{
            background: "radial-gradient(900px 450px at 10% 100%, rgba(16,185,129,0.22), transparent 60%)",
            transform: "translateY(calc(-1 * min(50px, calc(var(--sy, 0) / 18))))",
            opacity: "max(0.08, calc(0.9 - min(1, calc(var(--sy, 0) / 800))))",
            filter: "blur(0.4px)",
          }}
        />
      </div>

      {/* Navbar with icons */}
      <nav className="relative z-20 border-b bg-white/70 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/80 backdrop-blur border border-white/60 shadow-sm flex items-center justify-center">
              <Radar className="h-4 w-4 text-sky-600" />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight">RentScope</div>
              <div className="text-xs text-neutral-500">Predict. Prepare. Stay secure.</div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-sm">
            <a className="px-3 py-2 rounded-xl text-neutral-700 hover:bg-neutral-200/60 flex items-center gap-2" href="#home">
              <Home className="h-4 w-4" /> Home
            </a>
            <a className="px-3 py-2 rounded-xl text-white bg-neutral-900 flex items-center gap-2" href="#dashboard">
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </a>
            <a className="px-3 py-2 rounded-xl text-neutral-700 hover:bg-neutral-200/60 flex items-center gap-2" href="#alternatives">
              <Building2 className="h-4 w-4" /> Browse
            </a>
          </div>

          <button className="relative p-2 rounded-xl hover:bg-neutral-100" onClick={() => setNotifOpen((v) => !v)} aria-label="Notifications">
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center">{unread}</span>
            )}
          </button>
        </div>
      </nav>

      {/* Utilities banner */}
      <div className="relative z-10 bg-amber-50 border-b border-amber-200 text-amber-900 text-sm px-6 py-3">
        From 1 July, utilities typically increase by ~2.5% annually on average. This assumption is included in forecasts.
      </div>

      {/* Notification popover */}
      {notifOpen && (
        <div className="fixed right-4 top-16 z-[9999]">
          <Card className="shadow-xl w-[320px]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="font-medium">Notifications</div>
                <button onClick={dismissAll} className="text-sm text-sky-700 hover:underline">Mark all read</button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {notifications.length === 0 && <div className="text-sm text-neutral-500">Nothing new</div>}
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 p-3 rounded-2xl border ${
                    n.type === "warn"
                      ? "border-amber-300 bg-amber-50"
                      : n.type === "ok"
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-neutral-200 bg-white"
                  }`}
                >
                  <div className="mt-0.5">
                    {n.type === "warn" ? (
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    ) : n.type === "ok" ? (
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-sky-600" />
                    )}
                  </div>
                  <div className="text-sm flex-1">{n.text}</div>
                  <div className="flex items-center gap-2">
                    {n.action && (
                      <button onClick={n.action} className="text-xs text-sky-700 hover:underline">Open</button>
                    )}
                    <button onClick={() => dismiss(n.id)} className="text-xs text-neutral-500 hover:underline">Dismiss</button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dashboard */}
      <main id="dashboard" className="relative z-10 max-w-7xl mx-auto px-6 py-8 space-y-8">
        <section id="home" className="space-y-2">
          <motion.h1 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="text-3xl md:text-4xl font-semibold tracking-tight">
            Welcome, {name}
          </motion.h1>
          <p className="text-neutral-600">
            Latest update for {suburb}: {trend.alert || "No strong deviation detected"}. Average increase pattern {Math.round(SUBURB_STATS[suburb].percent_increase_per_period * 100)}% every {SUBURB_STATS[suburb].periodicity_months} months.
          </p>
        </section>

        <div className="grid lg:grid-cols-3 gap-6 items-start">
          {/* Left column: Inputs + Breakdown */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <div className="text-lg font-medium">Your inputs</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Suburb</Label>
                  <Select value={suburb} onChange={setSuburb}>
                    {Object.keys(SUBURB_STATS).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Weekly rent ($)</Label>
                    <Input type="number" value={weeklyRent} onChange={(e) => setWeeklyRent(Number(e.target.value || 0))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Weekly income ($)</Label>
                    <Input type="number" value={weeklyIncome} onChange={(e) => setWeeklyIncome(Number(e.target.value || 0))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Lease start</Label>
                    <Input type="date" value={leaseStart} onChange={(e) => setLeaseStart(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Landlord type</Label>
                    <Select value={landlordType} onChange={setLandlordType}>
                      <option value="agency">Agency</option>
                      <option value="private">Private</option>
                      <option value="community_housing">Community housing</option>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Overpay threshold ({Math.round(overpayThreshold * 100)}%)</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0.05}
                      max={0.25}
                      step={0.01}
                      value={overpayThreshold}
                      onChange={(e) => setOverpayThreshold(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-sm w-14 text-right">{Math.round(overpayThreshold * 100)}%</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <BreakdownCard risk={risk} landlordType={landlordType} />
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <MiniMetric label="Next increase" value={pred.next_increase_date.toLocaleDateString()} icon={TrendingUp} />
              <MiniMetric label="Projected weekly rent" value={`$${pred.projected_rent_weekly.toFixed(2)}`} icon={Wallet2} />
              <MiniMetric label="Confidence" value={`${Math.round(pred.confidence * 100)}%`} icon={ShieldCheck} />
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 font-medium">
                  <LineChartIcon className="h-5 w-5 text-sky-600" /> Forecast (18 months)
                </div>
                <div className="text-sm text-neutral-600">Weekly rent and affordability ratio</div>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ left: 10, right: 20, top: 5, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} domain={[0, Math.max(...chartData.map((d) => d.rent)) * 1.2]} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} domain={[0, 1]} />
                      <ChartTooltip />
                      <Legend />
                      <ReferenceLine y={dashboard.stress_thresholds.stress} yAxisId="right" stroke="#ef4444" strokeDasharray="4 4" label="Stress 30%" />
                      <Line yAxisId="left" type="monotone" dataKey="rent" name="Weekly rent ($)" stroke="#2563eb" strokeWidth={2} dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="ratio" name="Affordability ratio" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-5 w-5 text-amber-600" /> Trend alert
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-neutral-600">Recent vs 12 month average</div>
                  <div className="text-lg font-semibold">{reportNumber(trend.recent_vs_longterm_growth_diff)} %</div>
                  <div className="text-sm text-neutral-700 mt-1">{trend.alert || "No strong deviation detected"}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 font-medium">
                    <Wallet2 className="h-5 w-5 text-emerald-600" /> Benchmark
                  </div>
                </CardHeader>
                <CardContent className="space-y-1">
                  <Row label="Suburb median" value={`$${bench.suburb_median.toFixed(2)}`} />
                  <Row label="Overpay %" value={`${(bench.overpay_percent * 100).toFixed(1)}%`} />
                  <Row label="Negotiate toward" value={`$${bench.suggested_negotiation_range[0]} - $${bench.suggested_negotiation_range[1]}`} />
                  <p className="text-xs text-neutral-600 pt-1">Benchmarking gives tenants fair reference points. Broad awareness can reduce overpriced listings over time.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 font-medium">
                    <ShieldCheck className="h-5 w-5 text-sky-700" /> Eviction risk
                  </div>
                </CardHeader>
                <CardContent>
                  <Row label="Risk band" value={risk.band} />
                  <Row label="Score" value={risk.risk_score} />
                  <Row label="Rent burden" value={reportNumber(risk.drivers.rent_burden)} />
                </CardContent>
              </Card>
            </div>

            <Card id="alternatives">
              <CardHeader>
                <div className="flex items-center gap-2 font-medium">
                  <MapPin className="h-5 w-5 text-sky-600" /> Alternatives
                </div>
                <div className="text-sm text-neutral-600">Similar-price options in nearby suburbs</div>
              </CardHeader>
              <CardContent>
                <div className="-mx-2 overflow-x-auto">
                  <div className="px-2 flex gap-3 snap-x snap-mandatory">
                    {suggested.map((p) => (
                      <div key={p.id} className="min-w-[280px] snap-start rounded-2xl border p-4 bg-white/60">
                        <div className="text-sm text-neutral-600">
                          {p.type} · {p.bedrooms} bed
                        </div>
                        <div className="text-lg font-semibold">{p.title}</div>
                        <div className="text-xs text-neutral-500">
                          {p.suburb} · {p.distance_to_cbd_km} km to CBD · {p.near_university ? "Near university" : "General"}
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="font-medium">${p.weekly}/wk</div>
                          <a
                            href={`#/property/${p.id}`}
                            className="px-3 py-2 rounded-xl bg-neutral-100 text-neutral-900 hover:bg-neutral-200 inline-flex items-center"
                            aria-label={`View listing ${p.title}`}
                          >
                            View <ChevronRight className="h-4 w-4 ml-1" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t mt-10">
        <div className="max-w-7xl mx-auto px-6 py-8 text-sm text-neutral-600 flex items-center gap-2">
          <Home className="h-4 w-4" /> Designed for WA renters. Demo data only.
        </div>
      </footer>
    </div>
  );
}

function BreakdownCard({ risk, landlordType }) {
  const WEIGHTS = { burden: 0.35, turnover: 0.25, eviction: 0.25, landlord: 0.15 };
  const raw = {
    burden: WEIGHTS.burden * (risk?.drivers?.rent_burden ?? 0),
    turnover: WEIGHTS.turnover * (risk?.drivers?.turnover ?? 0),
    eviction: WEIGHTS.eviction * (risk?.drivers?.eviction_proxy ?? 0),
    landlord: WEIGHTS.landlord * (risk?.drivers?.landlord_factor ?? 0),
  };
  const total = Object.values(raw).reduce((a, b) => a + b, 0) || 1;
  const pieData = [
    { name: "Rent burden", key: "burden", value: raw.burden },
    { name: "Turnover in area", key: "turnover", value: raw.turnover },
    { name: "Eviction pressure", key: "eviction", value: raw.eviction },
    { name: `Landlord type (${landlordType})`, key: "landlord", value: raw.landlord },
  ];
  const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#6b7280"];
  return (
    <Card>
      <CardHeader>
        <div className="font-medium">What drives your increase/risk</div>
        <div className="text-sm text-neutral-600">Breakdown of contributing factors</div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="h-40 w-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2}>
                  {pieData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            {pieData.map((p, idx) => {
              const pct = ((p.value / total) * 100).toFixed(1);
              return (
                <div key={p.key} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-sm" style={{ background: COLORS[idx % COLORS.length] }} />
                    <span className="text-neutral-700">{p.name}</span>
                  </div>
                  <span className="font-medium">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-neutral-600">{label}</span>
      <span className="font-medium">{String(value)}</span>
    </div>
  );
}
function MiniMetric({ label, value, icon: Icon }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="text-sm font-medium text-neutral-600 flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4" />} {label}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

// ---- Minimal runtime sanity tests (console assertions) ----
(function runSanityTests() {
  const today = new Date("2025-08-29T12:00:00+08:00");
  const stats = SUBURB_STATS["Nedlands"];
  const pred = predictNextIncrease({ weekly_rent: 500, lease_start: new Date("2024-10-01"), increase_history: [], landlord_type: "agency" }, stats, today);
  console.assert(pred.projected_rent_weekly >= 500, "Projected rent should be >= current rent");
  const aff = affordability(500, 1500, pred.months_until_increase, pred.projected_rent_weekly);
  console.assert(aff.rent_to_income_ratio > 0 && aff.rent_to_income_ratio < 1, "Affordability ratio within 0..1 for plausible inputs");
  const bench = benchmark(stats, 500, 0.1);
  console.assert(typeof bench.suburb_median === "number", "Benchmark should include numeric median");
})();
