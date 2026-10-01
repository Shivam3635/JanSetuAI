"""
JanSetu AI - Helper Utilities
Reusable helper functions for formatting, JSON responses, and date handling.
"""

from datetime import datetime, timezone
from flask import jsonify

def api_response(success=True, data=None, message=None, error=None, status_code=200):
    """
    Standardized API response structure.
    """
    payload = {
        "success": success
    }
    if data is not None:
        payload["data"] = data
    if message is not None:
        payload["message"] = message
    if error is not None:
        payload["error"] = error

    return jsonify(payload), status_code

def format_timestamp(dt=None):
    """
    Returns ISO 8601 formatted timestamp string.
    """
    if dt is None:
        dt = datetime.now(timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")
