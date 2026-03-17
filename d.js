import React, { useMemo, useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Radar,
  Home,
  LogIn,
  User as UserIcon,
  LayoutDashboard,
  Building2,
  Newspaper,
  MapPin,
  TrendingUp,
  ShieldCheck,
  Wallet2,
  AlertTriangle,
  LineChart as LineChartIcon,
  Boxes,
  Layers,
  Info,
  Filter,
  Search,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
} from "recharts";

// Optional map: react-leaflet. Falls back to a placeholder if tiles are blocked.
let MapContainer, TileLayer, Marker, Popup;
try {
  // dynamic require to avoid SSR and build-time issues in preview
  const leaflet = require("react-leaflet");
  MapContainer = leaflet.MapContainer;
  TileLayer = leaflet.TileLayer;
  Marker = leaflet.Marker;
  Popup = leaflet.Popup;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("leaflet/dist/leaflet.css");
} catch (e) {
  MapContainer = null;
}

// -------------------------------------------------------------
// Dummy data and lightweight replicas of backend logic
// -------------------------------------------------------------

const SUBURB_COORDS = {
  Perth: { lat: -31.952, lng: 115.857 },
  Crawley: { lat: -31.985, lng: 115.817 },
  "Cannington": { lat: -32.016, lng: 115.939 },
  "Nedlands": { lat: -31.981, lng: 115.802 },
  "Canning Vale": { lat: -32.082, lng: 115.918 },
  "Joondalup": { lat: -31.744, lng: 115.768 },
  "Armadale": { lat: -32.146, lng: 116.012 },
  "East Perth": { lat: -31.958, lng: 115.873 },
};

const SUBURB_STATS = {
  "Nedlands": {
    suburb: "Nedlands",
    median_rent_weekly: 800,
    distance_to_cbd_km: 7,
    near_university: true,
    periodicity_months: 12,
    percent_increase_per_period: 0.05,
    annual_volatility: 0.02,
    turnover_rate: 0.32,
    eviction_rate: 0.03,
    monthly_growth_last_12: [0.2,0.3,0.4,0.4,0.2,0.1,0.0,-0.1,0.1,0.2,0.3,0.2],
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
    monthly_growth_last_12: [0.1,0.1,0.2,0.1,0.1,0.0,0.0,0.0,0.1,0.2,0.1,0.1],
  },
  "Joondalup": {
    suburb: "Joondalup",
    median_rent_weekly: 500,
    distance_to_cbd_km: 26,
    near_university: true,
    periodicity_months: 12,
    percent_increase_per_period: 0.03,
    annual_volatility: 0.015,
    turnover_rate: 0.30,
    eviction_rate: 0.02,
    monthly_growth_last_12: [0.0,0.1,0.1,0.1,0.0,-0.1,0.0,0.1,0.2,0.1,0.1,0.0],
  },
  "Armadale": {
    suburb: "Armadale",
    median_rent_weekly: 450,
    distance_to_cbd_km: 36,
    near_university: false,
    periodicity_months: 12,
    percent_increase_per_period: 0.025,
    annual_volatility: 0.02,
    turnover_rate: 0.33,
    eviction_rate: 0.035,
    monthly_growth_last_12: [0.2,0.2,0.1,0.0,-0.1,-0.1,0.0,0.1,0.2,0.1,0.0,0.0],
  },
  "East Perth": {
    suburb: "East Perth",
    median_rent_weekly: 700,
    distance_to_cbd_km: 2,
    near_university: false,
    periodicity_months: 12,
    percent_increase_per_period: 0.04,
    annual_volatility: 0.03,
    turnover_rate: 0.40,
    eviction_rate: 0.04,
    monthly_growth_last_12: [0.3,0.2,0.1,0.1,0.1,0.0,0.0,0.2,0.3,0.2,0.2,0.1],
  },
};

