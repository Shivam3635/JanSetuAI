"""
JanSetu AI - Firebase Firestore & Persistence Service
Integrates Google Cloud Firestore using both direct REST API (with API Key & Project ID)
and Firebase Admin SDK (with Service Account credentials).

Design:
- Automatic conversion between Firestore typed JSON and standard Python dicts.
- Live read, write, and workflow status patching to Cloud Firestore.
- Graceful offline fallback to local JSON persistence (data/mock_reports.json).
- Automatic seed synchronization of initial reports to Firestore on startup.
"""

import os
import json
import urllib.request
import urllib.error
from datetime import datetime, timezone

VALID_STATUSES = [
    "Submitted",
    "Under Review",
    "Verified",
    "In Progress",
    "Resolved"
]

def dict_to_firestore_fields(d):
    """Converts a standard Python dictionary to Firestore typed JSON fields format."""
    fields = {}
    for k, v in d.items():
        if v is None:
            fields[k] = {"nullValue": None}
        elif isinstance(v, bool):
            fields[k] = {"booleanValue": v}
        elif isinstance(v, (int, float)):
            fields[k] = {"doubleValue": float(v)}
        elif isinstance(v, list):
            fields[k] = {"arrayValue": {"values": [{"stringValue": str(x)} for x in v]}}
        elif isinstance(v, dict):
            fields[k] = {"mapValue": {"fields": dict_to_firestore_fields(v)}}
        else:
            fields[k] = {"stringValue": str(v)}
    return fields

def firestore_fields_to_dict(fields):
    """Converts Firestore typed JSON fields back to a standard Python dictionary."""
    result = {}
    for k, val_obj in fields.items():
        if not isinstance(val_obj, dict):
            result[k] = val_obj
            continue
        if "stringValue" in val_obj:
            result[k] = val_obj["stringValue"]
        elif "doubleValue" in val_obj:
            result[k] = float(val_obj["doubleValue"])
        elif "integerValue" in val_obj:
            result[k] = int(val_obj["integerValue"])
        elif "booleanValue" in val_obj:
            result[k] = val_obj["booleanValue"]
        elif "nullValue" in val_obj:
            result[k] = None
        elif "arrayValue" in val_obj:
            result[k] = [
                list(item.values())[0] if isinstance(item, dict) else item 
                for item in val_obj["arrayValue"].get("values", [])
            ]
        elif "mapValue" in val_obj:
            result[k] = firestore_fields_to_dict(val_obj["mapValue"].get("fields", {}))
        else:
            result[k] = list(val_obj.values())[0] if val_obj else None
    return result

