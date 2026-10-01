"""
JanSetu AI — Citizen Infrastructure Intelligence Platform
Flask Web Application & API Gateway

Architecture:
- Frontend: HTML5, CSS3, Vanilla JavaScript (Jinja2 templates)
- Backend: Python Flask
- AI: Google Gemini API (Phase 3)
- Database: Firebase Firestore (Phase 4)
- Geospatial: Google Maps Platform (Phase 6)
"""

import os
import json
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from utils.helpers import api_response, format_timestamp
from services.gemini_service import GeminiService
from services.firebase_service import FirebaseService
from services.maps_service import MapsService
from services.analytics_service import AnalyticsService

# Load environment configuration
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'jansetu-ai-default-dev-key')
app.config['DEMO_MODE'] = os.getenv('DEMO_MODE', 'True').lower() in ('true', '1', 't')

# Initialize Platform Services
gemini_service = GeminiService()
firebase_service = FirebaseService()
maps_service = MapsService()
analytics_service = AnalyticsService()

# -----------------------------------------------------------------------------
# Web Page Routes (HTML Views)
# -----------------------------------------------------------------------------

@app.route('/')
def index():
    """Landing Page — Platform Overview & Core Features."""
    return render_template('index.html')

@app.route('/citizen')
def citizen_portal():
    """Citizen Reporting Portal — Submit infrastructure issues via voice/text."""
    return render_template('citizen.html')

@app.route('/dashboard')
def dashboard_page():
    """Government / Administrator Dashboard — KPIs, Hotspots, Analytics."""
    return render_template('dashboard.html')

@app.route('/reports')
def reports_page():
    """Reports Directory — Search and filter citizen grievances."""
    return render_template('reports.html')

@app.route('/reports/<report_id>')
def report_detail_page(report_id):
    """Detailed view for a specific citizen grievance and AI analysis."""
    report = firebase_service.get_report_by_id(report_id)
    return render_template('report-detail.html', report_id=report_id, report=report)

# -----------------------------------------------------------------------------
# REST API Endpoints (Phase 4 Implementation)
# -----------------------------------------------------------------------------

@app.route('/api/health', methods=['GET'])
def health_check():
    """System health check and configuration status."""
    has_gemini_key = bool(gemini_service.api_key and not gemini_service.api_key.startswith('your_'))
    return api_response(
        success=True,
        data={
            "status": "healthy",
            "platform": "JanSetu AI",
            "version": "1.3.0-phase4",
            "demo_mode": app.config['DEMO_MODE'],
            "phase": "Phase 4 - Database & Firestore Persistence",
            "gemini_active": has_gemini_key,
            "firestore_connected": firebase_service.is_firestore_active()
        },
        message="JanSetu AI Backend operational."
    )

@app.route('/api/analyze', methods=['POST'])
def analyze_complaint_api():
    """
    Direct endpoint for Gemini AI multilingual analysis (Phase 3).
    Extracts category, urgency, severity, English summary, societal impact, and keywords.
    """
    try:
        data = request.get_json() or {}
        text = (data.get('text') or data.get('description') or '').strip()
        if not text:
            return api_response(success=False, error="Text content is required for AI analysis.", status_code=400)
        
        user_language = data.get('language')
        analysis = gemini_service.analyze_complaint(text, user_language)
        return api_response(success=True, data=analysis, message="AI analysis completed successfully.")
    except Exception as e:
        return api_response(success=False, error=str(e), status_code=500)

@app.route('/api/map/config', methods=['GET'])
def get_map_config_api():
    """Returns Leaflet and OpenStreetMap rendering configuration."""
    return api_response(success=True, data=maps_service.get_map_config())

@app.route('/api/map/markers', methods=['GET'])
def get_map_markers_api():
    """Returns GeoJSON FeatureCollection of all reports for geospatial mapping."""
    filters = request.args.to_dict()
    reports = firebase_service.get_reports(filters=filters)
    geojson = maps_service.format_reports_as_geojson(reports)
    return api_response(success=True, data=geojson)

@app.route('/api/reports', methods=['GET'])
def get_reports_api():
    """Retrieve list of reports with optional filtering (Phase 4)."""
    filters = request.args.to_dict()
    reports = firebase_service.get_reports(filters=filters)
    return api_response(success=True, data=reports)

@app.route('/api/reports/<report_id>', methods=['GET'])
def get_single_report_api(report_id):
    """Retrieve details for a specific report (Phase 4)."""
    report = firebase_service.get_report_by_id(report_id)
    if report:
        return api_response(success=True, data=report)
    return api_response(success=False, error="Report not found", status_code=404)

@app.route('/api/reports/<report_id>', methods=['PATCH', 'PUT'])
def update_report_status_api(report_id):
    """
    Update workflow status for an infrastructure grievance (Phase 4).
    Supported statuses: 'Submitted', 'Under Review', 'Verified', 'In Progress', 'Resolved'.
    """
    try:
        data = request.get_json() or {}
        new_status = data.get('status')
        if not new_status:
            return api_response(success=False, error="New status is required.", status_code=400)

        updated = firebase_service.update_report_status(report_id, new_status)
        if not updated:
            return api_response(success=False, error=f"Report #{report_id} not found.", status_code=404)

        return api_response(
            success=True,
            data=updated,
            message=f"Report #{report_id} workflow status updated to '{new_status}'."
        )
    except ValueError as val_err:
        return api_response(success=False, error=str(val_err), status_code=400)
    except Exception as e:
        return api_response(success=False, error=str(e), status_code=500)

