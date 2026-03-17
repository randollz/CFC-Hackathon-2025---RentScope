# rentscope_backend.py
# Core backend logic for RentScope: Predictive Rent Stability & Alternatives Tool
# No external dependencies beyond the Python standard library.

from __future__ import annotations
from dataclasses import dataclass, field, asdict
from datetime import date, timedelta
from typing import List, Dict, Optional, Tuple
import math
import statistics

# ---------------------------------------------------------------------------
# Domain models
# ---------------------------------------------------------------------------

@dataclass
class UserProfile:
    user_id: str
    name: str
    weekly_income: float
    household_size: int
    has_children: bool = False
    disability_access_needed: bool = False
    preferred_suburbs: List[str] = field(default_factory=list)
    transport_modes: List[str] = field(default_factory=lambda: ["public", "car", "bike"])
    # Optional: citizenship or concession flags for eligibility checks
    has_healthcare_card: bool = False
    is_international_student: bool = False


@dataclass
class Lease:
    lease_id: str
    user_id: str
    property_id: str
    suburb: str
    weekly_rent: float
    lease_start: date
    lease_end: date
    landlord_type: str = "private"  # "private" or "agency" or "community_housing"
    # Optional record of past increases as (date, new_weekly_rent)
    increase_history: List[Tuple[date, float]] = field(default_factory=list)


@dataclass
class Property:
    property_id: str
    suburb: str
    bedrooms: int
    dwelling_type: str  # "apartment", "house", "villa", "granny_flat", etc.
    distance_to_cbd_km: float
    near_university: bool
    accessibility_features: List[str] = field(default_factory=list)
    provider_kind: str = "individual"  # or "company"
    affiliate_link: Optional[str] = None  # for monetisation if you choose later


@dataclass
class SuburbStats:
    suburb: str
    median_rent_weekly: float
    distance_to_cbd_km: float
    near_university: bool
    # Typical increase pattern for this area
    periodicity_months: int  # e.g., 12 for annually, 6 for twice a year
    percent_increase_per_period: float  # e.g., 0.05 means 5% each period
    # Volatility and movement proxies
    annual_volatility: float  # std dev of annual growth, e.g., 0.02
    turnover_rate: float  # fraction of leases that change tenants per year, e.g., 0.35
    eviction_rate: float  # proxy if available; dummy here, e.g., 0.03
    # Optional light history for trend alerts (past 12 months of index values or growth)
    monthly_growth_last_12: List[float] = field(default_factory=list)


@dataclass
class TemporaryOption:
    opt_id: str
    name: str
    kind: str  # "emergency_shelter", "student_accom", "motel"
    suburb: str
    price_per_week: float
    capacity: int
    criteria: str  # short eligibility notes
    contact_url: Optional[str] = None


@dataclass
class StorageOption:
    store_id: str
    name: str
    suburb: str
    price_per_week: float
    capacity_m3: float
    contact_url: Optional[str] = None


@dataclass
class PredictionResult:
    suburb: str
    current_rent_weekly: float
    next_increase_date: date
    months_until_increase: int
    projected_rent_weekly: float
    expected_increase_rate: float  # fraction, e.g., 0.05
    confidence: float  # 0..1, derived from volatility and history


@dataclass
class AffordabilityResult:
    rent_to_income_ratio: float  # fraction, e.g., 0.33
    over_30_stress: bool
    over_40_severe: bool
    weekly_saving_needed_for_hike: float  # suggested savings per week until increase date


@dataclass
class BenchmarkResult:
    suburb_median: float
    overpaying_flag: bool
    overpay_percent: float  # positive if overpaying
    suggested_negotiation_range: Tuple[float, float]  # e.g., (target_low, target_high)


@dataclass
class EvictionRiskResult:
    risk_score: float  # 0..1
    drivers: Dict[str, float]  # contribution by factor
    band: str  # "low", "moderate", "high"


@dataclass
class TrendAlert:
    suburb: str
    recent_vs_longterm_growth_diff: float
    alert: Optional[str]  # None or message like "Upward trend detected"


@dataclass
class AlternativeSuggestion:
    cheaper_suburbs: List[Tuple[str, float]]  # [(suburb, median_rent), ...]
    temporary_options: List[TemporaryOption]
    storage_options: List[StorageOption]
    filtered_properties: List[Property]


@dataclass
class StabilityDashboardDTO:
    # Data your front end can plot without extra transforms
    timeline_months: List[date]
    timeline_projected_rents: List[float]
    affordability_ratio_series: List[float]
    stress_thresholds: Dict[str, float]  # {"stress": 0.30, "severe": 0.40}


