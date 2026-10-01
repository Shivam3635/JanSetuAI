"""
Comprehensive Test and Review Suite for JanSetu AI
Tests routing, data services, analytics, maps, AI integration, and APIs.
"""

import unittest
import json
import app
from services.analytics_service import AnalyticsService
from services.gemini_service import GeminiService
from services.maps_service import MapsService
from services.firebase_service import FirebaseService

class JanSetuAITestCase(unittest.TestCase):
    def setUp(self):
        app.app.config['TESTING'] = True
        self.client = app.app.test_client()

    def test_01_web_pages_render(self):
        """Verify all HTML template routes render with 200 OK."""
        pages = ['/', '/citizen', '/dashboard', '/reports']
        for url in pages:
            res = self.client.get(url)
            self.assertEqual(res.status_code, 200, f"Page {url} failed to render")
            self.assertIn(b"JanSetu", res.data)

    def test_02_health_endpoint(self):
        """Verify health check returns valid JSON status."""
        res = self.client.get('/api/health')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data.decode('utf-8'))
        self.assertTrue(data.get('success'))
        self.assertEqual(data['data']['status'], 'healthy')
        self.assertIn('firestore_connected', data['data'])

    def test_03_map_endpoints(self):
        """Verify map config and GeoJSON marker serialization."""
        res_cfg = self.client.get('/api/map/config')
        self.assertEqual(res_cfg.status_code, 200)
        cfg_data = json.loads(res_cfg.data.decode('utf-8'))
        self.assertTrue(cfg_data['success'])
        self.assertEqual(cfg_data['data']['provider'], 'openstreetmap')

        res_markers = self.client.get('/api/map/markers')
        self.assertEqual(res_markers.status_code, 200)
        marker_data = json.loads(res_markers.data.decode('utf-8'))
        self.assertTrue(marker_data['success'])
        self.assertEqual(marker_data['data']['type'], 'FeatureCollection')
        self.assertIsInstance(marker_data['data']['features'], list)

    def test_04_reports_crud_and_detail(self):
        """Verify reports listing, detail page, and workflow updates."""
        res = self.client.get('/api/reports')
        self.assertEqual(res.status_code, 200)
        reports_payload = json.loads(res.data.decode('utf-8'))
        self.assertTrue(reports_payload['success'])
        reports = reports_payload['data']
        self.assertGreater(len(reports), 0)

        first_report = reports[0]
        report_id = first_report['report_id']

        # Detail HTML view
        detail_view = self.client.get(f'/reports/{report_id}')
        self.assertEqual(detail_view.status_code, 200)
        self.assertIn(report_id.encode('utf-8'), detail_view.data)

        # Detail API endpoint
        detail_api = self.client.get(f'/api/reports/{report_id}')
        self.assertEqual(detail_api.status_code, 200)
        api_data = json.loads(detail_api.data.decode('utf-8'))
        self.assertTrue(api_data['success'])
        self.assertEqual(api_data['data']['report_id'], report_id)

    def test_05_dashboard_analytics(self):
        """Verify stats, hotspots, district benchmarks, and insights."""
        # Stats
        stats_res = self.client.get('/api/dashboard/stats')
        self.assertEqual(stats_res.status_code, 200)
        stats_data = json.loads(stats_res.data.decode('utf-8'))
        self.assertTrue(stats_data['success'])
        self.assertIn('total_reports', stats_data['data'])
        self.assertIn('resolution_rate', stats_data['data'])

        # Hotspots
        hotspots_res = self.client.get('/api/dashboard/hotspots')
        self.assertEqual(hotspots_res.status_code, 200)
        hotspots_data = json.loads(hotspots_res.data.decode('utf-8'))
        self.assertTrue(hotspots_data['success'])
        self.assertIsInstance(hotspots_data['data'], list)

        # Districts
        districts_res = self.client.get('/api/dashboard/districts')
        self.assertEqual(districts_res.status_code, 200)
        districts_data = json.loads(districts_res.data.decode('utf-8'))
        self.assertTrue(districts_data['success'])

        # Insights
        insights_res = self.client.get('/api/dashboard/insights')
        self.assertEqual(insights_res.status_code, 200)
        insights_data = json.loads(insights_res.data.decode('utf-8'))
        self.assertTrue(insights_data['success'])
        self.assertIn('insight_text', insights_data['data'])

    def test_06_ai_analysis_endpoint(self):
        """Verify NLU analysis endpoint handles Hindi and English inputs."""
        # Hindi input
        hindi_payload = {"text": "हमारे मोहल्ले की सड़क पर गहरे गड्ढे हैं और गाड़ियां दुर्घटनाग्रस्त हो रही हैं।", "language": "Hindi"}
        res = self.client.post('/api/analyze', data=json.dumps(hindi_payload), content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data.decode('utf-8'))
        self.assertTrue(data['success'])
        analysis = data['data']
        self.assertIn('category', analysis)
        self.assertIn(analysis['category'], ['Roads', 'Other'])
        self.assertIn('severity', analysis)

        # English input
        en_payload = {"text": "Drinking water supply is contaminated and dirty water is leaking from pipe for 3 days.", "language": "English"}
        res_en = self.client.post('/api/analyze', data=json.dumps(en_payload), content_type='application/json')
        self.assertEqual(res_en.status_code, 200)
        data_en = json.loads(res_en.data.decode('utf-8'))
        self.assertTrue(data_en['success'])
        self.assertEqual(data_en['data']['category'], 'Drinking Water')

    def test_07_input_validation(self):
        """Verify error responses for invalid payloads."""
        # Missing text
        res = self.client.post('/api/analyze', data=json.dumps({}), content_type='application/json')
        self.assertEqual(res.status_code, 400)

        # Short description on report submission
        res_short = self.client.post('/api/reports', data=json.dumps({"description": "too short"}), content_type='application/json')
        self.assertEqual(res_short.status_code, 400)

        # Not found
        res_404 = self.client.get('/api/reports/JS-9999999')
        self.assertEqual(res_404.status_code, 404)

if __name__ == '__main__':
    unittest.main()