const TEMP_OPTIONS = [
  { id: "tmp1", name: "WA Youth Shelter - CBD", kind: "Emergency shelter", suburb: "Perth", price_per_week: 0, capacity: 20 },
  { id: "tmp2", name: "Student Village Short Stay", kind: "Student accom", suburb: "Crawley", price_per_week: 280, capacity: 15 },
  { id: "tmp3", name: "Budget Motel South", kind: "Motel", suburb: "Cannington", price_per_week: 420, capacity: 8 },
];

const STORAGE_OPTIONS = [
  { id: "st1", name: "SafeStore Nedlands", suburb: "Nedlands", price_per_week: 40, capacity_m3: 6 },
  { id: "st2", name: "Metro Storage South", suburb: "Canning Vale", price_per_week: 35, capacity_m3: 5.5 },
  { id: "st3", name: "Budget Boxes North", suburb: "Joondalup", price_per_week: 30, capacity_m3: 7 },
];

const PROPERTIES = [
  { id: "p1", suburb: "Nedlands", title: "2BR Apartment near UWA", weekly: 720, bedrooms: 2, near_university: true, distance_to_cbd_km: 7, type: "apartment", lat: -31.984, lng: 115.811 },
  { id: "p2", suburb: "Canning Vale", title: "3BR Family House", weekly: 580, bedrooms: 3, near_university: false, distance_to_cbd_km: 17, type: "house", lat: -32.082, lng: 115.925 },
  { id: "p3", suburb: "Joondalup", title: "3BR House with Yard", weekly: 520, bedrooms: 3, near_university: true, distance_to_cbd_km: 26, type: "house", lat: -31.742, lng: 115.772 },
  { id: "p4", suburb: "Armadale", title: "2BR Villa", weekly: 420, bedrooms: 2, near_university: false, distance_to_cbd_km: 36, type: "villa", lat: -32.146, lng: 116.015 },
  { id: "p5", suburb: "East Perth", title: "1BR CBD Apartment", weekly: 650, bedrooms: 1, near_university: false, distance_to_cbd_km: 2, type: "apartment", lat: -31.958, lng: 115.873 },
];