# ---------------------------------------------------------------------------
# In-memory data store with dummy WA data
# ---------------------------------------------------------------------------

class InMemoryDataStore:
    def __init__(self):
        # Suburb stats align with your examples and a few extras to power alternatives
        self.suburb_stats: Dict[str, SuburbStats] = {
            "Nedlands": SuburbStats(
                suburb="Nedlands",
                median_rent_weekly=800.0,
                distance_to_cbd_km=7.0,
                near_university=True,
                periodicity_months=12,
                percent_increase_per_period=0.05,  # 5% yearly
                annual_volatility=0.02,
                turnover_rate=0.32,
                eviction_rate=0.03,
                monthly_growth_last_12=[0.2, 0.3, 0.4, 0.4, 0.2, 0.1, 0.0, -0.1, 0.1, 0.2, 0.3, 0.2],  # %
            ),
            "Canning Vale": SuburbStats(
                suburb="Canning Vale",
                median_rent_weekly=650.0,
                distance_to_cbd_km=17.0,
                near_university=False,
                periodicity_months=6,
                percent_increase_per_period=0.01,  # 1% every 6 months
                annual_volatility=0.01,
                turnover_rate=0.28,
                eviction_rate=0.02,
                monthly_growth_last_12=[0.1, 0.1, 0.2, 0.1, 0.1, 0.0, 0.0, 0.0, 0.1, 0.2, 0.1, 0.1],
            ),
            "Joondalup": SuburbStats(
                suburb="Joondalup",
                median_rent_weekly=500.0,
                distance_to_cbd_km=26.0,
                near_university=True,
                periodicity_months=12,
                percent_increase_per_period=0.03,
                annual_volatility=0.015,
                turnover_rate=0.30,
                eviction_rate=0.02,
                monthly_growth_last_12=[0.0, 0.1, 0.1, 0.1, 0.0, -0.1, 0.0, 0.1, 0.2, 0.1, 0.1, 0.0],
            ),
            "Armadale": SuburbStats(
                suburb="Armadale",
                median_rent_weekly=450.0,
                distance_to_cbd_km=36.0,
                near_university=False,
                periodicity_months=12,
                percent_increase_per_period=0.025,
                annual_volatility=0.02,
                turnover_rate=0.33,
                eviction_rate=0.035,
                monthly_growth_last_12=[0.2, 0.2, 0.1, 0.0, -0.1, -0.1, 0.0, 0.1, 0.2, 0.1, 0.0, 0.0],
            ),
            "East Perth": SuburbStats(
                suburb="East Perth",
                median_rent_weekly=700.0,
                distance_to_cbd_km=2.0,
                near_university=False,
                periodicity_months=12,
                percent_increase_per_period=0.04,
                annual_volatility=0.03,
                turnover_rate=0.40,
                eviction_rate=0.04,
                monthly_growth_last_12=[0.3, 0.2, 0.1, 0.1, 0.1, 0.0, 0.0, 0.2, 0.3, 0.2, 0.2, 0.1],
            ),
        }

        # Temporary housing options
        self.temp_options: List[TemporaryOption] = [
            TemporaryOption("tmp1", "WA Youth Shelter - CBD", "emergency_shelter", "Perth", 0.0, 20, "Under 25s, intake required"),
            TemporaryOption("tmp2", "Student Village Short Stay", "student_accom", "Crawley", 280.0, 15, "Student ID required"),
            TemporaryOption("tmp3", "Budget Motel South", "motel", "Cannington", 420.0, 8, "Short stays only"),
        ]

        # Storage options
        self.storage_options: List[StorageOption] = [
            StorageOption("st1", "SafeStore Nedlands", "Nedlands", 40.0, 6.0),
            StorageOption("st2", "Metro Storage South", "Canning Vale", 35.0, 5.5),
            StorageOption("st3", "Budget Boxes North", "Joondalup", 30.0, 7.0),
        ]

        # Example properties for affiliate linking or matching
        self.properties: List[Property] = [
            Property("p1", "Joondalup", 3, "house", 26.0, True, ["step_free"], "company", "https://example.com/prop/p1"),
            Property("p2", "Armadale", 2, "villa", 36.0, False, [], "individual", "https://example.com/prop/p2"),
            Property("p3", "Canning Vale", 3, "house", 17.0, False, [], "company", "https://example.com/prop/p3"),
            Property("p4", "Nedlands", 2, "apartment", 7.0, True, ["lift_access"], "company", "https://example.com/prop/p4"),
        ]

        # Example users and leases could be persisted elsewhere; tests use ad hoc construction

