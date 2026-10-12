use crate::client::SutraApiClient;
use crate::models::{MLPredictRequestDto, MLPredictResponseDto};
use colored::*;
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::Path;

/// Canonical 19 numerical features required for Day-30 early warning
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

/// Canonical 6 categorical features required for Day-30 early warning
pub const DAY30_CATEGORICAL_FEATURES: &[&str] = &[
    "gender",
    "region",
    "highest_education",
    "imd_band",
    "age_band",
    "disability",
];

/// Strictly forbidden post-cutoff or target outcome features to prevent temporal data leakage
pub const FORBIDDEN_LEAKED_FEATURES: &[&str] = &[
    "final_result",
    "is_at_risk",
    "at_risk",
    "date_unregistration",
    "score",
    "assessment_score",
    "early_assessment_score",
    "student_id",
    "id_student",
];

/// Validates a raw JSON value against the canonical 25-feature Day-30 schema and builds `MLPredictRequestDto`.
pub fn parse_and_validate_feature_record(raw_val: Value) -> Result<MLPredictRequestDto, String> {
    let obj = raw_val
        .as_object()
        .ok_or_else(|| "Input JSON must be an object.".to_string())?;

    // Check if wrapped in a fixture bundle (e.g. demo_seed.json has ml_day30_test_vector)
    let target_obj = if let Some(test_vector) = obj.get("ml_day30_test_vector").and_then(|v| v.as_object()) {
        test_vector
    } else {
        obj
    };

    // Extract external_student_ref
    let external_student_ref = target_obj
        .get("external_student_ref")
        .or_else(|| target_obj.get("student"))
        .and_then(|v| v.as_str())
        .unwrap_or("LOCAL-FILE-INPUT")
        .to_string();

    // Extract cutoff_days
    let cutoff_days = target_obj
        .get("cutoff_days")
        .and_then(|v| v.as_i64())
        .unwrap_or(30) as i32;

    if cutoff_days != 30 {
        return Err(format!(
            "Validation Error: ML early-warning model only supports Day-30 predictions; got cutoff_days={}.",
            cutoff_days
        ));
    }

    // Extract features dictionary
    let features_map: &serde_json::Map<String, Value> = if let Some(f_obj) = target_obj.get("features").and_then(|v| v.as_object()) {
        f_obj
    } else {
        // If not nested in 'features', treat the object itself as the feature dictionary
        target_obj
    };

    // 1. Anti-leakage verification
    for leaked in FORBIDDEN_LEAKED_FEATURES {
        if features_map.contains_key(*leaked) {
            return Err(format!(
                "Validation Error: Forbidden leakage feature '{}' detected in feature payload. \
Target outcomes and post-cutoff assessment scores must never enter inference.",
                leaked
            ));
        }
    }

    // 2. Completeness check: verify all 25 canonical features exist
    let mut missing = Vec::new();
    for num_feat in DAY30_NUMERIC_FEATURES {
        if !features_map.contains_key(*num_feat) {
            missing.push(*num_feat);
        }
    }
    for cat_feat in DAY30_CATEGORICAL_FEATURES {
        if !features_map.contains_key(*cat_feat) {
            missing.push(*cat_feat);
        }
    }

    if !missing.is_empty() {
        return Err(format!(
            "Validation Error: Missing {} required Day-30 feature(s): {:?}. \
Feature vector must contain all 25 canonical features.",
            missing.len(),
            missing
        ));
    }

    // 3. Type and finite value verification for numerical features
    for num_feat in DAY30_NUMERIC_FEATURES {
        let val = &features_map[*num_feat];
        if val.is_boolean() || !val.is_number() {
            return Err(format!(
                "Validation Error: Numeric feature '{}' must be an integer or float; got non-numeric value '{}'.",
                num_feat, val
            ));
        }
        if let Some(f) = val.as_f64() {
            if f.is_nan() || f.is_infinite() {
                return Err(format!(
                    "Validation Error: Non-finite value detected for feature '{}'.",
                    num_feat
                ));
            }
        }
    }

    // 4. Type verification for categorical features
    for cat_feat in DAY30_CATEGORICAL_FEATURES {
        let val = &features_map[*cat_feat];
        if !val.is_string() {
            return Err(format!(
                "Validation Error: Categorical feature '{}' must be a string; got '{}'.",
                cat_feat, val
            ));
        }
    }

    // Convert map
    let mut features = HashMap::new();
    for (k, v) in features_map {
        // Only include recognized canonical features to prevent arbitrary inputs
        if DAY30_NUMERIC_FEATURES.contains(&k.as_str()) || DAY30_CATEGORICAL_FEATURES.contains(&k.as_str()) {
            features.insert(k.clone(), v.clone());
        }
    }

    Ok(MLPredictRequestDto {
        external_student_ref,
        cutoff_days,
        features,
    })
}

