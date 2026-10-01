"""
Test Script for Infrastructure Category Auto-Detect with Gemini AI
"""

import requests
import json

def run_tests():
    print("=== 1. Testing /api/analyze with various complaints ===")
    test_cases = [
        ("Drinking Water Hindi", "हमारे मोहल्ले में पीने का पानी 4 दिन से नहीं आ रहा है और पाइपलाइन टूटी है।", "Drinking Water"),
        ("Roads English", "The main road in our sector is full of deep dangerous potholes and needs urgent repair.", "Roads"),
        ("Electricity Hindi", "गांव में ट्रांसफार्मर जल गया है और 3 दिन से बिजली नहीं आ रही है।", "Electricity"),
        ("Healthcare English", "Primary healthcare center has no doctors or emergency medicines for patients.", "Healthcare"),
        ("Sanitation Hindi", "सड़क पर कचरा और कूड़े का ढेर लगा हुआ है कोई सफाई नहीं कर रहा।", "Sanitation"),
        ("Drainage English", "Main sewer line is overflowing and dirty drainage water is flooding the street.", "Drainage")
    ]

    for label, text, expected in test_cases:
        res = requests.post("http://127.0.0.1:5000/api/analyze", json={"text": text})
        data = res.json()
        assert data.get("success"), f"Failed for {label}: {data}"
        cat = data["data"]["category"]
        sev = data["data"]["severity"]
        src = data["data"]["source"]
        print(f"[{label}] Expected: {expected} -> Detected: {cat} (Severity: {sev}, Source: {src})")
        assert cat == expected, f"Expected {expected}, got {cat}"

    print("\n=== 2. Testing /api/reports submission with category='auto' ===")
    sub_res = requests.post("http://127.0.0.1:5000/api/reports", json={
        "description": "हमारे क्षेत्र में पीने के पानी की मुख्य पाइपलाइन टूट गई है और 4 दिनों से गंदा पानी आ रहा है।",
        "language": "Hindi",
        "category": "auto",
        "district": "Varanasi",
        "latitude": 25.3176,
        "longitude": 82.9739
    })
    sub_data = sub_res.json()
    assert sub_data.get("success"), f"Report submission failed: {sub_data}"
    rep_cat = sub_data["data"]["category"]
    rep_id = sub_data["data"]["report_id"]
    print(f"Submitted report reference: #{rep_id}")
    print(f"Persisted Category: {rep_cat}")
    assert rep_cat != "auto", "Category was still 'auto'!"
    assert rep_cat == "Drinking Water", f"Expected 'Drinking Water', got '{rep_cat}'"
    print("\n[ALL TESTS PASSED] Infrastructure Category Auto-Detect with Gemini AI is working perfectly!")

if __name__ == "__main__":
    run_tests()