@app.route('/api/reports', methods=['POST'])
def create_report_api():
    """
    Submit a new citizen infrastructure grievance (Phases 2-4).
    Leverages Google Gemini AI to analyze text, and persists structured record to Firestore / Local DB.
    """
    try:
        data = request.get_json() or {}
        description = (data.get('description') or '').strip()
        if not description:
            return api_response(success=False, error="Problem description is required.", status_code=400)
        
        if len(description) < 10:
            return api_response(success=False, error="Problem description must be at least 10 characters.", status_code=400)

        language = data.get('language', 'Hindi')
        category = data.get('category', 'auto')
        district = (data.get('district') or 'Prayagraj').strip()
        state = data.get('state', 'Uttar Pradesh')

        try:
            latitude = float(data.get('latitude')) if data.get('latitude') is not None else None
        except (ValueError, TypeError):
            latitude = None

        try:
            longitude = float(data.get('longitude')) if data.get('longitude') is not None else None
        except (ValueError, TypeError):
            longitude = None

        # Execute Gemini AI NLU extraction
        ai_analysis = gemini_service.analyze_complaint(description, language)

        # Use AI-detected category if citizen selected 'auto'
        detected_category = ai_analysis.get('category')
        if not detected_category or detected_category in ('auto', 'Other'):
            fallback_detected = gemini_service._fallback_analysis(description, language).get('category')
            if fallback_detected and fallback_detected != 'Other':
                detected_category = fallback_detected
            elif not detected_category:
                detected_category = 'Other'

        final_category = category if category not in ('auto', '', None) else detected_category

        all_reports = firebase_service.get_reports()
        report_id = f"JS-{1000 + len(all_reports) + 1}"

        new_report = {
            "report_id": report_id,
            "description": description,
            "language": ai_analysis.get("language") or language,
            "category": final_category,
            "problem_summary": ai_analysis.get("problem_summary") or description[:120],
            "severity": ai_analysis.get("severity", "Medium"),
            "urgency": ai_analysis.get("urgency", "Medium"),
            "impact": ai_analysis.get("impact", "Community infrastructure accessibility affected."),
            "latitude": latitude if latitude is not None else 25.4358,
            "longitude": longitude if longitude is not None else 81.8463,
            "district": district,
            "state": state,
            "created_at": format_timestamp(),
            "status": "Submitted",
            "ai_processed": True,
            "ai_source": ai_analysis.get("source", "gemini_ai"),
            "keywords": ai_analysis.get("keywords", ["infrastructure", "citizen"])
        }

        saved_report = firebase_service.add_report(new_report)

        return api_response(
            success=True,
            data=saved_report,
            message=f"Grievance recorded and persisted with reference #{report_id}.",
            status_code=201
        )
    except Exception as e:
        return api_response(success=False, error=str(e), status_code=500)

@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    """KPI summary indicators for the dashboard."""
    reports = firebase_service.get_reports()
    total = len(reports)
    high_prio = sum(1 for r in reports if r.get('severity') in ('High', 'Critical'))
    resolved = sum(1 for r in reports if r.get('status') == 'Resolved')
    resolution_rate = f"{(resolved / total * 100):.1f}%" if total > 0 else "0.0%"

    hotspots = analytics_service.calculate_hotspots(reports)

    stats = {
        "total_reports": total,
        "high_priority": high_prio,
        "hotspots_count": len(hotspots),
        "resolved_reports": resolved,
        "resolution_rate": resolution_rate
    }
    return api_response(success=True, data=stats)

@app.route('/api/dashboard/hotspots', methods=['GET'])
def get_dashboard_hotspots_api():
    """Returns detected infrastructure hotspots calculated using 4-factor Need Indicator."""
    reports = firebase_service.get_reports()
    hotspots = analytics_service.calculate_hotspots(reports)
    return api_response(success=True, data=hotspots)

@app.route('/api/dashboard/districts', methods=['GET'])
def get_dashboard_districts_api():
    """Returns district level benchmark indicators and demand rates per 10,000 citizens."""
    reports = firebase_service.get_reports()
    metrics = analytics_service.calculate_district_metrics(reports)
    return api_response(success=True, data=metrics)

@app.route('/api/dashboard/insights', methods=['GET'])
def get_dashboard_insights_api():
    """Returns automated evidence-based policy synthesis for decision-makers."""
    reports = firebase_service.get_reports()
    hotspots = analytics_service.calculate_hotspots(reports)
    insight = analytics_service.generate_ai_policy_insight(reports, hotspots)
    return api_response(success=True, data=insight)

# -----------------------------------------------------------------------------
# Error Handlers
# -----------------------------------------------------------------------------

@app.errorhandler(404)
def not_found_error(error):
    if request.path.startswith('/api/'):
        return api_response(success=False, error="Resource not found", status_code=404)
    return render_template('index.html'), 404

@app.errorhandler(500)
def internal_error(error):
    if request.path.startswith('/api/'):
        return api_response(success=False, error="Internal server error", status_code=500)
    return "Internal Server Error", 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() in ('true', '1', 't')
    print(f">> Starting JanSetu AI Server on http://127.0.0.1:{port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