/// Executes the `sutra predict --file <PATH>` command.
pub async fn run_predict(client: &SutraApiClient, file_path: &Path) -> Result<(), String> {
    println!("{}", "=== SUTRA ML Early Warning Prediction ===".bold());
    println!("Feature File: {}", file_path.display().to_string().cyan());
    println!("Backend URL:  {}", client.config.api_url.cyan());

    // 1. Read input file
    let file_content = fs::read_to_string(file_path).map_err(|e| {
        format!(
            "Failed to read feature file {:?}: {}\nPlease ensure the path exists and is readable.",
            file_path, e
        )
    })?;

    // 2. Parse JSON
    let raw_val: Value = serde_json::from_str(&file_content).map_err(|e| {
        format!(
            "Failed to parse JSON in feature file {:?}: {}\nRecord must be valid formatted JSON.",
            file_path, e
        )
    })?;

    // 3. Strict schema validation
    println!("\nValidating 25 canonical Day-30 features and anti-leakage invariants...");
    let req_dto = parse_and_validate_feature_record(raw_val)?;
    println!(
        "{} Features validated: 19 numerical, 6 categorical (Anti-leakage guards verified).",
        "✓".green().bold()
    );

    // 4. Submit prediction request
    if !client.config.json {
        println!("Submitting feature vector to production inference endpoint...");
    }
    let response = client.predict(&req_dto).await?;

    if client.config.json {
        println!("{}", serde_json::to_string_pretty(&response).map_err(|e| e.to_string())?);
        return Ok(());
    }

    // 5. Render results
    render_prediction_response(&response, "Validated Local Feature File (Canonical 25 Day-30 vector)");

    Ok(())
}

/// Executes authorized student-specific ML scoring against server-side aggregated telemetry.
pub async fn execute_student_predict_flow(
    client: &SutraApiClient,
    student_id_or_ref: &str,
) -> Result<(), String> {
    let clean_id = student_id_or_ref.trim();
    if clean_id.is_empty() {
        return Err("Validation Error: Student identifier cannot be empty.".to_string());
    }

    if !client.config.json {
        println!("{}", "=== SUTRA Student-Specific Early Warning Prediction ===".bold());
        println!("Target Student:      {}", clean_id.cyan().bold());
        if let Some(campus_id) = client.config.campus_id {
            println!("Campus Tenancy:      {}", campus_id.to_string().cyan());
        }
        println!("Source Policy:       Server-side observation ledger aggregation only");
        println!("Evaluation Cutoff:   Strict Day 30 post-enrollment");

        println!("\nRequesting authorized inference from backend server...");
    }

    let response = client.predict_student(clean_id).await?;

    if client.config.json {
        println!("{}", serde_json::to_string_pretty(&response).map_err(|e| e.to_string())?);
        return Ok(());
    }

    render_prediction_response(&response, "Authorized Campus Operational Ledger (Server-side aggregated)");

    Ok(())
}

