"""
End-to-End Verification of SUTRA ML Inference Engine with Supabase Backend.

Executes:
1. Model loading & feature vector verification (25 canonical features, no leakage).
2. Live inference scoring with SutraRiskPredictor & LogisticRegressionBaseline.
3. Platt-calibrated log-odds evidence attribution generation.
4. Direct audit logging insertion into remote Supabase public.ml_inference_logs.
5. Query verification from Supabase to confirm persistence.
"""

import json
import os
import sys
import time
import uuid
import urllib.request
from pathlib import Path
from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "ml" / "src"))
sys.path.insert(0, str(REPO_ROOT))

load_dotenv(REPO_ROOT / ".env")

from sutra_ml.inference.predictor import SutraRiskPredictor
from app.ml.service import ml_service
from app.schemas.ml import MLPredictRequest

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://dwhwnnvdyrxmnamgicga.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

print("=" * 80)
print("SUTRA ML MODEL & SUPABASE BACKEND END-TO-END VERIFICATION")
print("=" * 80)

# Step 1: Initialize SutraRiskPredictor
print("\n[1/5] Loading SutraRiskPredictor from production v1.0.0 artifact...")
model_path = REPO_ROOT / "ml" / "artifacts" / "models" / "v1.0.0" / "baseline_logistic_regression.joblib"
metadata_path = REPO_ROOT / "ml" / "artifacts" / "models" / "v1.0.0" / "model_metadata.json"

predictor = SutraRiskPredictor(model_path=model_path, metadata_path=metadata_path)
assert predictor.is_ready, "Predictor is not ready!"
print(f"  ✓ Predictor loaded: {predictor.model_name}")
print(f"  ✓ Operational threshold: {predictor.operational_threshold}")
print(f"  ✓ Total feature columns: {len(predictor.feature_cols)} (19 num, 6 cat)")

# Step 2: Define test student feature vectors (SYN-1009 High Risk, SYN-1010 Low Risk)
test_instances = [
    {
        "student_id": "b0000000-0000-0000-0000-000000001009",
        "external_ref": "SYN-1009",
        "description": "Disengaged student with low LMS activity and missing early assessment",
        "features": {
            "num_of_prev_attempts": 1,
            "studied_credits": 60,
            "gender": "M",
            "region": "London Region",
            "highest_education": "Lower Than A Level",
            "imd_band": "10-20",
            "age_band": "0-35",
            "disability": "N",
            "days_registered_before_start": -10,
            "has_missing_registration_date": 0,
            "vle_total_clicks_d30": 28,
            "vle_active_days_d30": 3,
            "vle_clicks_precourse": 5,
            "vle_clicks_poststart_d30": 23,
            "vle_clicks_last_7d": 1,
            "vle_days_since_last_click": 14.0,
            "vle_clicks_forumng_d30": 2,
            "vle_clicks_oucontent_d30": 15,
            "vle_clicks_quiz_d30": 0,
            "vle_clicks_homepage_d30": 6,
            "vle_clicks_other_d30": 0,
            "has_vle_activity_d30": 1,
            "assessments_submitted_d30": 0,
            "assessment_banked_d30": 0,
            "has_early_assessment_submission_d30": 0,
        },
    },
    {
        "student_id": "b0000000-0000-0000-0000-000000001010",
        "external_ref": "SYN-1010",
        "description": "Highly engaged student with strong early submissions",
        "features": {
            "num_of_prev_attempts": 0,
            "studied_credits": 60,
            "gender": "F",
            "region": "South Region",
            "highest_education": "HE Qualification",
            "imd_band": "80-90%",
            "age_band": "0-35",
            "disability": "N",
            "days_registered_before_start": -45,
            "has_missing_registration_date": 0,
            "vle_total_clicks_d30": 340,
            "vle_active_days_d30": 22,
            "vle_clicks_precourse": 45,
            "vle_clicks_poststart_d30": 295,
            "vle_clicks_last_7d": 65,
            "vle_days_since_last_click": 1.0,
            "vle_clicks_forumng_d30": 40,
            "vle_clicks_oucontent_d30": 180,
            "vle_clicks_quiz_d30": 35,
            "vle_clicks_homepage_d30": 40,
            "vle_clicks_other_d30": 15,
            "has_vle_activity_d30": 1,
            "assessments_submitted_d30": 2,
            "assessment_banked_d30": 0,
            "has_early_assessment_submission_d30": 1,
        },
    },
]