# ---------------------------------------------------------------------------
# Engines
# ---------------------------------------------------------------------------

class PredictionEngine:
    def __init__(self, inflation_assumption: float = 0.03):
        """
        inflation_assumption: long run CPI used only to pad confidence and for tie breaks
        """
        self.inflation_assumption = inflation_assumption

    @staticmethod
    def _months_between(d1: date, d2: date) -> int:
        ydiff = d2.year - d1.year
        mdiff = d2.month - d1.month
        return ydiff * 12 + mdiff - (1 if d2.day < d1.day else 0)

    def predict_next_increase(
        self,
        lease: Lease,
        suburb_stats: SuburbStats,
        today: Optional[date] = None
    ) -> PredictionResult:
        if today is None:
            today = date.today()

        # Determine last increase reference point
        last_increase_date = lease.lease_start
        if lease.increase_history:
            last_increase_date = max(ts for ts, _ in lease.increase_history)

        months_since_last = self._months_between(last_increase_date, today)
        period_m = suburb_stats.periodicity_months or 12
        periods_elapsed = months_since_last // period_m
        # Next increase date is last_increase_date + k * period_m where k = periods_elapsed + 1
        next_increase_date = self._add_months(last_increase_date, (periods_elapsed + 1) * period_m)
        months_until = max(0, self._months_between(today, next_increase_date))

        # Projected hike
        period_rate = suburb_stats.percent_increase_per_period
        projected_rent = round(lease.weekly_rent * (1 + period_rate), 2)

        # Confidence: lower when volatility is high and growth history is noisy
        vol = suburb_stats.annual_volatility
        hist = suburb_stats.monthly_growth_last_12 or [0.0]
        # Use variance of last 12 months growth as a noise proxy
        var = statistics.pvariance(hist)
        # Map to 0..1: lower var and vol mean higher confidence
        confidence = max(0.35, min(0.95, 1.0 - (vol * 3.0 + var * 8.0)))

        return PredictionResult(
            suburb=suburb_stats.suburb,
            current_rent_weekly=lease.weekly_rent,
            next_increase_date=next_increase_date,
            months_until_increase=months_until,
            projected_rent_weekly=projected_rent,
            expected_increase_rate=period_rate,
            confidence=round(confidence, 2)
        )

    @staticmethod
    def _add_months(d: date, months: int) -> date:
        # Simple month add without external libs
        month = d.month - 1 + months
        year = d.year + month // 12
        month = month % 12 + 1
        day = min(d.day, [31,
                          29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28,
                          31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
        return date(year, month, day)


class AffordabilityEngine:
    def affordability(
        self,
        weekly_rent: float,
        weekly_income: float,
        months_until_increase: int,
        projected_rent: float
    ) -> AffordabilityResult:
        ratio = weekly_rent / weekly_income if weekly_income > 0 else 1.0
        over_30 = ratio >= 0.30
        over_40 = ratio >= 0.40

        # Savings per week to absorb the step-up when it happens
        delta = max(0.0, projected_rent - weekly_rent)
        weeks_until = max(1, months_until_increase * 4)
        weekly_save = round(delta / weeks_until, 2)

        return AffordabilityResult(
            rent_to_income_ratio=round(ratio, 3),
            over_30_stress=over_30,
            over_40_severe=over_40,
            weekly_saving_needed_for_hike=weekly_save
        )


class BenchmarkEngine:
    def benchmark(
        self,
        suburb_stats: SuburbStats,
        current_rent: float,
        overpay_threshold: float = 0.10  # flag if > 10% above median
    ) -> BenchmarkResult:
        median = suburb_stats.median_rent_weekly
        overpay_percent = (current_rent - median) / median
        overpaying = overpay_percent > overpay_threshold
        # Suggest negotiation band around median ±5%
        low = round(median * 0.95, 2)
        high = round(median * 1.05, 2)
        return BenchmarkResult(
            suburb_median=median,
            overpaying_flag=overpaying,
            overpay_percent=round(overpay_percent, 3),
            suggested_negotiation_range=(low, high)
        )


class EvictionRiskScorer:
    def score(
        self,
        lease: Lease,
        user: UserProfile,
        suburb_stats: SuburbStats,
        affordability: AffordabilityResult
    ) -> EvictionRiskResult:
        drivers = {}
        # Base from rent burden
        drivers["rent_burden"] = min(1.0, max(0.0, (affordability.rent_to_income_ratio - 0.25) / 0.25))
        # Area turnover pressure
        drivers["turnover"] = min(1.0, suburb_stats.turnover_rate / 0.5)
        # Area eviction proxy
        drivers["eviction_proxy"] = min(1.0, suburb_stats.eviction_rate / 0.08)
        # Landlord type
        lt = lease.landlord_type
        drivers["landlord_factor"] = 0.6 if lt == "agency" else 0.5 if lt == "private" else 0.4

        raw = 0.35 * drivers["rent_burden"] + 0.25 * drivers["turnover"] + 0.25 * drivers["eviction_proxy"] + 0.15 * drivers["landlord_factor"]
        score = round(min(1.0, max(0.0, raw)), 2)
        band = "low" if score < 0.33 else "moderate" if score < 0.66 else "high"
        return EvictionRiskResult(risk_score=score, drivers=drivers, band=band)


class TrendEngine:
    def alert(self, stats: SuburbStats) -> TrendAlert:
        # Compare recent 3-month average vs last-12-month average
        last3 = statistics.mean(stats.monthly_growth_last_12[-3:]) if stats.monthly_growth_last_12 else 0.0
        last12 = statistics.mean(stats.monthly_growth_last_12) if stats.monthly_growth_last_12 else 0.0
        diff = last3 - last12
        alert = None
        if diff > 0.15:
            alert = "Upward trend detected"
        elif diff < -0.15:
            alert = "Downward trend detected"
        return TrendAlert(stats.suburb, round(diff, 3), alert)


class AlternativesEngine:
    def __init__(self, store: InMemoryDataStore):
        self.store = store

    def suggest(
        self,
        current_suburb: str,
        target_weekly_rent: float,
        user: UserProfile,
        max_distance_delta_km: float = 12.0,
        limit: int = 3
    ) -> AlternativeSuggestion:
        current = self.store.suburb_stats[current_suburb]
        # Cheaper suburbs with similar distance to CBD and university proximity
        candidates = []
        for s in self.store.suburb_stats.values():
            if s.suburb == current_suburb:
                continue
            is_similar_distance = abs(s.distance_to_cbd_km - current.distance_to_cbd_km) <= max_distance_delta_km
            uni_ok = (not user.preferred_suburbs) or (s.near_university or not any(self.store.suburb_stats[p].near_university for p in user.preferred_suburbs))
            if is_similar_distance and uni_ok and s.median_rent_weekly < target_weekly_rent:
                candidates.append((s.suburb, s.median_rent_weekly))
        candidates.sort(key=lambda x: x[1])
        cheaper = candidates[:limit]

        # Filter temporary options near current corridor
        temp_opts = [t for t in self.store.temp_options if self._close_by(current.distance_to_cbd_km, self._dist_for_suburb(t.suburb))]
        # Basic storage suggestions likewise
        storage_opts = [st for st in self.store.storage_options if self._close_by(current.distance_to_cbd_km, self._dist_for_suburb(st.suburb))]

        # Filter properties by affordability and accessibility if required
        props = []
        for p in self.store.properties:
            if p.suburb == current_suburb or p.suburb in [c[0] for c in cheaper]:
                if p.near_university == self.store.suburb_stats[p.suburb].near_university:
                    if not user.disability_access_needed or ("step_free" in p.accessibility_features or "lift_access" in p.accessibility_features):
                        # Simple affordability gate: within 90%..110% of local median
                        med = self.store.suburb_stats[p.suburb].median_rent_weekly
                        if 0.8 * med <= med <= 1.2 * med:  # always true, but left for your later rent-by-property integration
                            props.append(p)

        return AlternativeSuggestion(
            cheaper_suburbs=cheaper,
            temporary_options=temp_opts,
            storage_options=storage_opts,
            filtered_properties=props
        )

    def _dist_for_suburb(self, suburb: str) -> float:
        # Fallback for options not in stats map
        return self.store.suburb_stats.get(suburb, SuburbStats(suburb, 0, 10.0, False, 12, 0.03, 0.02, 0.2, 0.02)).distance_to_cbd_km

    @staticmethod
    def _close_by(d1: float, d2: float, tol: float = 10.0) -> bool:
        return abs(d1 - d2) <= tol


# ---------------------------------------------------------------------------
# Service orchestrator for front end calls
# ---------------------------------------------------------------------------

class RentScopeService:
    def __init__(self, store: Optional[InMemoryDataStore] = None):
        self.store = store or InMemoryDataStore()
        self.predictor = PredictionEngine()
        self.affordability_engine = AffordabilityEngine()
        self.benchmark_engine = BenchmarkEngine()
        self.eviction_scorer = EvictionRiskScorer()
        self.trend_engine = TrendEngine()
        self.alternatives_engine = AlternativesEngine(self.store)

    def run_full_assessment(
        self,
        user: UserProfile,
        lease: Lease,
        today: Optional[date] = None
    ) -> Dict:
        stats = self.store.suburb_stats[lease.suburb]

        pred = self.predictor.predict_next_increase(lease, stats, today)
        aff = self.affordability_engine.affordability(
            weekly_rent=lease.weekly_rent,
            weekly_income=user.weekly_income,
            months_until_increase=pred.months_until_increase,
            projected_rent=pred.projected_rent_weekly
        )
        bench = self.benchmark_engine.benchmark(stats, lease.weekly_rent)
        risk = self.eviction_scorer.score(lease, user, stats, aff)
        alert = self.trend_engine.alert(stats)
        alts = self.alternatives_engine.suggest(
            current_suburb=lease.suburb,
            target_weekly_rent=lease.weekly_rent,
            user=user
        )
        dashboard = self._build_dashboard_series(
            lease.weekly_rent,
            pred.projected_rent_weekly,
            pred.next_increase_date,
            user.weekly_income,
            today
        )

        return {
            "prediction": asdict(pred),
            "affordability": asdict(aff),
            "benchmark": asdict(bench),
            "eviction_risk": {
                "risk_score": risk.risk_score,
                "band": risk.band,
                "drivers": risk.drivers
            },
            "trend_alert": asdict(alert),
            "alternatives": {
                "cheaper_suburbs": alts.cheaper_suburbs,
                "temporary_options": [asdict(t) for t in alts.temporary_options],
                "storage_options": [asdict(s) for s in alts.storage_options],
                "properties": [asdict(p) for p in alts.filtered_properties]
            },
            "dashboard": asdict(dashboard)
        }

    def _build_dashboard_series(
        self,
        current_rent: float,
        projected_rent: float,
        step_date: date,
        weekly_income: float,
        today: Optional[date] = None,
        months_horizon: int = 18
    ) -> StabilityDashboardDTO:
        if today is None:
            today = date.today()

        timeline = []
        rents = []
        ratios = []
        for m in range(months_horizon + 1):
            d = PredictionEngine._add_months(today, m)
            timeline.append(d)
            if d < step_date:
                rents.append(current_rent)
            else:
                rents.append(projected_rent)
            ratios.append(round(rents[-1] / weekly_income if weekly_income > 0 else 1.0, 3))

        return StabilityDashboardDTO(
            timeline_months=timeline,
            timeline_projected_rents=rents,
            affordability_ratio_series=ratios,
            stress_thresholds={"stress": 0.30, "severe": 0.40}
        )


# ---------------------------------------------------------------------------
# Example usage for local testing
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    svc = RentScopeService()

    # Example 1: Nedlands, 5% annual increase pattern
    user1 = UserProfile(
        user_id="u1",
        name="Alex",
        weekly_income=1500.0,
        household_size=2,
        has_children=False,
        disability_access_needed=False,
        preferred_suburbs=["Nedlands", "Crawley"],
        is_international_student=False
    )
    lease1 = Lease(
        lease_id="l1",
        user_id="u1",
        property_id="p4",
        suburb="Nedlands",
        weekly_rent=500.0,
        lease_start=date(2024, 10, 1),
        lease_end=date(2025, 10, 1),
        landlord_type="agency",
        increase_history=[]
    )

    report1 = svc.run_full_assessment(user1, lease1, today=date(2025, 8, 29))
    print("\n=== Nedlands example ===")
    for k, v in report1.items():
        print(k, "=>", v)

    # Example 2: Canning Vale, 1% every 6 months pattern
    user2 = UserProfile(
        user_id="u2",
        name="Sam",
        weekly_income=1100.0,
        household_size=3,
        has_children=True,
        disability_access_needed=False,
        preferred_suburbs=["Canning Vale", "Cannington"]
    )
    lease2 = Lease(
        lease_id="l2",
        user_id="u2",
        property_id="p3",
        suburb="Canning Vale",
        weekly_rent=540.0,
        lease_start=date(2025, 2, 15),
        lease_end=date(2026, 2, 15),
        landlord_type="private"
    )

    report2 = svc.run_full_assessment(user2, lease2, today=date(2025, 8, 29))
    print("\n=== Canning Vale example ===")
    for k, v in report2.items():
        print(k, "=>", v)
