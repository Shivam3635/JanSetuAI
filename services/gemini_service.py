"""
JanSetu AI - Google Gemini AI Service (Phase 3)
Handles multilingual natural language understanding (Hindi & English),
zero-shot infrastructure classification, severity assessment, urgency scoring,
synthesized English problem summarization, societal impact extraction, and keywords.

Features:
- Direct Google Gemini REST API connector with structured JSON output schema.
- Safe validation of all extracted fields against allowed GovTech taxonomies.
- Resilient zero-dependency fallback classifier for offline / demo mode.
- Non-blocking error handling to guarantee the application never crashes.
"""

import os
import re
import json
import requests

ALLOWED_CATEGORIES = [
    "Roads",
    "Drinking Water",
    "Healthcare",
    "Education",
    "Electricity",
    "Digital Connectivity",
    "Public Transport",
    "Sanitation",
    "Drainage",
    "Other"
]

ALLOWED_SEVERITIES = ["Low", "Medium", "High", "Critical"]
ALLOWED_URGENCIES = ["Low", "Medium", "High", "Critical"]

CATEGORY_SYNONYMS = {
    "road": "Roads",
    "roads": "Roads",
    "pothole": "Roads",
    "potholes": "Roads",
    "street": "Roads",
    "highway": "Roads",
    "bridge": "Roads",
    "water": "Drinking Water",
    "drinking water": "Drinking Water",
    "drinking_water": "Drinking Water",
    "water supply": "Drinking Water",
    "pipeline": "Drinking Water",
    "handpump": "Drinking Water",
    "health": "Healthcare",
    "healthcare": "Healthcare",
    "hospital": "Healthcare",
    "clinic": "Healthcare",
    "medical": "Healthcare",
    "doctor": "Healthcare",
    "ambulance": "Healthcare",
    "school": "Education",
    "education": "Education",
    "college": "Education",
    "teacher": "Education",
    "electricity": "Electricity",
    "power": "Electricity",
    "power cut": "Electricity",
    "transformer": "Electricity",
    "electric": "Electricity",
    "voltage": "Electricity",
    "wire": "Electricity",
    "sanitation": "Sanitation",
    "garbage": "Sanitation",
    "waste": "Sanitation",
    "cleanliness": "Sanitation",
    "trash": "Sanitation",
    "drain": "Drainage",
    "drainage": "Drainage",
    "sewer": "Drainage",
    "sewage": "Drainage",
    "waterlogging": "Drainage",
    "internet": "Digital Connectivity",
    "connectivity": "Digital Connectivity",
    "digital": "Digital Connectivity",
    "digital connectivity": "Digital Connectivity",
    "network": "Digital Connectivity",
    "mobile network": "Digital Connectivity",
    "tower": "Digital Connectivity",
    "bus": "Public Transport",
    "transport": "Public Transport",
    "public transport": "Public Transport",
    "transit": "Public Transport"
}

def normalize_category(raw_category):
    if not raw_category:
        return "Other"
    clean = str(raw_category).strip().lower()
    for cat in ALLOWED_CATEGORIES:
        if clean == cat.lower():
            return cat
    if clean in CATEGORY_SYNONYMS:
        return CATEGORY_SYNONYMS[clean]
    for syn, canonical in CATEGORY_SYNONYMS.items():
        if syn in clean:
            return canonical
    return "Other"