// Helpers
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
    ? lease.increase_history.map(h => new Date(h.date)).sort((a,b)=>a-b).slice(-1)[0]
    : new Date(lease.lease_start);
  const monthsSince = monthsBetween(lastIncreaseDate, today);
  const period = stats.periodicity_months || 12;
  const periodsElapsed = Math.floor(monthsSince / period);
  const nextIncreaseDate = addMonths(lastIncreaseDate, (periodsElapsed + 1) * period);
  const monthsUntil = Math.max(0, monthsBetween(today, nextIncreaseDate));
  const projected = Math.round(lease.weekly_rent * (1 + stats.percent_increase_per_period) * 100) / 100;
  const hist = stats.monthly_growth_last_12?.length ? stats.monthly_growth_last_12 : [0];
  const mean = hist.reduce((a,b)=>a+b,0)/hist.length;
  const variance = hist.reduce((acc,v)=> acc + Math.pow(v-mean,2), 0) / hist.length;
  const vol = stats.annual_volatility;
  const confidence = Math.max(0.35, Math.min(0.95, 1 - (vol*3 + variance*8)));
  return { suburb: stats.suburb, current_rent_weekly: lease.weekly_rent, next_increase_date: nextIncreaseDate, months_until_increase: monthsUntil, projected_rent_weekly: projected, expected_increase_rate: stats.percent_increase_per_period, confidence: Math.round(confidence*100)/100 };
}
function affordability(weeklyRent, weeklyIncome, monthsUntilIncrease, projectedRent) {
  const ratio = weeklyIncome > 0 ? weeklyRent / weeklyIncome : 1;
  const delta = Math.max(0, projectedRent - weeklyRent);
  const weeksUntil = Math.max(1, monthsUntilIncrease * 4);
  const weeklySave = Math.round((delta / weeksUntil) * 100) / 100;
  return { rent_to_income_ratio: Math.round(ratio*1000)/1000, over_30_stress: ratio >= 0.30, over_40_severe: ratio >= 0.40, weekly_saving_needed_for_hike: weeklySave };
}
function benchmark(stats, currentRent, overpayThreshold = 0.10) {
  const median = stats.median_rent_weekly;
  const overpayPercent = (currentRent - median) / median;
  const overpayingFlag = overpayPercent > overpayThreshold;
  return { suburb_median: median, overpaying_flag: overpayingFlag, overpay_percent: Math.round(overpayPercent*1000)/1000, suggested_negotiation_range: [Math.round(median*0.95*100)/100, Math.round(median*1.05*100)/100] };
}
function evictionRisk(lease, user, stats, aff) {
  const drivers = {};
  drivers.rent_burden = Math.min(1, Math.max(0, (aff.rent_to_income_ratio - 0.25) / 0.25));
  drivers.turnover = Math.min(1, stats.turnover_rate / 0.5);
  drivers.eviction_proxy = Math.min(1, stats.eviction_rate / 0.08);
  drivers.landlord_factor = lease.landlord_type === "agency" ? 0.6 : lease.landlord_type === "private" ? 0.5 : 0.4;
  const raw = 0.35*drivers.rent_burden + 0.25*drivers.turnover + 0.25*drivers.eviction_proxy + 0.15*drivers.landlord_factor;
  const score = Math.min(1, Math.max(0, Math.round(raw*100)/100));
  const band = score < 0.33 ? "low" : score < 0.66 ? "moderate" : "high";
  return { risk_score: score, drivers, band };
}
function trendAlert(stats) {
  const last3 = stats.monthly_growth_last_12.slice(-3);
  const m3 = last3.reduce((a,b)=>a+b,0)/last3.length;
  const m12 = stats.monthly_growth_last_12.reduce((a,b)=>a+b,0)/stats.monthly_growth_last_12.length;
  const diff = m3 - m12;
  let alert = null;
  if (diff > 0.15) alert = "Upward trend detected";
  else if (diff < -0.15) alert = "Downward trend detected";
  return { suburb: stats.suburb, recent_vs_longterm_growth_diff: Math.round(diff*1000)/1000, alert };
}
function alternatives(currentSuburb, targetWeeklyRent, user) {
  const current = SUBURB_STATS[currentSuburb];
  const cheaper = Object.values(SUBURB_STATS)
    .filter(s => s.suburb !== currentSuburb)
    .filter(s => Math.abs(s.distance_to_cbd_km - current.distance_to_cbd_km) <= 12)
    .filter(s => s.median_rent_weekly < targetWeeklyRent)
    .sort((a,b) => a.median_rent_weekly - b.median_rent_weekly)
    .slice(0,3)
    .map(s => [s.suburb, s.median_rent_weekly]);
  const closeBy = (a,b, tol=10) => Math.abs(a-b) <= tol;
  const tempOpts = TEMP_OPTIONS.filter(t => closeBy(current.distance_to_cbd_km, (SUBURB_STATS[t.suburb]?.distance_to_cbd_km ?? 10)));
  const storageOpts = STORAGE_OPTIONS.filter(st => closeBy(current.distance_to_cbd_km, (SUBURB_STATS[st.suburb]?.distance_to_cbd_km ?? 10)));
  const properties = PROPERTIES.filter(p => p.suburb === currentSuburb || cheaper.map(c=>c[0]).includes(p.suburb));
  return { cheaper_suburbs: cheaper, temporary_options: tempOpts, storage_options: storageOpts, properties };
}
function buildDashboardSeries(today, currentRent, projectedRent, stepDate, weeklyIncome, monthsHorizon=18) {
  const timeline = [];
  const rents = [];
  const ratios = [];
  for (let m=0; m<=monthsHorizon; m++) {
    const d = addMonths(today, m);
    timeline.push(d);
    const rent = d < stepDate ? currentRent : projectedRent;
    rents.push(rent);
    ratios.push(Number((weeklyIncome>0 ? rent/weeklyIncome : 1).toFixed(3)));
  }
  return { timeline_months: timeline, timeline_projected_rents: rents, affordability_ratio_series: ratios, stress_thresholds: { stress: 0.30, severe: 0.40 } };
}

