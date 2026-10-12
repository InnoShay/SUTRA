use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DataSourceProvenanceDto {
    pub name: String,
    pub description: String,
    pub entity_type: String,
    pub key_schema: String,
    #[serde(default)]
    pub record_count: Option<i64>,
    pub storage_location: String,
    pub purpose: String,
    pub licensing: String,
    pub isolation_rule: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ProvenanceOverviewDto {
    pub status: String,
    pub governance_framework: String,
    pub sources: HashMap<String, DataSourceProvenanceDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ResearchRecordDto {
    pub source: String,
    pub record_identifier: String,
    pub entity_type: String,
    pub provenance_label: String,
    pub licensing: String,
    pub purpose: String,
    pub disclaimer: String,
    #[serde(default)]
    pub enrollment_context: Option<HashMap<String, serde_json::Value>>,
    pub features: HashMap<String, serde_json::Value>,
    #[serde(default)]
    pub is_synthetic: bool,
    #[serde(default)]
    pub is_research: bool,
    #[serde(default)]
    pub is_institutional: bool,
}

#[test]
fn test_provenance_overview_deserialization() {
    let raw = json!({
        "status": "audited_and_isolated",
        "governance_framework": "SUTRA ADR-005: Strict Three-Source Data Provenance Isolation",
        "sources": {
            "institutional": {
                "name": "Live Campus Institutional Registry",
                "description": "Authoritative student records managed by institutional registrar.",
                "entity_type": "Enrolled Student Identity Profile",
                "key_schema": "id (UUID PK), (institution_id, external_ref) UNIQUE",
                "record_count": null,
                "storage_location": "PostgreSQL students table",
                "purpose": "Campus academic advising, intervention case management, early-warning triage.",
                "licensing": "Institutional FERPA/GDPR/Tenancy Protected Data",
                "isolation_rule": "Strictly restricted to active campus tenancy. Never populated from research or synthetic dumps."
            },
            "oulad_research": {
                "name": "Open University Learning Analytics Dataset (OULAD)",
                "description": "Historical 2013-2014 clickstream and VLE engagement benchmark dataset.",
                "entity_type": "Student-Course Presentation Enrollment",
                "key_schema": "Compound (code_module, code_presentation, id_student)",
                "record_count": 27466,
                "storage_location": "ml/data/processed/day30_features.csv",
                "purpose": "Retrospective ML model training, Platt calibration, baseline evaluation.",
                "licensing": "Open Government Licence v2.0 (OGL v2.0) — DOI 10.6084/m9.figshare.5081998.v1",
                "isolation_rule": "id_student is an anonymized 2013 UK research ID. Strictly forbidden from being assumed equal to a SUTRA student UUID."
            },
            "synthetic_demo": {
                "name": "SUTRA Synthetic Demonstration Fixtures",
                "description": "Fictional engagement vectors generated for developer testing and pipeline verification.",
                "entity_type": "Synthetic Test Vector / Persona Archetype",
                "key_schema": "record_id (e.g. SYNTH-BATCH-001) or fixture key (e.g. SYN-1007)",
                "record_count": 106,
                "storage_location": "docs/fixtures/demo_seed.json, ml/data/synthetic/synthetic_batch_100.json",
                "purpose": "Software mechanics testing, schema validation, latency smoke testing.",
                "licensing": "MIT License / Project Internal Synthetic Seed (Seed: 42)",
                "isolation_rule": "All entities are fictional. Explicit prohibition against computing accuracy, precision, or clinical claims."
            }
        }
    });

    let dto: ProvenanceOverviewDto =
        serde_json::from_value(raw).expect("Must deserialize provenance overview");
    assert_eq!(dto.status, "audited_and_isolated");
    assert_eq!(dto.sources.len(), 3);

    let oulad = dto.sources.get("oulad_research").expect("Must contain oulad_research");
    assert_eq!(oulad.record_count, Some(27466));
    assert_eq!(oulad.entity_type, "Student-Course Presentation Enrollment");
    assert!(oulad.licensing.contains("OGL v2.0"));

    let inst = dto.sources.get("institutional").expect("Must contain institutional");
    assert_eq!(inst.record_count, None);
    assert_eq!(inst.entity_type, "Enrolled Student Identity Profile");

    let synth = dto.sources.get("synthetic_demo").expect("Must contain synthetic_demo");
    assert_eq!(synth.record_count, Some(106));
    assert!(synth.isolation_rule.contains("fictional"));
}

#[test]
fn test_oulad_research_record_deserialization_and_provenance_safety() {
    let raw = json!({
        "source": "oulad_research",
        "record_identifier": "AAA-2013J-11391",
        "entity_type": "Student-Course Presentation Enrollment",
        "provenance_label": "OULAD 2015 Benchmark (OGL v2.0)",
        "licensing": "Open Government Licence v2.0 (OGL v2.0) — DOI 10.6084/m9.figshare.5081998.v1",
        "purpose": "Historical Academic Research & Benchmark Evaluation",
        "disclaimer": "Historical 2013-2014 Open University research record. Does NOT represent a live institutional student.",
        "enrollment_context": {
            "code_module": "AAA",
            "code_presentation": "2013J",
            "id_student": "11391"
        },
        "features": {
            "date_registration": -159,
            "num_prev_attempts": 0,
            "total_clicks": 934,
            "days_active": 18
        },
        "is_synthetic": false,
        "is_research": true,
        "is_institutional": false
    });

    let rec: ResearchRecordDto =
        serde_json::from_value(raw).expect("Must deserialize research record response");

    assert_eq!(rec.source, "oulad_research");
    assert_eq!(rec.record_identifier, "AAA-2013J-11391");
    assert_eq!(rec.is_institutional, false);
    assert_eq!(rec.is_research, true);
    assert_eq!(rec.is_synthetic, false);

    // Target leakage protection check
    assert!(!rec.features.contains_key("target"));
    assert!(!rec.features.contains_key("raw_final_result"));
    assert!(!rec.features.contains_key("final_result"));

    // Anti-confusion check: Disclaimer must clearly distance from live students
    assert!(rec.disclaimer.contains("NOT represent a live institutional student"));
    assert!(rec.licensing.contains("OGL v2.0"));
}

#[test]
fn test_synthetic_record_deserialization_and_disclaimer() {
    let raw = json!({
        "source": "synthetic_demo",
        "record_identifier": "SYNTH-BATCH-001",
        "entity_type": "Synthetic Demonstration Profile",
        "provenance_label": "SUTRA Synthetic Demonstration Fixture (Seed: 42)",
        "licensing": "MIT License / Project Internal Synthetic Fixture",
        "purpose": "Developer Testing, Pipeline Verification & Interactive Playground Demonstrations",
        "disclaimer": "Synthetic demonstration record. All entities and events are fictional. Expressly prohibited for clinical/academic claims.",
        "enrollment_context": {
            "notes": "Generated with seed 42"
        },
        "features": {
            "date_registration": -30,
            "total_clicks": 142
        },
        "is_synthetic": true,
        "is_research": false,
        "is_institutional": false
    });

    let rec: ResearchRecordDto =
        serde_json::from_value(raw).expect("Must deserialize synthetic record response");

    assert_eq!(rec.source, "synthetic_demo");
    assert_eq!(rec.is_institutional, false);
    assert_eq!(rec.is_synthetic, true);
    assert_eq!(rec.is_research, false);
    assert!(rec.disclaimer.contains("fictional"));
}

#[test]
fn test_strict_identifier_boundary_rules() {
    // 1. OULAD student IDs are historical integers (e.g., 11391, 28400)
    let oulad_student_id = "11391";
    assert!(
        Uuid::parse_str(oulad_student_id).is_err(),
        "OULAD id_student must NEVER be valid as a SUTRA UUID"
    );

    // 2. Synthetic IDs are prefixed strings (e.g. SYNTH-BATCH-001, SYN-1007)
    let synthetic_id = "SYNTH-BATCH-001";
    assert!(
        Uuid::parse_str(synthetic_id).is_err(),
        "Synthetic batch ID must NEVER be valid as a SUTRA UUID"
    );

    // 3. SUTRA Student IDs are valid UUID v4
    let institutional_id = Uuid::new_v4();
    assert_eq!(institutional_id.get_version_num(), 4);
    assert!(
        institutional_id.to_string().len() == 36,
        "Institutional UUID must be 36 characters"
    );
}

#[test]
fn test_compound_key_vs_student_id_isolation() {
    // Compound key contains module and presentation semester
    let compound_key = "AAA-2013J-11391";
    let parts: Vec<&str> = compound_key.split('-').collect();
    assert_eq!(parts.len(), 3);
    assert_eq!(parts[0], "AAA");
    assert_eq!(parts[1], "2013J");
    assert_eq!(parts[2], "11391");

    // Course presentation enrollment is not a student identity record
    assert_ne!(parts[2], compound_key);
}