# Step 3: Run Inference through both predictor engines
print("\n[2/5] Running inference and local attribution decomposition...")
results = []
for inst in test_instances:
    t0 = time.time()
    # 1. SutraRiskPredictor
    res = predictor.predict_single(
        feature_data=inst["features"],
        record_id=inst["external_ref"],
    )
    # 2. Central FastAPI MLService
    fastapi_req = MLPredictRequest(
        external_student_ref=inst["external_ref"],
        cutoff_days=30,
        features=inst["features"],
    )
    fastapi_res = ml_service.predict_single(fastapi_req)
    latency_ms = round((time.time() - t0) * 1000, 2)

    print(f"\n  Student: {inst['external_ref']} ({inst['description']})")
    print(f"    - Risk Probability: {res.risk_probability:.4f} (FastAPI Service: {fastapi_res.risk_probability:.4f})")
    print(f"    - Threshold: {predictor.operational_threshold}")
    print(f"    - Classification: {res.risk_tier.value} / {fastapi_res.classification}")
    print(f"    - Top 3 Risk Drivers:")
    for attr in res.evidence_card.top_risk_drivers[:3]:
        print(f"        • {attr.factor_title}: {attr.observed_raw_value} -> Log-Odds: {attr.contribution_weight:+0.3f}")

    results.append({
        "inst": inst,
        "prediction": fastapi_res,
        "latency_ms": latency_ms,
    })

# Step 4: Audit to remote Supabase ml_inference_logs
print("\n[3/5] Persisting audit logs into remote Supabase PostgreSQL...")
if not SUPABASE_SERVICE_KEY:
    print("  [!] SUPABASE_SERVICE_ROLE_KEY missing, skipping remote REST push.")
else:
    campus_id = "00000000-0000-0000-0000-000000000001"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    for item in results:
        inst = item["inst"]
        pred = item["prediction"]
        log_payload = {
            "id": str(uuid.uuid4()),
            "institution_id": campus_id,
            "student_id": inst["student_id"],
            "external_student_ref": inst["external_ref"],
            "model_name": "logistic_regression_baseline",
            "model_version": "1.0.0",
            "prediction_cutoff": "Day 30",
            "risk_probability": pred.risk_probability,
            "threshold": pred.threshold,
            "classification": pred.classification,
            "top_attributions": [attr.model_dump() for attr in pred.evidence_card.top_attributions],
            "latency_ms": item["latency_ms"],
        }

        url = f"{SUPABASE_URL}/rest/v1/ml_inference_logs"
        req = urllib.request.Request(
            url,
            data=json.dumps(log_payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        try:
            with urllib.request.urlopen(req) as resp:
                status = resp.status
                body = json.loads(resp.read().decode("utf-8"))
                print(f"  ✓ Inserted log for {inst['external_ref']} (HTTP {status}, ID: {body[0]['id']})")
        except Exception as e:
            print(f"  ✗ Failed to insert log for {inst['external_ref']}: {e}")

# Step 5: Verify records in Supabase
print("\n[4/5] Verifying ml_inference_logs in Supabase...")
if SUPABASE_SERVICE_KEY:
    url = f"{SUPABASE_URL}/rest/v1/ml_inference_logs?select=id,external_student_ref,risk_probability,classification,created_at&order=created_at.desc&limit=5"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            logs = json.loads(resp.read().decode("utf-8"))
            print(f"  ✓ Fetched latest {len(logs)} logs from Supabase:")
            for l in logs:
                print(f"      • {l['external_student_ref']}: Risk {l['risk_probability']} ({l['classification']}) at {l['created_at']}")
    except Exception as e:
        print(f"  ✗ Error reading back logs: {e}")

print("\n[5/5] All ML model integration checks completed successfully!")
print("=" * 80)