// -------------------------------------------------------------
// Layout
// -------------------------------------------------------------

function NavLink({ to, icon: Icon, children }) {
  const loc = useLocation();
  const active = loc.pathname === to;
  return (
    <Link to={to} className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${active ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-200/60"}`}>
      {Icon && <Icon className="h-4 w-4" />} {children}
    </Link>
  );
}

function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.12),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.12),transparent_60%)]" />
      <header className="relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/80 backdrop-blur border border-white/60 shadow-sm flex items-center justify-center">
              <Radar className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <div className="text-xl font-semibold tracking-tight">RentScope</div>
              <div className="text-xs text-neutral-500">Predict. Prepare. Stay secure.</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-2">
            <NavLink to="/" icon={Home}>Home</NavLink>
            <NavLink to="/dashboard" icon={LayoutDashboard}>Dashboard</NavLink>
            <NavLink to="/accommodation" icon={Building2}>Accommodation</NavLink>
            <NavLink to="/news" icon={Newspaper}>News</NavLink>
            <NavLink to="/profile" icon={UserIcon}>Account</NavLink>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="secondary" className="rounded-xl"><LogIn className="h-4 w-4 mr-2"/>Login</Button></Link>
          </div>
        </div>
      </header>
      <main className="relative z-10">{children}</main>
      <footer className="relative z-10 border-t mt-16">
        <div className="max-w-7xl mx-auto px-6 py-10 text-sm text-neutral-600 flex items-center gap-2">
          <Home className="h-4 w-4" /> Designed for WA renters. Demo data only.
        </div>
      </footer>
    </div>
  );
}

// -------------------------------------------------------------
// Pages
// -------------------------------------------------------------

function HomePage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-7xl mx-auto px-6">
      <section className="pt-12 pb-10 grid lg:grid-cols-2 gap-10 items-center">
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.4}}>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-neutral-900">See rent hikes before they hit</h1>
          <p className="mt-4 text-neutral-600 text-lg">RentScope predicts when your rent will rise, what it will be, and gives you alternatives, temporary options, and storage if you need to bridge a move.</p>
          <div className="mt-6 flex items-center gap-3">
            <Button className="rounded-xl" onClick={()=>navigate("/dashboard")}>Open dashboard</Button>
            <Button variant="secondary" className="rounded-xl" onClick={()=>navigate("/accommodation")}>Browse accommodation</Button>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <Stat label="Forecast accuracy" value="Model confidence up to 95%" />
            <Stat label="Benchmarks" value="Suburb medians and ranges" />
            <Stat label="Safety net" value="Shelter and storage options" />
          </div>
        </motion.div>
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.45, delay:0.05}}>
          <HeroCard />
        </motion.div>
      </section>

      <section className="py-8">
        <h2 className="text-xl font-medium">How it works</h2>
        <div className="mt-4 grid md:grid-cols-3 gap-4">
          <FeatureCard icon={TrendingUp} title="Predict">Forecast the next increase by suburb pattern</FeatureCard>
          <FeatureCard icon={Wallet2} title="Plan">See affordability and savings guidance</FeatureCard>
          <FeatureCard icon={Building2} title="Move smart">Compare cheaper suburbs and partner listings</FeatureCard>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <Card className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur shadow-sm">
      <CardHeader className="pb-2"><CardDescription className="text-neutral-600">{label}</CardDescription></CardHeader>
      <CardContent><div className="text-neutral-900 font-semibold">{value}</div></CardContent>
    </Card>
  );
}

