"""
JanSetu AI - Analytics & Demand Hotspot Detection Engine (Phases 7 & 8)
Processes citizen reports alongside demographic and infrastructure benchmarks:
- Population benchmarks (data/population.csv)
- Baseline infrastructure indices (data/infrastructure.csv)
- Computes requests per 10,000 population
- Calculates explainable 4-factor "AI Infrastructure Need Indicator" (0-100)
- Identifies geospatial demand hotspots
- Generates automated policy synthesis insights
"""

import os
import csv

class AnalyticsService:
    def __init__(self, data_dir=None):
        self.data_dir = data_dir or os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
        self.population_data = {}
        self.infrastructure_data = {}
        self._load_datasets()

    def _load_datasets(self):
        """Loads population and infrastructure baseline CSVs."""
        # 1. Population CSV
        pop_file = os.path.join(self.data_dir, 'population.csv')
        if os.path.exists(pop_file):
            try:
                with open(pop_file, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        dist = row.get('district', '').strip()
                        pop_str = row.get('population', '1000000').strip()
                        self.population_data[dist] = int(pop_str)
            except Exception as e:
                print(f"[AnalyticsService] Error reading population.csv: {e}")

        # 2. Infrastructure Baseline CSV
        infra_file = os.path.join(self.data_dir, 'infrastructure.csv')
        if os.path.exists(infra_file):
            try:
                with open(infra_file, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        dist = row.get('district', '').strip()
                        self.infrastructure_data[dist] = {
                            "road_index": float(row.get('road_index', 50.0)),
                            "water_index": float(row.get('water_index', 50.0)),
                            "health_index": float(row.get('health_index', 50.0)),
                            "education_index": float(row.get('education_index', 50.0)),
                            "electricity_index": float(row.get('electricity_index', 50.0))
                        }
            except Exception as e:
                print(f"[AnalyticsService] Error reading infrastructure.csv: {e}")

    def calculate_district_metrics(self, reports):
        """
        Calculates per-district demand rates (requests per 10,000 people)
        and baseline gap scores.
        """
        counts = {}
        severity_sums = {}

        for r in reports:
            dist = r.get('district', 'Prayagraj')
            counts[dist] = counts.get(dist, 0) + 1
            
            sev = r.get('severity', 'Medium')
            sev_val = {'Critical': 100, 'High': 75, 'Medium': 50, 'Low': 25}.get(sev, 50)
            severity_sums[dist] = severity_sums.get(dist, 0) + sev_val

        results = []
        for dist, count in counts.items():
            pop = self.population_data.get(dist, 2000000)
            # Requests per 10,000 citizens formula
            rate_per_10k = round((count / pop) * 10000, 3)
            avg_sev = round(severity_sums[dist] / count, 1)

            infra_indices = self.infrastructure_data.get(dist, {
                "road_index": 50.0, "water_index": 50.0, "health_index": 50.0
            })

            # Calculate composite baseline score
            avg_baseline = sum(infra_indices.values()) / len(infra_indices)
            infra_gap = round(100.0 - avg_baseline, 1)

            results.append({
                "district": dist,
                "total_reports": count,
                "population": pop,
                "demand_rate_per_10k": rate_per_10k,
                "avg_severity": avg_sev,
                "baseline_index": round(avg_baseline, 1),
                "infrastructure_gap": infra_gap
            })

        results.sort(key=lambda x: x["total_reports"], reverse=True)
        return results

    def calculate_hotspots(self, reports):
        """
        Groups complaints geographically and by domain, and computes the 4-factor
        AI Infrastructure Need Indicator:
        Score = 30% Demand Density + 25% Population Impact + 25% Infrastructure Gap + 20% Severity
        """
        clusters = {}

        for r in reports:
            dist = r.get('district', 'Prayagraj')
            cat = r.get('category', 'Other')
            key = f"{dist}::{cat}"

            if key not in clusters:
                clusters[key] = {
                    "district": dist,
                    "category": cat,
                    "reports": [],
                    "latitudes": [],
                    "longitudes": []
                }

            clusters[key]["reports"].append(r)
            if r.get('latitude') and r.get('longitude'):
                clusters[key]["latitudes"].append(float(r['latitude']))
                clusters[key]["longitudes"].append(float(r['longitude']))

        hotspots = []
        for key, cl in clusters.items():
            count = len(cl["reports"])
            dist = cl["district"]
            cat = cl["category"]

            # Centroid computation
            avg_lat = sum(cl["latitudes"]) / len(cl["latitudes"]) if cl["latitudes"] else 25.4358
            avg_lon = sum(cl["longitudes"]) / len(cl["longitudes"]) if cl["longitudes"] else 81.8463

            # 1. Citizen Demand Density (0-100)
            demand_density = min(100.0, count * 25.0)

            # 2. Population Impact Weight (0-100)
            pop = self.population_data.get(dist, 2000000)
            pop_impact = min(100.0, round((pop / 4500000) * 100, 1))

            # 3. Infrastructure Gap (0-100)
            # Find matching category indicator
            infra_profile = self.infrastructure_data.get(dist, {})
            cat_key_map = {
                "Roads": "road_index",
                "Drinking Water": "water_index",
                "Healthcare": "health_index",
                "Education": "education_index",
                "Electricity": "electricity_index"
            }
            metric_key = cat_key_map.get(cat, "road_index")
            baseline_val = infra_profile.get(metric_key, 55.0)
            infra_gap = round(100.0 - baseline_val, 1)

            # 4. Severity Weight (0-100)
            sev_scores = [{'Critical': 100, 'High': 75, 'Medium': 50, 'Low': 25}.get(r.get('severity', 'Medium'), 50) for r in cl["reports"]]
            severity_weight = round(sum(sev_scores) / len(sev_scores), 1)

            # Composite AI Infrastructure Need Indicator
            need_score = round(
                (0.30 * demand_density) +
                (0.25 * pop_impact) +
                (0.25 * infra_gap) +
                (0.20 * severity_weight),
                1
            )

            demand_level = "High" if need_score >= 70 else ("Medium" if need_score >= 50 else "Low")

            hotspots.append({
                "hotspot_id": f"HS-{len(hotspots) + 1}",
                "district": dist,
                "category": cat,
                "report_count": count,
                "latitude": round(avg_lat, 4),
                "longitude": round(avg_lon, 4),
                "need_indicator": need_score,
                "demand_level": demand_level,
                "components": {
                    "demand_density": demand_density,
                    "population_impact": pop_impact,
                    "infrastructure_gap": infra_gap,
                    "severity_weight": severity_weight
                },
                "disclaimer": "Analytical indicator to support further investigation and planning."
            })

        hotspots.sort(key=lambda h: h["need_indicator"], reverse=True)
        return hotspots

    def generate_ai_policy_insight(self, reports, hotspots):
        """
        Generates an evidence-based executive synthesis for policymakers.
        """
        if not hotspots:
            return {
                "summary": "Insufficient data to detect concentrated infrastructure clusters.",
                "lead_district": "None",
                "priority_category": "None"
            }

        top_hs = hotspots[0]
        top_dist = top_hs["district"]
        top_cat = top_hs["category"]
        top_score = top_hs["need_indicator"]
        gap_val = top_hs["components"]["infrastructure_gap"]

        text = (
            f"{top_cat}-related citizen requests are significantly concentrated in {top_dist} "
            f"with an active demand hotspot score of {top_score}/100. "
            f"This aligns with an elevated infrastructure gap indicator ({gap_val}/100) derived from baseline datasets. "
            f"The convergence of dense citizen feedback and lower infrastructure baselines indicates an acute public work "
            f"bottleneck that warrants prioritized administrative verification."
        )

        return {
            "title": "Automated Infrastructure Policy Synthesis",
            "insight_text": text,
            "top_hotspot": top_hs,
            "disclaimer": "Analytical indicator to support further investigation and planning. Not an automatic financial authorization."
        }