/// Formats and renders the ML early-warning prediction and Evidence Card in the terminal.
pub fn render_prediction_response(resp: &MLPredictResponseDto, source_type: &str) {
    let separator = "=".repeat(80);
    println!("\n{}", separator.dimmed());
    println!(
        "{}",
        "SUTRA EARLY WARNING PREDICTION (Day-30 Baseline Model)".bold()
    );
    println!("{}", separator.dimmed());

    println!("Data Source:         {}", source_type.yellow().bold());
    println!("Record Reference:    {}", resp.external_student_ref.cyan().bold());

    if let Some(ref card) = resp.evidence_card {
        if let Some(ref m_name) = card.model_name {
            println!(
                "Model Pipeline:      {} (version: {})",
                m_name.yellow(),
                card.model_version.as_deref().unwrap_or("1.0.0")
            );
        }
        if let Some(ref cutoff) = card.prediction_cutoff {
            println!("Prediction Cutoff:   {}", cutoff);
        }
        if let Some(ref calib) = card.calibration_status {
            println!("Calibration:         {}", calib.green());
        }
    }

    // Probability & Progress bar
    let bar_width = 30;
    let filled = ((resp.risk_probability * bar_width as f64).round() as usize).min(bar_width);
    let bar = format!(
        "[{}{}]",
        "=".repeat(filled).red().bold(),
        " ".repeat(bar_width - filled)
    );

    println!("\nRisk Probability:    {} {:.1}%", bar, resp.risk_probability * 100.0);
    println!("Decision Threshold:  {:.1}%", resp.threshold * 100.0);

    let is_at_risk = resp.risk_probability >= resp.threshold;
    let status_tag = if is_at_risk {
        "[AT RISK • REVIEW RECOMMENDED]".red().bold()
    } else {
        "[ON TRACK]".green().bold()
    };
    println!("Classification:      {}", status_tag);

    // Attributions (Evidence Card)
    if let Some(ref card) = resp.evidence_card {
        if !card.top_attributions.is_empty() {
            println!("\n{}", "TOP RISK DRIVERS (Increases Risk Weight):".bold());
            let risk_drivers: Vec<_> = card
                .top_attributions
                .iter()
                .filter(|a| a.direction == "increases_risk")
                .collect();

            if risk_drivers.is_empty() {
                println!("  None observed above baseline.");
            } else {
                for driver in risk_drivers {
                    println!(
                        "  {} {:<30} observed: {:<8} (weight: +{:.4})",
                        "▲".red(),
                        driver.feature.bold(),
                        driver.value.to_string(),
                        driver.attribution
                    );
                }
            }

            println!("\n{}", "TOP PROTECTIVE FACTORS (Decreases Risk Weight):".bold());
            let protective: Vec<_> = card
                .top_attributions
                .iter()
                .filter(|a| a.direction == "decreases_risk")
                .collect();

            if protective.is_empty() {
                println!("  None observed below baseline.");
            } else {
                for factor in protective {
                    println!(
                        "  {} {:<30} observed: {:<8} (weight: {:.4})",
                        "▼".green(),
                        factor.feature.bold(),
                        factor.value.to_string(),
                        factor.attribution
                    );
                }
            }
        }

        // Limitations
        if !card.limitations.is_empty() {
            println!("\n{}", "MODEL GOVERNANCE LIMITATIONS:".bold());
            for lim in &card.limitations {
                println!("  • {}", lim.dimmed());
            }
        }
    }

    println!("\n{}", "NON-CAUSAL ADVISORY DISCLAIMER:".bold());
    println!(
        "{}",
        "  • Empirical statistical prediction based on historical Day-30 course interactions."
            .dimmed()
    );
    println!(
        "{}",
        "  • Does NOT constitute a clinical diagnosis, an ability assessment, or certainty of student outcome."
            .dimmed()
    );
    println!(
        "{}",
        "  • Principle 'No Alert Without Action': Any follow-up requires verified educator review."
            .dimmed()
    );
    println!(
        "{}",
        "  • Human Oversight Invariant: Predictions are decision-support only. Never automate case creation, escalation, or sanctions based on a model score alone."
            .dimmed()
    );
    println!("{}", separator.dimmed());
}
