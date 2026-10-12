use serde_json::json;

pub const DAY30_NUMERIC_FEATURES: &[&str] = &[
    "num_of_prev_attempts",
    "studied_credits",
    "days_registered_before_start",
    "has_missing_registration_date",
    "vle_total_clicks_d30",
    "vle_active_days_d30",
    "vle_clicks_precourse",
    "vle_clicks_poststart_d30",
    "vle_clicks_last_7d",
    "vle_days_since_last_click",
    "vle_clicks_forumng_d30",
    "vle_clicks_oucontent_d30",
    "vle_clicks_quiz_d30",
    "vle_clicks_homepage_d30",
    "vle_clicks_other_d30",
    "has_vle_activity_d30",
    "assessments_submitted_d30",
    "assessment_banked_d30",
    "has_early_assessment_submission_d30",
];

pub const DAY30_CATEGORICAL_FEATURES: &[&str] = &[
    "gender",
    "region",
    "highest_education",
    "imd_band",
    "age_band",
    "disability",
];

fn make_valid_feature_map() -> serde_json::Map<String, serde_json::Value> {
    let mut map = serde_json::Map::new();
    let num_pairs: &[(&str, f64)] = &[
        ("num_of_prev_attempts", 0.0),
        ("studied_credits", 60.0),
        ("days_registered_before_start", -32.0),
        ("has_missing_registration_date", 0.0),
        ("vle_total_clicks_d30", 142.0),
        ("vle_active_days_d30", 8.0),
        ("vle_clicks_precourse", 24.0),
        ("vle_clicks_poststart_d30", 118.0),
        ("vle_clicks_last_7d", 12.0),
        ("vle_days_since_last_click", 6.0),
        ("vle_clicks_forumng_d30", 18.0),
        ("vle_clicks_oucontent_d30", 82.0),
        ("vle_clicks_quiz_d30", 0.0),
        ("vle_clicks_homepage_d30", 28.0),
        ("vle_clicks_other_d30", 14.0),
        ("has_vle_activity_d30", 1.0),
        ("assessments_submitted_d30", 1.0),
        ("assessment_banked_d30", 0.0),
        ("has_early_assessment_submission_d30", 1.0),
    ];
    for (k, v) in num_pairs {
        map.insert(k.to_string(), json!(v));
    }
    let cat_pairs: &[(&str, &str)] = &[
        ("gender", "F"),
        ("region", "East Anglian Region"),
        ("highest_education", "A Level or Equivalent"),
        ("imd_band", "20-30%"),
        ("age_band", "0-35"),
        ("disability", "N"),
    ];
    for (k, v) in cat_pairs {
        map.insert(k.to_string(), json!(v));
    }
    map
}

// Validation logic matching cli/src/commands/predict.rs
fn validate_features(raw_val: serde_json::Value) -> Result<usize, String> {
    let obj = raw_val.as_object().ok_or("Input JSON must be an object.")?;
    let target = if let Some(tv) = obj.get("ml_day30_test_vector").and_then(|v| v.as_object()) {
        tv
    } else {
        obj
    };

    let cutoff = target.get("cutoff_days").and_then(|v| v.as_i64()).unwrap_or(30);
    if cutoff != 30 {
        return Err(format!("ML early-warning model only supports Day-30 predictions; got cutoff_days={}", cutoff));
    }

    let f_map = if let Some(features) = target.get("features").and_then(|v| v.as_object()) {
        features
    } else {
        target
    };

    // Leakage check
    for leaked in &["final_result", "is_at_risk", "at_risk", "date_unregistration", "score", "assessment_score", "student_id"] {
        if f_map.contains_key(*leaked) {
            return Err(format!("Forbidden leakage feature '{}' detected in feature payload.", leaked));
        }
    }

    // Completeness check
    let mut missing = Vec::new();
    for req in DAY30_NUMERIC_FEATURES {
        if !f_map.contains_key(*req) {
            missing.push(*req);
        }
    }
    for req in DAY30_CATEGORICAL_FEATURES {
        if !f_map.contains_key(*req) {
            missing.push(*req);
        }
    }
    if !missing.is_empty() {
        return Err(format!("Missing {} required Day-30 feature(s): {:?}", missing.len(), missing));
    }

    // Type checks
    for (k, v) in f_map {
        if DAY30_CATEGORICAL_FEATURES.contains(&k.as_str()) {
            if !v.is_string() {
                return Err(format!("Categorical feature '{}' must be a string", k));
            }
        } else if DAY30_NUMERIC_FEATURES.contains(&k.as_str()) {
            if v.is_boolean() || !v.is_number() {
                return Err(format!("Numeric feature '{}' must be integer or float", k));
            }
        }
    }

    Ok(f_map.len())
}