function FeatureCard({ icon: Icon, title, children }) {
  return (
    <Card className="rounded-2xl border bg-white/70 backdrop-blur shadow-sm">
      <CardHeader><CardTitle className="flex items-center gap-2">{Icon && <Icon className="h-5 w-5 text-sky-600"/>} {title}</CardTitle></CardHeader>
      <CardContent className="text-neutral-600 text-sm">{children}</CardContent>
    </Card>
  );
}

function HeroCard() {
  // mini inline preview of forecast
  const today = useMemo(()=> new Date("2025-08-29T12:00:00+08:00"), []);
  const stats = SUBURB_STATS["Nedlands"];
  const pred = predictNextIncrease({ weekly_rent: 500, lease_start: new Date("2024-10-01"), increase_history: [], landlord_type: "agency" }, stats, today);
  const aff = affordability(500, 1500, pred.months_until_increase, pred.projected_rent_weekly);
  return (
    <Card className="rounded-3xl border bg-white/70 backdrop-blur shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><LineChartIcon className="h-5 w-5 text-sky-600"/> Forecast preview</CardTitle>
        <CardDescription>Nedlands, $500 per week</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-3 gap-4">
          <Metric label="Next increase" value={pred.next_increase_date.toLocaleDateString()} icon={TrendingUp} />
          <Metric label="Projected rent" value={`$${pred.projected_rent_weekly.toFixed(2)}`} icon={Wallet2} />
          <Metric label="Affordability" value={`${(aff.rent_to_income_ratio*100).toFixed(1)}% income`} icon={ShieldCheck} />
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border p-4 bg-white/60">
      <div className="text-sm text-neutral-500 flex items-center gap-2">{Icon && <Icon className="h-4 w-4"/>} {label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function LoginPage() {
  const [mode, setMode] = useState("login");
  return (
    <div className="max-w-md mx-auto px-6 pt-12 pb-16">
      <Card className="rounded-3xl bg-white/70 backdrop-blur">
        <CardHeader>
          <CardTitle>{mode === "login" ? "Welcome back" : "Create account"}</CardTitle>
          <CardDescription>Secure sign in. Demo only. No backend connected.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input className="rounded-xl" type="email" placeholder="you@example.com" />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input className="rounded-xl" type="password" placeholder="••••••••" />
          </div>
          {mode === "signup" && (
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input className="rounded-xl" type="text" placeholder="Alex" />
            </div>
          )}
          <div className="flex items-center justify-between pt-2">
            <Button className="rounded-xl">{mode === "login" ? "Login" : "Create account"}</Button>
            <Button variant="ghost" onClick={()=> setMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "Sign up" : "Back to login"}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProfilePage() {
  const [weeklyIncome, setWeeklyIncome] = useState(1500);
  const [householdSize, setHouseholdSize] = useState(2);
  const [hasChildren, setHasChildren] = useState(false);
  const [accessNeeded, setAccessNeeded] = useState(false);
  const [preferred, setPreferred] = useState("Nedlands");
  const [saved, setSaved] = useState(false);
  useEffect(()=>{ if (saved) setTimeout(()=> setSaved(false), 1500); }, [saved]);
  return (
    <div className="max-w-3xl mx-auto px-6 pt-10 pb-16">
      <Card className="rounded-3xl bg-white/70 backdrop-blur">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Profile and preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Weekly income ($)</Label>
              <Input className="rounded-xl" type="number" value={weeklyIncome} onChange={e=>setWeeklyIncome(Number(e.target.value||0))} />
            </div>
            <div className="space-y-2">
              <Label>Household size</Label>
              <Input className="rounded-xl" type="number" value={householdSize} onChange={e=>setHouseholdSize(Number(e.target.value||1))} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3"><Switch checked={hasChildren} onCheckedChange={setHasChildren}/><Label>Children in household</Label></div>
            <div className="flex items-center gap-3"><Switch checked={accessNeeded} onCheckedChange={setAccessNeeded}/><Label>Accessibility needed</Label></div>
          </div>
          <div className="space-y-2">
            <Label>Preferred suburb</Label>
            <Select value={preferred} onValueChange={setPreferred}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(SUBURB_STATS).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="pt-2">
            <Button className="rounded-xl" onClick={()=> setSaved(true)}>Save changes</Button>
            {saved && <span className="ml-3 text-sm text-emerald-600">Saved</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardPage() {
  const today = useMemo(()=> new Date("2025-08-29T12:00:00+08:00"), []);
  const [suburb, setSuburb] = useState("Nedlands");
  const [weeklyRent, setWeeklyRent] = useState(500);
  const [weeklyIncome, setWeeklyIncome] = useState(1500);
  const [leaseStart, setLeaseStart] = useState("2024-10-01");
  const [leaseEnd, setLeaseEnd] = useState("2025-10-01");
  const [landlordType, setLandlordType] = useState("agency");
  const [overpayThreshold, setOverpayThreshold] = useState(0.10);

  const stats = SUBURB_STATS[suburb];
  const pred = predictNextIncrease({ weekly_rent: Number(weeklyRent), lease_start: new Date(leaseStart), increase_history: [], landlord_type: landlordType }, stats, today);
  const aff = affordability(Number(weeklyRent), Number(weeklyIncome), pred.months_until_increase, pred.projected_rent_weekly);
  const bench = benchmark(stats, Number(weeklyRent), Number(overpayThreshold));
  const risk = evictionRisk({ landlord_type: landlordType }, { weekly_income: Number(weeklyIncome) }, stats, aff);
  const trend = trendAlert(stats);
  const alts = alternatives(suburb, Number(weeklyRent), { preferred_suburbs: [suburb] });
  const dashboard = buildDashboardSeries(today, Number(weeklyRent), pred.projected_rent_weekly, pred.next_increase_date, Number(weeklyIncome));

  const chartData = dashboard.timeline_months.map((d, i) => ({ month: d.toISOString().slice(0,7), rent: dashboard.timeline_projected_rents[i], ratio: dashboard.affordability_ratio_series[i] }));

  return (
    <div className="max-w-7xl mx-auto px-6 pt-8 pb-14">
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <Card className="rounded-3xl bg-white/70 backdrop-blur lg:col-span-1">
          <CardHeader>
            <CardTitle>Inputs</CardTitle>
            <CardDescription>Update your details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Suburb</Label>
              <Select value={suburb} onValueChange={setSuburb}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(SUBURB_STATS).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Weekly rent ($)</Label><Input className="rounded-xl" type="number" value={weeklyRent} onChange={e=>setWeeklyRent(Number(e.target.value||0))} /></div>
              <div className="space-y-2"><Label>Weekly income ($)</Label><Input className="rounded-xl" type="number" value={weeklyIncome} onChange={e=>setWeeklyIncome(Number(e.target.value||0))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Lease start</Label><Input className="rounded-xl" type="date" value={leaseStart} onChange={e=>setLeaseStart(e.target.value)} /></div>
              <div className="space-y-2"><Label>Lease end</Label><Input className="rounded-xl" type="date" value={leaseEnd} onChange={e=>setLeaseEnd(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Landlord type</Label>
                <Select value={landlordType} onValueChange={setLandlordType}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agency">Agency</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="community_housing">Community housing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Overpay threshold</Label>
                <div className="flex items-center gap-3">
                  <input type="range" min={0.05} max={0.25} step={0.01} value={overpayThreshold} onChange={(e)=>setOverpayThreshold(Number(e.target.value))} className="w-full" />
                  <div className="text-sm w-14 text-right">{Math.round(overpayThreshold*100)}%</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <MiniMetric label="Next increase" value={pred.next_increase_date.toLocaleDateString()} icon={TrendingUp} />
            <MiniMetric label="Projected weekly rent" value={`$${pred.projected_rent_weekly.toFixed(2)}`} icon={Wallet2} />
            <MiniMetric label="Confidence" value={`${Math.round(pred.confidence*100)}%`} icon={ShieldCheck} />
          </div>

          <Card className="rounded-3xl bg-white/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><LineChartIcon className="h-5 w-5 text-sky-600"/> Forecast</CardTitle>
              <CardDescription>Projected rent and affordability over the next 18 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ left: 10, right: 20, top: 5, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} domain={[0, Math.max(...chartData.map(d=>d.rent))*1.2]} />
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
            <Card className="rounded-3xl bg-white/70 backdrop-blur">
              <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /> Trend alert</CardTitle></CardHeader>
              <CardContent>
                <div className="text-sm text-neutral-600">Recent vs 12 month average</div>
                <div className="text-lg font-semibold">{reportNumber(trend.recent_vs_longterm_growth_diff)} %</div>
                <div className="text-sm text-neutral-700 mt-1">{trend.alert || "No strong deviation detected"}</div>
              </CardContent>
            </Card>
            <Card className="rounded-3xl bg-white/70 backdrop-blur">
              <CardHeader><CardTitle className="flex items-center gap-2"><Wallet2 className="h-5 w-5 text-emerald-600" /> Benchmark</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                <Row label="Suburb median" value={`$${bench.suburb_median.toFixed(2)}`} />
                <Row label="Overpay %" value={`${(bench.overpay_percent*100).toFixed(1)}%`} />
                <Row label="Negotiate toward" value={`$${bench.suggested_negotiation_range[0]} - $${bench.suggested_negotiation_range[1]}`} />
                <p className="text-xs text-neutral-600 pt-1">Benchmarking gives tenants fair reference points. Broad awareness can reduce overpriced listings over time.</p>
              </CardContent>
            </Card>
            <Card className="rounded-3xl bg-white/70 backdrop-blur">
              <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-sky-700" /> Eviction risk</CardTitle></CardHeader>
              <CardContent>
                <Row label="Risk band" value={risk.band} />
                <Row label="Score" value={risk.risk_score} />
                <Row label="Rent burden" value={reportNumber(risk.drivers.rent_burden)} />
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-3xl bg-white/70 backdrop-blur">
            <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-sky-600"/> Alternatives</CardTitle></CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-3">
                {alts.cheaper_suburbs.map(([s, m]) => (
                  <div key={s} className="rounded-2xl border p-4 bg-white/60">
                    <div className="text-sm text-neutral-500 flex items-center gap-2"><MapPin className="h-4 w-4"/> {s}</div>
                    <div className="text-lg font-semibold">${m.toFixed(2)}</div>
                    <div className="text-xs text-neutral-500">Median weekly rent</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm"><span className="text-neutral-600">{label}</span><span className="font-medium">{String(value)}</span></div>
  );
}
function MiniMetric({ label, value, icon: Icon }) {
  return (
    <Card className="rounded-2xl bg-white/70 backdrop-blur">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-neutral-600 flex items-center gap-2">{Icon && <Icon className="h-4 w-4"/>} {label}</CardTitle></CardHeader>
      <CardContent><div className="text-xl font-semibold">{value}</div></CardContent>
    </Card>
  );
}

function AccommodationPage() {
  const [query, setQuery] = useState("");
  const [suburb, setSuburb] = useState("All");
  const [maxRent, setMaxRent] = useState(1000);
  const [bedrooms, setBedrooms] = useState("Any");
  const [nearUni, setNearUni] = useState(false);
  const [sort, setSort] = useState("price_asc");

  const filtered = PROPERTIES.filter(p => {
    if (suburb !== "All" && p.suburb !== suburb) return false;
    if (p.weekly > maxRent) return false;
    if (bedrooms !== "Any" && p.bedrooms !== Number(bedrooms)) return false;
    if (nearUni && !p.near_university) return false;
    if (query && !(`${p.title} ${p.suburb}`.toLowerCase().includes(query.toLowerCase()))) return false;
    return true;
  }).sort((a,b)=> sort === "price_asc" ? a.weekly - b.weekly : sort === "price_desc" ? b.weekly - a.weekly : a.distance_to_cbd_km - b.distance_to_cbd_km);

  const centre = SUBURB_COORDS["Perth"]; // default map centre

  return (
    <div className="max-w-7xl mx-auto px-6 pt-8 pb-14">
      <Card className="rounded-3xl bg-white/70 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-sky-700"/> Accommodation</CardTitle>
          <CardDescription>Filter, sort, and view on a map</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="rounded-2xl border p-4 bg-white/60 space-y-3">
                <div className="flex items-center gap-2"><Search className="h-4 w-4 text-neutral-500"/><Input className="rounded-xl" placeholder="Search title or suburb" value={query} onChange={e=>setQuery(e.target.value)} /></div>
                <div className="space-y-2">
                  <Label>Suburb</Label>
                  <Select value={suburb} onValueChange={setSuburb}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All</SelectItem>
                      {Object.keys(SUBURB_STATS).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Max weekly rent</Label>
                  <div className="flex items-center gap-3">
                    <input type="range" min={200} max={1200} step={10} value={maxRent} onChange={(e)=>setMaxRent(Number(e.target.value))} className="w-full" />
                    <div className="text-sm w-16 text-right">${maxRent}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Bedrooms</Label>
                    <Select value={bedrooms} onValueChange={setBedrooms}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Any">Any</SelectItem>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3 mt-6"><Switch checked={nearUni} onCheckedChange={setNearUni} /><Label>Near university</Label></div>
                </div>
                <div className="space-y-2">
                  <Label>Sort</Label>
                  <Select value={sort} onValueChange={setSort}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="price_asc">Price low to high</SelectItem>
                      <SelectItem value="price_desc">Price high to low</SelectItem>
                      <SelectItem value="distance">Distance to CBD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-2xl border p-3 bg-white/60 h-80">
                {MapContainer ? (
                  <MapContainer center={[centre.lat, centre.lng]} zoom={11} style={{ height: "100%", width: "100%", borderRadius: 16 }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                    {filtered.map(p => (
                      <Marker key={p.id} position={[p.lat, p.lng]}>
                        <Popup>
                          <div className="font-medium">{p.title}</div>
                          <div className="text-sm">{p.suburb} · ${p.weekly}/wk</div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-neutral-500">Map preview unavailable in this environment</div>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {filtered.map(p => (
                  <div key={p.id} className="rounded-2xl border p-4 bg-white/60">
                    <div className="text-sm text-neutral-600">{p.type} · {p.bedrooms} bed</div>
                    <div className="text-lg font-semibold">{p.title}</div>
                    <div className="text-xs text-neutral-500">{p.suburb} · {p.distance_to_cbd_km} km to CBD · {p.near_university ? "Near university" : "General"}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="font-medium">${p.weekly}/wk</div>
                      <Button variant="secondary" className="rounded-xl">View <ChevronRight className="h-4 w-4 ml-1"/></Button>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div className="text-sm text-neutral-600">No results with current filters</div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NewsPage() {
  const [suburb, setSuburb] = useState("Nedlands");
  const stats = SUBURB_STATS[suburb];
  const trend = trendAlert(stats);

  const newsFeed = [
    { id: "n1", date: "2025-08-15", tag: "Policy", title: "WA rent assistance pilot expands for young families", summary: "The pilot increases eligibility thresholds and adds transport concessions in growth corridors.", impact: "Likely to ease rent burden for low income families in selected suburbs." },
    { id: "n2", date: "2025-08-08", tag: "Market", title: `${suburb} vacancy rates tighten`, summary: "Vacancy edged lower over the last quarter, consistent with short term price pressure.", impact: trend.alert || "Neutral short term movement." },
    { id: "n3", date: "2025-08-01", tag: "Student", title: "Student accommodation adds short stay capacity near UWA", summary: "Short stay beds available during semester break with capped weekly rates.", impact: "May reduce temporary housing pressure for students moving between leases." },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 pt-8 pb-14">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">News and trends</h2>
          <p