class GeminiService:
    def __init__(self, api_key=None, model=None):
        self.api_key = api_key or os.getenv('GEMINI_API_KEY', '').strip()
        self.model = model or os.getenv('GEMINI_MODEL', 'gemini-3-flash-preview').strip()

    def analyze_complaint(self, text, user_language=None):
        """
        Main entry point for citizen grievance NLU analysis.
        Attempts Gemini API call first; falls back cleanly if key is missing or call fails.
        """
        clean_text = (text or "").strip()
        if not clean_text:
            return self._empty_result()

        # If API key is configured and not placeholder, query Gemini API
        if self.api_key and not self.api_key.startswith('your_') and len(self.api_key) > 10:
            try:
                gemini_res = self._call_gemini_api(clean_text, user_language)
                if gemini_res:
                    return gemini_res
            except Exception as e:
                print(f"[GeminiService Warning] API request failed: {e}. Utilizing fallback engine.")

        # Zero-dependency heuristic & NLP fallback
        return self._fallback_analysis(clean_text, user_language)

    def _call_gemini_api(self, text, user_language=None):
        """
        Calls Google Gemini API using structured JSON mode.
        """
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"

        system_instruction = (
            "You are JanSetu AI's multilingual GovTech Infrastructure Intelligence classifier for India. "
            "Analyze citizen complaints submitted in Hindi, English, or mixed vernacular. "
            "Extract structured information strictly following this JSON schema:\n"
            "{\n"
            '  "language": "Hindi" or "English",\n'
            '  "category": One of ["Roads", "Drinking Water", "Healthcare", "Education", "Electricity", '
            '"Digital Connectivity", "Public Transport", "Sanitation", "Drainage", "Other"],\n'
            '  "problem_summary": "A concise, objective summary written in professional English",\n'
            '  "severity": One of ["Low", "Medium", "High", "Critical"],\n'
            '  "urgency": One of ["Low", "Medium", "High", "Critical"],\n'
            '  "impact": "A clear description of the real-world societal, economic, or health impact on citizens",\n'
            '  "keywords": ["array", "of", "3_to_5", "lowercase", "keywords"]\n'
            "}\n"
            "Do NOT invent locations or facts not stated in the complaint. "
            "Return ONLY valid JSON without markdown wrapping."
        )

        user_prompt = (
            f"Citizen Complaint: \"{text}\"\n"
            f"Reported User Language: {user_language or 'Not specified'}\n"
            "Analyze and output valid JSON."
        )

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": f"{system_instruction}\n\n{user_prompt}"}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "topP": 0.8,
                "topK": 40,
                "maxOutputTokens": 600,
                "responseMimeType": "application/json"
            }
        }

        models_to_try = [self.model]
        for fallback_m in ["gemini-3-flash-preview", "gemini-3.1-flash-lite-preview"]:
            if fallback_m not in models_to_try:
                models_to_try.append(fallback_m)

        headers = {"Content-Type": "application/json"}
        last_error = None

        for current_model in models_to_try:
            endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{current_model}:generateContent?key={self.api_key}"
            try:
                response = requests.post(endpoint, json=payload, headers=headers, timeout=12)
                if response.status_code == 200:
                    self.model = current_model
                    res_data = response.json()
                    candidates = res_data.get("candidates", [])
                    if not candidates:
                        raise RuntimeError("Gemini returned no candidates.")

                    raw_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()
                    raw_text = re.sub(r"^```json\s*", "", raw_text)
                    raw_text = re.sub(r"^```\s*", "", raw_text)
                    raw_text = re.sub(r"\s*```$", "", raw_text)

                    parsed = json.loads(raw_text)
                    return self._validate_and_sanitize(parsed, text, source="gemini_ai")
                elif response.status_code in (404, 503):
                    last_error = f"Model {current_model} returned {response.status_code}: {response.text}"
                    continue
                else:
                    raise RuntimeError(f"Gemini API returned HTTP {response.status_code}: {response.text}")
            except Exception as e:
                last_error = str(e)
                continue

        if last_error:
            raise RuntimeError(last_error)

    def _fallback_analysis(self, text, user_language=None):
        """
        Resilient rule-based zero-shot heuristic fallback.
        Ensures hackathon demonstrations and offline presentations never crash.
        """
        # 1. Detect language
        has_devanagari = bool(re.search(r'[\u0900-\u097F]', text))
        detected_lang = "Hindi" if has_devanagari else (user_language or "English")

        text_lower = text.lower()

        # 2. Heuristic Category Detection
        category = "Other"
        category_scores = {cat: 0 for cat in ALLOWED_CATEGORIES}

        # Weighted keyword taxonomy to accurately disambiguate infrastructure domains
        weighted_keywords = {
            "Education": [("विद्यालय", 4), ("स्कूल", 4), ("कॉलेज", 4), ("पाठशाला", 4), ("शिक्षा", 3), ("शिक्षक", 3), ("छात्र", 3), ("छत", 2), ("दीवार", 2), ("कक्षा", 3), ("classroom", 4), ("school", 4), ("teacher", 3), ("education", 3)],
            "Healthcare": [("अस्पताल", 4), ("चिकित्सालय", 4), ("दवाखाना", 4), ("hospital", 4), ("doctor", 4), ("डॉक्टर", 4), ("स्वास्थ्य", 3), ("दवा", 3), ("एम्बुलेंस", 5), ("ambulance", 5), ("मरीज", 3), ("clinic", 3)],
            "Roads": [("सड़क", 4), ("मार्ग", 3), ("रास्ता", 3), ("road", 4), ("गड्ढे", 4), ("pothole", 4), ("street", 3), ("हाईवे", 4), ("highway", 4), ("पुल", 4), ("bridge", 4), ("खड़ंजा", 4)],
            "Drinking Water": [("पीने का पानी", 5), ("पेयजल", 5), ("drinking water", 5), ("नल", 4), ("पाइपलाइन", 4), ("pipeline", 4), ("हैंडपंप", 4), ("handpump", 4), ("पानी", 1), ("water", 1)],
            "Electricity": [("बिजली", 4), ("electricity", 4), ("power cut", 4), ("करंट", 4), ("तार", 3), ("wire", 3), ("ट्रांसफार्मर", 4), ("transformer", 4), ("voltage", 3), ("blackout", 4), ("खंभा", 3)],
            "Sanitation": [("कचरा", 4), ("कूड़ा", 4), ("garbage", 4), ("सफाई", 4), ("sanitation", 4), ("कूड़ेदान", 4), ("waste", 3), ("गंदगी", 3)],
            "Drainage": [("नाली", 4), ("नाला", 4), ("सीवर", 4), ("drain", 4), ("drainage", 4), ("sewer", 4), ("जलभराव", 4), ("waterlogging", 4)],
            "Digital Connectivity": [("इंटरनेट", 4), ("नेटवर्क", 4), ("internet", 4), ("connectivity", 4), ("टावर", 4), ("tower", 4), ("signal", 3), ("सिग्नल", 3)],
            "Public Transport": [("बस", 4), ("bus", 4), ("transport", 4), ("परिवहन", 4), ("ऑटो", 4), ("tempo", 4), ("स्टेशन", 3), ("station", 3)]
        }

        for cat, kw_tuples in weighted_keywords.items():
            for kw, weight in kw_tuples:
                if kw in text_lower:
                    category_scores[cat] += weight

        best_category = max(category_scores, key=category_scores.get)
        if category_scores[best_category] > 0:
            category = best_category

        # 3. Severity & Urgency Assessment
        critical_keywords = [
            "ambulance", "एम्बुलेंस", "death", "मौत", "poison", "जहर", "hazard", "आपातकालीन", 
            "emergency", "collapse", "गिर गया", "sparking", "आग", "fire", "जानलेवा", "critical"
        ]
        high_keywords = [
            "blocked", "बंद", "broken", "टूट", "5 days", "5 दिन", "urgent", "गंभीर", 
            "flooding", "पानी भर", "heavy", "severely", "खराब", "कष्ट", "stranded"
        ]

        if any(ck in text_lower for ck in critical_keywords):
            severity = "Critical"
            urgency = "Critical"
        elif any(hk in text_lower for hk in high_keywords):
            severity = "High"
            urgency = "High"
        else:
            severity = "Medium"
            urgency = "Medium"

        # 4. Synthesized English Problem Summary
        summary = self._synthesize_summary(text, category, severity, detected_lang)

        # 5. Societal Impact Statement
        impact = self._synthesize_impact(category, severity, detected_lang)

        # 6. Extracted Keywords
        domain_tags = {
            "Roads": ["road", "pothole", "transportation"],
            "Drinking Water": ["water", "pipeline", "contamination"],
            "Healthcare": ["healthcare", "hospital", "emergency"],
            "Education": ["education", "school", "facility"],
            "Electricity": ["electricity", "power_cut", "wires"],
            "Sanitation": ["sanitation", "garbage", "cleanliness"],
            "Drainage": ["drainage", "waterlogging", "sewage"],
            "Digital Connectivity": ["internet", "connectivity", "network"],
            "Public Transport": ["transit", "bus", "transport"],
            "Other": ["infrastructure", "public_works"]
        }

        extracted_keywords = list(domain_tags.get(category, ["infrastructure"]))
        if "ambulance" in text_lower or "एम्बुलेंस" in text_lower:
            extracted_keywords.append("ambulance")
        if "rain" in text_lower or "बारिश" in text_lower:
            extracted_keywords.append("rain")
        if "village" in text_lower or "गांव" in text_lower:
            extracted_keywords.append("village")
        if "urgent" in text_lower or "emergency" in text_lower or "आपातकालीन" in text_lower:
            extracted_keywords.append("emergency")

        return {
            "language": detected_lang,
            "category": category,
            "problem_summary": summary,
            "severity": severity,
            "urgency": urgency,
            "impact": impact,
            "keywords": extracted_keywords[:6],
            "ai_processed": True,
            "source": "rule_based_fallback"
        }

    def _synthesize_summary(self, text, category, severity, lang):
        """Generates a professional English summary from citizen input."""
        if lang == "Hindi":
            # Translate canonical issues
            if category == "Roads":
                return "Severely degraded village road impeding vehicular and emergency transportation."
            elif category == "Drinking Water":
                return "Drinking water supply disruption with reported contamination or pipeline breakage."
            elif category == "Healthcare":
                return "Healthcare facility dysfunction or lack of emergency ambulance and medical support."
            elif category == "Electricity":
                return "Prolonged power outage or dangerous low-hanging electrical wiring reported."
            elif category == "Drainage":
                return "Severe waterlogging and clogged drainage system affecting local access."
            elif category == "Sanitation":
                return "Unmanaged public garbage accumulation posing sanitation and environmental hazards."
            else:
                return f"Citizen grievance regarding local {category} infrastructure requiring administrative attention."
        else:
            # English cleanup
            if len(text) <= 120:
                return text
            return text[:117] + "..."

    def _synthesize_impact(self, category, severity, lang):
        """Generates a contextual societal impact statement."""
        impact_map = {
            "Roads": "Hinders daily commuting, trade transit, and emergency ambulance access for rural communities.",
            "Drinking Water": "Poses acute public health hazard and waterborne disease outbreak risk for local residents.",
            "Healthcare": "Threatens patient well-being, increases maternal and child healthcare vulnerability in the area.",
            "Education": "Disrupts student learning conditions, attendance, and safety within rural educational institutes.",
            "Electricity": "Impacts household power, agricultural irrigation pump functionality, and nighttime safety.",
            "Sanitation": "Creates vector-borne disease risks, odor pollution, and unsanitary civic conditions.",
            "Drainage": "Causes road erosion, stagnant water breeding grounds for dengue/malaria, and property flooding.",
            "Digital Connectivity": "Limits access to online education, direct benefit transfer (DBT) portals, and tele-health.",
            "Public Transport": "Isolates village residents from urban economic hubs, markets, and secondary schools.",
            "Other": "Impairs community infrastructure quality and municipal civic amenities."
        }
        return impact_map.get(category, "Citizen community welfare and public infrastructure delivery affected.")

    def _validate_and_sanitize(self, data, original_text, source="gemini_ai"):
        """Validates output fields against GovTech specifications."""
        category = normalize_category(data.get("category"))
        if category == "Other":
            # Check if original text has a clear heuristic category
            fallback_res = self._fallback_analysis(original_text)
            if fallback_res.get("category") and fallback_res.get("category") != "Other":
                category = fallback_res.get("category")

        raw_sev = str(data.get("severity") or "").strip().capitalize()
        severity = raw_sev if raw_sev in ALLOWED_SEVERITIES else "Medium"

        raw_urg = str(data.get("urgency") or "").strip().capitalize()
        urgency = raw_urg if raw_urg in ALLOWED_URGENCIES else severity

        language = data.get("language") or "Hindi"
        if language not in ["Hindi", "English"]:
            language = "Hindi" if bool(re.search(r'[\u0900-\u097F]', original_text)) else "English"

        summary = data.get("problem_summary") or original_text[:120]
        impact = data.get("impact") or "Civic infrastructure accessibility affected."

        keywords = data.get("keywords")
        if not isinstance(keywords, list):
            keywords = [category.lower(), "infrastructure"]
        else:
            keywords = [str(k).lower().strip() for k in keywords[:6]]

        return {
            "language": language,
            "category": category,
            "problem_summary": summary,
            "severity": severity,
            "urgency": urgency,
            "impact": impact,
            "keywords": keywords,
            "ai_processed": True,
            "source": source
        }

    def _empty_result(self):
        return {
            "language": "Hindi",
            "category": "Other",
            "problem_summary": "Empty or unspecified complaint description.",
            "severity": "Low",
            "urgency": "Low",
            "impact": "None identified.",
            "keywords": ["empty"],
            "ai_processed": False,
            "source": "default"
        }