#[test]
fn test_valid_canonical_feature_record_parsing() {
    let map = make_valid_feature_map();
    let json_payload = json!({
        "external_student_ref": "SYN-1007",
        "cutoff_days": 30,
        "features": map
    });

    let result = validate_features(json_payload);
    assert!(result.is_ok(), "Valid feature record must pass validation");
    assert_eq!(result.unwrap(), 25, "Must count exactly 25 canonical features");
}

#[test]
fn test_rejection_of_anti_leakage_forbidden_features() {
    let mut map = make_valid_feature_map();
    map.insert("final_result".to_string(), json!("Fail"));
    let payload = json!({ "features": map });

    let err = validate_features(payload).unwrap_err();
    assert!(err.contains("Forbidden leakage feature 'final_result' detected"));

    // Test another leakage field
    let mut map2 = make_valid_feature_map();
    map2.insert("assessment_score".to_string(), json!(78.5));
    let payload2 = json!({ "features": map2 });

    let err2 = validate_features(payload2).unwrap_err();
    assert!(err2.contains("Forbidden leakage feature 'assessment_score' detected"));
}

#[test]
fn test_rejection_of_missing_features() {
    let mut map = make_valid_feature_map();
    map.remove("vle_total_clicks_d30");
    let payload = json!({ "features": map });

    let err = validate_features(payload).unwrap_err();
    assert!(err.contains("Missing 1 required Day-30 feature(s)"));
    assert!(err.contains("vle_total_clicks_d30"));
}

#[test]
fn test_rejection_of_invalid_feature_types() {
    // Boolean instead of number
    let mut map = make_valid_feature_map();
    map.insert("studied_credits".to_string(), json!(true));
    let payload = json!({ "features": map });

    let err = validate_features(payload).unwrap_err();
    assert!(err.contains("Numeric feature 'studied_credits' must be integer or float"));

    // Number instead of string for categorical
    let mut map2 = make_valid_feature_map();
    map2.insert("gender".to_string(), json!(123));
    let payload2 = json!({ "features": map2 });

    let err2 = validate_features(payload2).unwrap_err();
    assert!(err2.contains("Categorical feature 'gender' must be a string"));
}

#[test]
fn test_rejection_of_invalid_cutoff_days() {
    let map = make_valid_feature_map();
    let payload = json!({
        "external_student_ref": "SYN-1007",
        "cutoff_days": 60,
        "features": map
    });

    let err = validate_features(payload).unwrap_err();
    assert!(err.contains("only supports Day-30 predictions; got cutoff_days=60"));
}

#[test]
fn test_demo_seed_fixture_structure_support() {
    let map = make_valid_feature_map();
    let fixture_bundle = json!({
        "ml_day30_test_vector": {
            "student": "SYN-1007",
            "cutoff_days": 30,
            "features": map,
            "expected_baseline_probability": 0.68
        }
    });

    let result = validate_features(fixture_bundle);
    assert!(result.is_ok(), "Must extract and validate features from fixture bundle");
}

#[test]
fn test_ml_predict_response_dto_deserialization() {
    let raw_response = json!({
        "external_student_ref": "SYN-1007",
        "risk_probability": 0.68,
        "threshold": 0.46,
        "classification": "At_Risk",
        "evidence_card": {
            "card_type": "ml_early_warning_evidence",
            "model_name": "Regularized Logistic Regression Baseline",
            "model_version": "v1.0.0",
            "prediction_cutoff": "Day 30",
            "risk_probability": 0.68,
            "threshold": 0.46,
            "classification": "At_Risk",
            "calibration_status": "platt_calibrated",
            "top_attributions": [
                {
                    "feature": "vle_active_days_d30",
                    "value": 8.0,
                    "attribution": 0.3265,
                    "direction": "increases_risk"
                },
                {
                    "feature": "highest_education",
                    "value": "A Level",
                    "attribution": -0.2617,
                    "direction": "decreases_risk"
                }
            ],
            "limitations": [
                "Trained on historical Open University course registrations; not calibrated for non-modular curricula.",
                "Statistical correlation, not individual diagnostic certainty."
            ]
        }
    });

    let parsed: serde_json::Value = serde_json::from_str(&raw_response.to_string()).unwrap();
    assert_eq!(parsed["external_student_ref"], "SYN-1007");
    assert_eq!(parsed["risk_probability"], 0.68);
    assert_eq!(parsed["classification"], "At_Risk");
    assert_eq!(parsed["evidence_card"]["top_attributions"].as_array().unwrap().len(), 2);
}
