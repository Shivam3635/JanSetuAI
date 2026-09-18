"""
JanSetu AI - OpenStreetMap (OSM) & Geospatial Intelligence Service
Handles map tile configurations, OpenStreetMap Nominatim geocoding/reverse-geocoding,
district centroid resolution, and GeoJSON marker formatting for citizen infrastructure reports.
"""

import os
import requests

# Default centroid coordinates for Uttar Pradesh districts
DISTRICT_COORDINATES = {
    "Prayagraj": [25.4358, 81.8463],
    "Lucknow": [26.8467, 80.9462],
    "Kanpur Nagar": [26.4499, 80.3319],
    "Varanasi": [25.3176, 82.9739],
    "Gorakhpur": [26.7606, 83.3732],
    "Agra": [27.1767, 78.0081],
    "Bareilly": [28.3670, 79.4304],
    "Meerut": [28.9845, 77.7064],
    "Ghaziabad": [28.6692, 77.4538],
    "Aligarh": [27.8974, 78.0880],
    "Moradabad": [28.8386, 78.7733],
    "Jhansi": [25.4530, 78.5685],
    "Ayodhya": [26.7922, 82.1998],
    "Mathura": [27.4924, 77.6737],
    "Mirzapur": [25.1465, 82.5698]
}

CATEGORY_METADATA = {
    "Roads": {"emoji": "🛣️", "color": "#2563eb", "label": "Roads"},
    "Drinking Water": {"emoji": "💧", "color": "#0284c7", "label": "Drinking Water"},
    "Healthcare": {"emoji": "🏥", "color": "#dc2626", "label": "Healthcare"},
    "Education": {"emoji": "🏫", "color": "#7c3aed", "label": "Education"},
    "Electricity": {"emoji": "💡", "color": "#f59e0b", "label": "Electricity"},
    "Sanitation": {"emoji": "🧹", "color": "#059669", "label": "Sanitation"},
    "Drainage": {"emoji": "🌊", "color": "#0d9488", "label": "Drainage"},
    "Digital Connectivity": {"emoji": "📶", "color": "#4f46e5", "label": "Digital Connectivity"},
    "Public Transport": {"emoji": "🚌", "color": "#ea580c", "label": "Public Transport"},
    "Other": {"emoji": "📌", "color": "#64748b", "label": "Other"}
}

SEVERITY_COLORS = {
    "Critical": "#dc2626",
    "High": "#ea580c",
    "Medium": "#f59e0b",
    "Low": "#10b981"
}

class MapsService:
    def __init__(self, api_key=None, tile_url=None):
        self.api_key = api_key or os.getenv('OSM_API_KEY', '').strip()
        self.tile_url = tile_url or os.getenv('OSM_TILE_URL', 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
        self.attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        self.default_center = [26.8467, 80.9462] # Center of Uttar Pradesh (Lucknow)
        self.default_zoom = 7

    def get_map_config(self):
        """Returns map rendering parameters for Leaflet / OpenStreetMap client."""
        return {
            "provider": "openstreetmap",
            "tile_url": self.tile_url,
            "attribution": self.attribution,
            "center": self.default_center,
            "zoom": self.default_zoom,
            "categories": CATEGORY_METADATA,
            "severities": SEVERITY_COLORS
        }

    def geocode_location(self, address_or_district):
        """
        Geocodes an address or district using OpenStreetMap Nominatim with fallback to static table.
        """
        if not address_or_district:
            return None

        # 1. Check local lookup table
        dist_clean = address_or_district.strip().title()
        if dist_clean in DISTRICT_COORDINATES:
            coords = DISTRICT_COORDINATES[dist_clean]
            return {"latitude": coords[0], "longitude": coords[1], "source": "district_cache"}

        # 2. Query OpenStreetMap Nominatim
        try:
            url = f"https://nominatim.openstreetmap.org/search?q={address_or_district}+Uttar+Pradesh+India&format=json&limit=1"
            headers = {"User-Agent": "JanSetuAI-CitizenPlatform/1.0"}
            res = requests.get(url, headers=headers, timeout=5)
            if res.ok:
                data = res.json()
                if data:
                    return {
                        "latitude": float(data[0]["lat"]),
                        "longitude": float(data[0]["lon"]),
                        "source": "osm_nominatim"
                    }
        except Exception as e:
            print(f"[MapsService] Nominatim lookup error: {e}")

        # Fallback to default Lucknow centroid
        return {"latitude": self.default_center[0], "longitude": self.default_center[1], "source": "state_fallback"}

    def format_reports_as_geojson(self, reports):
        """
        Transforms reports into GeoJSON FeatureCollection for Leaflet rendering.
        """
        features = []
        for r in reports:
            lat = r.get("latitude")
            lon = r.get("longitude")

            # Fallback to district coordinate if not directly set
            if lat is None or lon is None:
                district = r.get("district", "Prayagraj")
                coords = DISTRICT_COORDINATES.get(district, self.default_center)
                lat, lon = coords[0], coords[1]

            cat = r.get("category", "Other")
            cat_meta = CATEGORY_METADATA.get(cat, CATEGORY_METADATA["Other"])
            sev = r.get("severity", "Medium")

            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [float(lon), float(lat)]
                },
                "properties": {
                    "report_id": r.get("report_id"),
                    "category": cat,
                    "category_emoji": cat_meta["emoji"],
                    "category_color": cat_meta["color"],
                    "severity": sev,
                    "severity_color": SEVERITY_COLORS.get(sev, "#f59e0b"),
                    "status": r.get("status", "Submitted"),
                    "district": r.get("district", "Unspecified"),
                    "summary": r.get("problem_summary", r.get("description", "")[:100]),
                    "created_at": r.get("created_at"),
                    "detail_url": f"/reports/{r.get('report_id')}"
                }
            }
            features.append(feature)

        return {
            "type": "FeatureCollection",
            "features": features
        }