class FirebaseService:
    def __init__(self, project_id=None, api_key=None, credentials_path=None):
        self.project_id = project_id or os.getenv('FIREBASE_PROJECT_ID', 'jansetu-8ac9f').strip()
        self.api_key = api_key or os.getenv('FIREBASE_API_KEY', '').strip()
        self.credentials_path = credentials_path or os.getenv('FIREBASE_CREDENTIALS_PATH', '').strip()
        self.data_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'mock_reports.json')

        self.db = None
        self._firestore_available = False
        self._firestore_mode = None  # 'admin_sdk', 'rest_api', or 'local'

        self._init_firestore()

    def _init_firestore(self):
        """Initializes Firestore via Admin SDK or direct REST API."""
        # 1. Try Firebase Admin SDK if credentials file exists
        if self.credentials_path and os.path.exists(self.credentials_path):
            try:
                import firebase_admin
                from firebase_admin import credentials, firestore

                if not firebase_admin._apps:
                    cred = credentials.Certificate(self.credentials_path)
                    firebase_admin.initialize_app(cred, {'projectId': self.project_id} if self.project_id else {})

                self.db = firestore.client()
                self._firestore_available = True
                self._firestore_mode = 'admin_sdk'
                print(f"[FirebaseService] Connected to Firestore via Firebase Admin SDK (Project: {self.project_id}).")
                return
            except Exception as e:
                print(f"[FirebaseService] Admin SDK init error: {e}. Trying REST API...")

        # 2. Try Firestore REST API with Project ID and API Key
        if self.project_id and self.api_key:
            try:
                test_url = f"https://firestore.googleapis.com/v1/projects/{self.project_id}/databases/(default)/documents/reports?key={self.api_key}&pageSize=1"
                req = urllib.request.Request(test_url)
                with urllib.request.urlopen(req, timeout=5) as resp:
                    if resp.status == 200:
                        self._firestore_available = True
                        self._firestore_mode = 'rest_api'
                        print(f"[FirebaseService] Connected to Cloud Firestore via REST API (Project: {self.project_id}).")
                        self._sync_seed_reports_to_firestore()
                        return
            except Exception as e:
                print(f"[FirebaseService Warning] Cloud Firestore REST check: {e}")

        # 3. Fallback to Local JSON persistence
        self._firestore_available = False
        self._firestore_mode = 'local'
        print("[FirebaseService] Operating with Local JSON persistence.")

    def is_firestore_active(self):
        """Returns True if live Firestore connection is active, False otherwise."""
        return self._firestore_available

    def get_mode(self):
        """Returns the active backend storage mode."""
        return self._firestore_mode

    def get_reports(self, filters=None):
        """Retrieves all reports with optional multi-facet filtering."""
        filters = filters or {}
        reports = []

        if self._firestore_mode == 'admin_sdk':
            try:
                docs = self.db.collection('reports').order_by('created_at', direction='DESCENDING').stream()
                for doc in docs:
                    data = doc.to_dict()
                    data['id'] = doc.id
                    reports.append(data)
            except Exception as e:
                print(f"[FirebaseService] Firestore Admin get_reports error: {e}. Using local cache.")
                reports = self._load_local_reports()

        elif self._firestore_mode == 'rest_api':
            try:
                url = f"https://firestore.googleapis.com/v1/projects/{self.project_id}/databases/(default)/documents/reports?key={self.api_key}&pageSize=100"
                req = urllib.request.Request(url)
                with urllib.request.urlopen(req, timeout=5) as resp:
                    payload = json.loads(resp.read().decode('utf-8'))
                    documents = payload.get('documents', [])
                    for doc in documents:
                        fields = doc.get('fields', {})
                        doc_dict = firestore_fields_to_dict(fields)
                        doc_name = doc.get('name', '')
                        doc_id = doc_name.split('/')[-1] if doc_name else doc_dict.get('report_id')
                        doc_dict['id'] = doc_id
                        if 'report_id' not in doc_dict:
                            doc_dict['report_id'] = doc_id
                        reports.append(doc_dict)

                # If Firestore returned fewer than local seed, merge local reports
                local_reports = self._load_local_reports()
                if len(reports) < len(local_reports):
                    fs_ids = {r.get('report_id') for r in reports}
                    for lr in local_reports:
                        if lr.get('report_id') not in fs_ids:
                            reports.append(lr)

                # Sort by created_at descending
                reports.sort(key=lambda r: r.get('created_at', ''), reverse=True)
            except Exception as e:
                print(f"[FirebaseService] Firestore REST get_reports error: {e}. Using local cache.")
                reports = self._load_local_reports()
        else:
            reports = self._load_local_reports()

        return self._apply_filters(reports, filters)

    def get_report_by_id(self, report_id):
        """Retrieves a single report by report_id."""
        if self._firestore_mode == 'admin_sdk':
            try:
                doc = self.db.collection('reports').document(report_id).get()
                if doc.exists:
                    return doc.to_dict()
            except Exception as e:
                print(f"[FirebaseService] Admin get_report error: {e}")

        elif self._firestore_mode == 'rest_api':
            try:
                url = f"https://firestore.googleapis.com/v1/projects/{self.project_id}/databases/(default)/documents/reports/{report_id}?key={self.api_key}"
                req = urllib.request.Request(url)
                with urllib.request.urlopen(req, timeout=5) as resp:
                    doc = json.loads(resp.read().decode('utf-8'))
                    fields = doc.get('fields', {})
                    return firestore_fields_to_dict(fields)
            except urllib.error.HTTPError as he:
                he.close()
            except Exception:
                # Document might not be in Firestore yet; fall back to local
                pass

        # Local cache lookup
        reports = self._load_local_reports()
        for r in reports:
            if r.get('report_id') == report_id:
                return r
        return None

    def add_report(self, report_data):
        """Saves a new report into Firestore and local backup."""
        report_id = report_data.get('report_id')
        if not report_id:
            local_reports = self._load_local_reports()
            report_id = f"JS-{1000 + len(local_reports) + 1}"
            report_data['report_id'] = report_id

        # 1. Save to Cloud Firestore
        if self._firestore_mode == 'admin_sdk':
            try:
                self.db.collection('reports').document(report_id).set(report_data)
                print(f"[FirebaseService] Document {report_id} committed via Admin SDK.")
            except Exception as e:
                print(f"[FirebaseService Error] Admin write error: {e}")

        elif self._firestore_mode == 'rest_api':
            try:
                url = f"https://firestore.googleapis.com/v1/projects/{self.project_id}/databases/(default)/documents/reports/{report_id}?key={self.api_key}"
                body = json.dumps({"fields": dict_to_firestore_fields(report_data)}).encode('utf-8')
                req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/json'}, method='PATCH')
                with urllib.request.urlopen(req, timeout=5) as resp:
                    if resp.status == 200:
                        print(f"[FirebaseService] Document {report_id} committed to Cloud Firestore.")
            except Exception as e:
                print(f"[FirebaseService Error] Firestore REST write error: {e}")

        # 2. Update local JSON cache for zero-latency fallback
        local_reports = self._load_local_reports()
        local_reports = [r for r in local_reports if r.get('report_id') != report_id]
        local_reports.insert(0, report_data)
        self._save_local_reports(local_reports)

        return report_data

    def update_report_status(self, report_id, new_status):
        """Updates workflow status for a specific report in Firestore and local storage."""
        if new_status not in VALID_STATUSES:
            raise ValueError(f"Invalid status '{new_status}'. Allowed: {VALID_STATUSES}")

        updated_time = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        updated_report = None

        # 1. Update in Cloud Firestore
        if self._firestore_mode == 'admin_sdk':
            try:
                self.db.collection('reports').document(report_id).update({
                    'status': new_status,
                    'updated_at': updated_time
                })
            except Exception as e:
                print(f"[FirebaseService Error] Admin update status error: {e}")

        elif self._firestore_mode == 'rest_api':
            try:
                url = f"https://firestore.googleapis.com/v1/projects/{self.project_id}/databases/(default)/documents/reports/{report_id}?updateMask.fieldPaths=status&updateMask.fieldPaths=updated_at&key={self.api_key}"
                body = json.dumps({
                    "fields": {
                        "status": {"stringValue": new_status},
                        "updated_at": {"stringValue": updated_time}
                    }
                }).encode('utf-8')
                req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/json'}, method='PATCH')
                with urllib.request.urlopen(req, timeout=5):
                    print(f"[FirebaseService] Document {report_id} status updated to {new_status} in Firestore.")
            except Exception as e:
                print(f"[FirebaseService Error] Firestore REST status update error: {e}")

        # 2. Update in local cache
        local_reports = self._load_local_reports()
        for r in local_reports:
            if r.get('report_id') == report_id:
                r['status'] = new_status
                r['updated_at'] = updated_time
                updated_report = r
                break

        if updated_report:
            self._save_local_reports(local_reports)

        return updated_report

    def _sync_seed_reports_to_firestore(self):
        """Synchronizes mock reports to Firestore on initial startup if empty."""
        try:
            url = f"https://firestore.googleapis.com/v1/projects/{self.project_id}/databases/(default)/documents/reports?key={self.api_key}&pageSize=5"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                docs = data.get('documents', [])
                if len(docs) < 3:
                    print("[FirebaseService] Seeding initial reports into Cloud Firestore...")
                    local_reports = self._load_local_reports()
                    for r in local_reports[:10]:
                        rep_id = r.get('report_id')
                        if rep_id:
                            doc_url = f"https://firestore.googleapis.com/v1/projects/{self.project_id}/databases/(default)/documents/reports/{rep_id}?key={self.api_key}"
                            doc_body = json.dumps({"fields": dict_to_firestore_fields(r)}).encode('utf-8')
                            doc_req = urllib.request.Request(doc_url, data=doc_body, headers={'Content-Type': 'application/json'}, method='PATCH')
                            try:
                                with urllib.request.urlopen(doc_req, timeout=4):
                                    pass
                            except Exception:
                                pass
                    print("[FirebaseService] Seed reports synchronized to Cloud Firestore successfully.")
        except Exception as e:
            print(f"[FirebaseService] Seed sync check: {e}")

    # -------------------------------------------------------------------------
    # Local Persistence Helpers
    # -------------------------------------------------------------------------

    def _load_local_reports(self):
        """Reads mock reports JSON file safely."""
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"[FirebaseService Error] Could not read {self.data_file}: {e}")
                return []
        return []

    def _save_local_reports(self, reports):
        """Writes mock reports JSON file safely."""
        try:
            os.makedirs(os.path.dirname(self.data_file), exist_ok=True)
            with open(self.data_file, 'w', encoding='utf-8') as f:
                json.dump(reports, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[FirebaseService Error] Could not write to {self.data_file}: {e}")

    def _apply_filters(self, reports, filters):
        """Filters report list by category, severity, status, district, language, and search keyword."""
        results = reports

        category = filters.get('category')
        if category:
            results = [r for r in results if r.get('category', '').lower() == category.lower()]

        severity = filters.get('severity')
        if severity:
            results = [r for r in results if r.get('severity', '').lower() == severity.lower()]

        status = filters.get('status')
        if status:
            results = [r for r in results if r.get('status', '').lower() == status.lower()]

        district = filters.get('district')
        if district:
            results = [r for r in results if r.get('district', '').lower() == district.lower()]

        language = filters.get('language')
        if language:
            results = [r for r in results if r.get('language', '').lower() == language.lower()]

        search = filters.get('search') or filters.get('q')
        if search:
            search_lower = search.lower().strip()
            results = [
                r for r in results
                if search_lower in (r.get('description') or '').lower()
                or search_lower in (r.get('problem_summary') or '').lower()
                or search_lower in (r.get('district') or '').lower()
                or search_lower in (r.get('category') or '').lower()
                or any(search_lower in str(kw).lower() for kw in r.get('keywords', []))
            ]

        return results
