import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, ShieldCheck, Wallet2, MapPin, LineChart as LineChartIcon, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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

// -------------------------------------------------------------
// Dummy data and lightweight predictors (self contained, no API)
// -------------------------------------------------------------

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
    suggested_negotiation_range: [
      Math.round(median * 0.95 * 100) / 100,
      Math.round(median * 1.05 * 100) / 100,
    ],
  };
}
function evictionRisk(lease, user, stats, aff) {
  const drivers = {};
  drivers.rent_burden = Math.min(1, Math.max(0, (aff.rent_to_income_ratio - 0.25) / 0.25));
  drivers.turnover = Math.min(1, stats.turnover_rate / 0.5);
  drivers.eviction_proxy = Math.min(1, stats.eviction_rate / 0.08);
  drivers.landlord_factor = lease.landlord_type === "agency" ? 0.6 : lease.landlord_type === "private" ? 0.5 : 0.4;
  const raw =
    0.35 * drivers.rent_burden + 0.25 * drivers.turnover + 0.25 * drivers.eviction_proxy + 0.15 * drivers.landlord_factor;
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
  return { cheaper_suburbs: cheaper };
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

// -------------------------------------------------------------
// Dashboard only component
// -------------------------------------------------------------

export default function RentScopeDashboard() {
  const today = useMemo(() => new Date("2025-08-29T12:00:00+08:00"), []);

  // Personalisation mock
  const [displayName, setDisplayName] = useState(() => localStorage.getItem("rs_name") || "Alex");
  useEffect(() => localStorage.setItem("rs_name", displayName), [displayName]);

  // Inputs
  const [suburb, setSuburb] = useState(() => localStorage.getItem("rs_suburb") || "Nedlands");
  const [weeklyRent, setWeeklyRent] = useState(500);
  const [weeklyIncome, setWeeklyIncome] = useState(1500);
  const [leaseStart, setLeaseStart] = useState("2024-10-01");
  const [landlordType, setLandlordType] = useState("agency");
  const [overpayThreshold, setOverpayThreshold] = useState(0.1);
  useEffect(() => localStorage.setItem("rs_suburb", suburb), [suburb]);

  const stats = SUBURB_STATS[suburb];
  const pred = predictNextIncrease(
    { weekly_rent: Number(weeklyRent), lease_start: new Date(leaseStart), increase_history: [], landlord_type: landlordType },
    stats,
    today
  );
  const aff = affordability(Number(weeklyRent), Number(weeklyIncome), pred.months_until_increase, pred.projected_rent_weekly);
  const bench = benchmark(stats, Number(weeklyRent), Number(overpayThreshold));
  const risk = evictionRisk({ landlord_type: landlordType }, { weekly_income: Number(weeklyIncome) }, stats, aff);
  const trend = trendAlert(stats);
  const alts = alternatives(suburb, Number(weeklyRent));
  const series = buildDashboardSeries(today, Number(weeklyRent), pred.projected_rent_weekly, pred.next_increase_date, Number(weeklyIncome));

  const chartData = series.timeline_months.map((d, i) => ({
    month: d.toISOString().slice(0, 7),
    rent: series.timeline_projected_rents[i],
    ratio: series.affordability_ratio_series[i],
  }));

  // Smoke tests
  useEffect(() => {
    console.assert(SUBURB_STATS[suburb], "Valid suburb required");
    console.assert(chartData.length > 10, "Chart should have a horizon of months");
    console.assert(pred.projected_rent_weekly >= 0, "Projected rent must be non negative");
  }, [suburb, chartData.length, pred.projected_rent_weekly]);

  // Latest update text
  const latest = (() => {
    const parts = [];
    if (bench.overpaying_flag) parts.push("Your current rent sits above local benchmark");
    if (trend.alert) parts.push(trend.alert.toLowerCase());
    if (risk.band === "high") parts.push("eviction risk is elevated");
    return parts.length ? parts.join(" · ") + "." : "No strong red flags based on current inputs.";
  })();

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="sticky top-0 z-10 bg-white/70 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-xl font-semibold tracking-tight">Dashboard</div>
          <div className="text-sm text-neutral-600">Demo only. No backend.</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome and latest update */}
        <div className="grid lg:grid-cols-3 gap-6 items-stretch">
          <Card className="rounded-3xl bg-white/70 backdrop-blur lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-2xl">Welcome, {displayName}</CardTitle>
              <CardDescription>Personalised view for {suburb}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Display name</Label>
                  <Input className="rounded-xl" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Preferred suburb</Label>
                  <Select value={suburb} onValueChange={setSuburb}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Choose suburb" /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(SUBURB_STATS).map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <Metric label="Next increase" value={pred.next_increase_date.toLocaleDateString()} icon={TrendingUp} />
                <Metric label="Projected rent" value={`$${pred.projected_rent_weekly.toFixed(2)}/wk`} icon={Wallet2} />
                <Metric label="Confidence" value={`${Math.round(pred.confidence * 100)}%`} icon={ShieldCheck} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl bg-white/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /> Latest update</CardTitle>
              <CardDescription>Auto generated from your inputs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-neutral-700">{latest}</div>
            </CardContent>
          </Card>
        </div>

        {/* Inputs */}
        <div className="grid lg:grid-cols-3 gap-6 items-start mt-6">
          <Card className="rounded-3xl bg-white/70 backdrop-blur lg:col-span-1">
            <CardHeader>
              <CardTitle>Inputs</CardTitle>
              <CardDescription>Update to refresh predictions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Weekly rent ($)</Label>
                  <Input className="rounded-xl" type="number" value={weeklyRent} onChange={(e) => setWeeklyRent(Number(e.target.value || 0))} />
                </div>
                <div className="space-y-2">
                  <Label>Weekly income ($)</Label>
                  <Input className="rounded-xl" type="number" value={weeklyIncome} onChange={(e) => setWeeklyIncome(Number(e.target.value || 0))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Lease start</Label>
                  <Input className="rounded-xl" type="date" value={leaseStart} onChange={(e) => setLeaseStart(e.target.value)} />
                </div>
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
              </div>
              <div className="space-y-2">
                <Label>Overpay threshold</Label>
                <div className="flex items-center gap-3">
                  <input type="range" min={0.05} max={0.25} step={0.01} value={overpayThreshold} onChange={(e) => setOverpayThreshold(Number(e.target.value))} className="w-full" />
                  <div className="text-sm w-14 text-right">{Math.round(overpayThreshold * 100)}%</div>
                </div>
              </div>
              <Button className="rounded-xl" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}>See recommendations</Button>
            </CardContent>
          </Card>

          {/* Forecast and key charts */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="rounded-3xl bg-white/70 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><LineChartIcon className="h-5 w-5 text-sky-600" /> Forecast</CardTitle>
                <CardDescription>Projected rent and affordability for 18 months</CardDescription>
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
                      <ReferenceLine y={series.stress_thresholds.stress} yAxisId="right" stroke="#ef4444" strokeDasharray="4 4" label="Stress 30%" />
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
                  <Row label="Overpay %" value={`${(bench.overpay_percent * 100).toFixed(1)}%`} />
                  <Row label="Negotiate toward" value={`$${bench.suggested_negotiation_range[0]} - $${bench.suggested_negotiation_range[1]}`} />
                  <p className="text-xs text-neutral-600 pt-1">Benchmarks reveal overpriced leases. Tenant movement can pressure down prices over time.</p>
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
              <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-sky-600" /> Alternatives</CardTitle></CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-3">
                  {alts.cheaper_suburbs.length ? (
                    alts.cheaper_suburbs.map(([s, m]) => (
                      <div key={s} className="rounded-2xl border p-4 bg-white/60">
                        <div className="text-sm text-neutral-500 flex items-center gap-2"><MapPin className="h-4 w-4" /> {s}</div>
                        <div className="text-lg font-semibold">${m.toFixed(2)}</div>
                        <div className="text-xs text-neutral-500">Median weekly rent</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-neutral-600">No cheaper suburbs in similar distance band</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-10 text-sm text-neutral-600 text-center">© 2025 RentScope. Demo dashboard.</footer>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm"><span className="text-neutral-600">{label}</span><span className="font-medium">{String(value)}</span></div>
  );
}
function Metric({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border p-4 bg-white/60">
      <div className="text-sm text-neutral-500 flex items-center gap-2">{Icon && <Icon className="h-4 w-4" />} {label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
function reportNumber(n) {
  return typeof n === "number" && Number.isFinite(n) ? (Math.round(n * 100) / 100).toFixed(2) : "-";
}
