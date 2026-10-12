# SUTRA CLI — Phase 10 Report: Dataset Bridge and Data Provenance

**Phase**: Phase 10: Dataset Bridge and Data Provenance  
**Date**: October 12, 2026  
**Status**: Completed & Verified  
**Governance Framework**: SUTRA ADR-005 (Strict Three-Source Data Provenance Isolation)  

---

## 1. Executive Summary

Phase 10 establishes an explicit, auditable, and mathematically isolated boundary between the three disparate data sources utilized within the SUTRA ecosystem:
1. **Institutional Student Records** (Live campus registrar operational database).
2. **OULAD Research Records** (Historical 2013–2014 Open University Learning Analytics Benchmark).
3. **Synthetic Demonstration Records** (Fictional feature vectors and developer testing fixtures).

Prior to this phase, there was potential risk of conceptual confusion between research identifiers (such as OULAD's integer `id_student`) and institutional student references, or the temptation to implement automatic fallbacks between live student lookups and research data. 

Phase 10 eliminates these risks by:
- Verifying the exact schemas, row counts, and licensing provenance of all three sources.
- Proving that an OULAD research record represents a **course presentation enrollment**, not a student profile.
- Implementing dedicated, authenticated provenance and research lookup endpoints in FastAPI (`/api/v1/datasets/...`).
- Adding explicit CLI commands (`sutra datasets info` and `sutra datasets lookup --source <oulad|synthetic> <ID>`).
- Enforcing **Strict Isolation Invariants**: `sutra students get` **never** falls back to research or synthetic data; target outcomes are sanitized to prevent ML leakage; and non-institutional outputs are prominently watermarked with legal disclaimers and provenance metadata.

---

## 2. Dataset Audit & Schema Verification

All claims regarding datasets, schemas, and counts were audited and verified against the actual repository files.

### 2.1 Source 1: Institutional Student Records
- **Storage Location**: PostgreSQL / Supabase table `students` (managed via SQLAlchemy `Student` model in `app/models/student.py`).
- **Entity Type**: Single Enrolled Student Profile.
- **Key Schema**:
  - Primary Key: `id` (UUID v4)
  - Natural / Institutional Key: `external_ref` (string, e.g. `"S10243"`, `"SYN-1007"`)
  - Tenancy Constraint: `UniqueConstraint("institution_id", "external_ref")`
- **Fields**: `id`, `institution_id`, `external_ref`, `display_name`, `cohort_code`, `enrollment_status`, `created_at`, `updated_at`.
- **Isolation Boundary**: Scoped strictly to the authenticated caller's active campus tenancy (`institution_id`).

### 2.2 Source 2: OULAD Research Benchmark
- **Storage Location**: `ml/data/processed/day30_features.csv` (derived from raw clickstream tables in `ml/data/raw/`).
- **Audit Script & Verification Results**:
  - Total Records: **27,466** student-course presentation enrollments.
  - Unique Students (`id_student`): **24,787**.
  - Students with Multiple Enrollments: **2,559** (students enrolled in 2+ courses/presentations across 2013–2014).
  - Maximum Enrollments per Student: 5 enrollments.
  - Duplicate Compound Keys `(code_module, code_presentation, id_student)`: **0** (strictly unique).
- **Entity Type**: **Course Presentation Enrollment** (NOT an individual student profile). An OULAD row captures engagement within a specific course presentation (e.g. module `AAA`, presentation `2013J`).
- **Key Schema**: Compound Key `(code_module: str, code_presentation: str, id_student: int)`.
- **Columns**: 25 Day-30 early engagement features (e.g., `date_registration`, `vle_total_clicks_d30`, `assessments_submitted_d30`), plus target labels (`target`, `target_name`, `raw_final_result`).
- **Anti-Leakage Finding**: The backend dataset router strictly filters out `target`, `target_name`, and `raw_final_result` before serving feature vectors, guaranteeing zero target leakage into downstream inference.

### 2.3 Source 3: Synthetic Demonstration Records
- **Storage Location**: `docs/fixtures/demo_seed.json`, `ml/data/synthetic/synthetic_batch_100.json`.
- **Audit Verification Results**:
  - Total Records: **106** records (1 canonical seed vector + 100 batch evaluation records + 5 demographic archetype personas).
  - Seed Used: `42` (deterministic random generation).
- **Entity Type**: Synthetic Test Vector / Persona Archetype.
- **Key Schema**: `record_id` (e.g. `SYNTH-BATCH-001`) or fixture key (e.g. `SYN-1007`).
- **Purpose**: Software mechanics verification, schema contract testing, CLI smoke tests, and interactive playground demos without accessing live PII.

---

## 3. Data Source Comparison Matrix

| Property | Institutional Student Records | OULAD Research Benchmark | Synthetic Demo Fixtures |
| :--- | :--- | :--- | :--- |
| **Primary Source** | PostgreSQL `students` | `ml/data/processed/day30_features.csv` | `docs/fixtures/demo_seed.json` |
| **Entity Represented** | Real campus student profile | Course presentation enrollment | Fictional test persona |
| **Key Type** | UUID v4 PK, external ref | Compound: `(module, pres, id_student)` | Prefixed String (`SYNTH-BATCH-xxx`) |
| **Unique Across** | `(institution_id, external_ref)` | Module + Presentation + Student ID | Fixture Batch ID |
| **Entity Multiplicity**| 1 record per student | Multiple records per student possible | Fixed fixture test vectors |
| **Record Count** | Dynamic / Tenancy scoped | Exactly 27,466 | Exactly 106 |
| **Target Labels** | N/A (Live operational triage) | Stripped upon lookup (anti-leakage) | Non-causal mock scores |
| **Licensing** | Campus Proprietary / FERPA | Open Government Licence v2.0 (OGL) | MIT License / Internal Synthetic |
| **Query Command** | `sutra students get <ID>` | `sutra datasets lookup --source oulad` | `sutra datasets lookup --source synthetic` |

---

## 4. Source Identity & Isolation Rules (ADR-005)

1. **Identifier Incompatibility**:
   - OULAD `id_student` is a 4-to-7 digit integer from 2013 UK Open University records.
   - SUTRA institutional IDs are 36-character UUID v4 strings.
   - Synthetic IDs are string identifiers prefixed with `SYN-` or `SYNTH-`.
   - The system **never** attempts to cast, equate, or cross-match an OULAD `id_student` with a SUTRA institutional UUID.

2. **No Fallback in Operational Lookups**:
   - `sutra students get <ID>` and `GET /api/v1/students/{id}` query **only** the institutional `students` table partitioned by `campus_id`.
   - If an OULAD ID (e.g. `11391`) or synthetic ID (e.g. `SYNTH-BATCH-001`) is passed to `sutra students get`, the system returns `HTTP 404 Not Found`. It is architecturally prohibited from querying research or synthetic files as a fallback.

3. **No Automatic Database Ingestion**:
   - Neither OULAD rows nor synthetic fixtures are automatically inserted into the institutional `students` table.
   - Research records can only be loaded into an institutional tenancy through an authorized, audited registrar import pipeline.

4. **Explicit Research Lookup Only**:
   - Research and demo records can only be retrieved via dedicated, explicitly named endpoints (`GET /api/v1/datasets/research/{source}/{identifier}`) and CLI commands (`sutra datasets lookup --source <source> <id>`).

5. **Prominent Provenance Labeling & Watermarking**:
   - All research and synthetic responses explicitly contain:
     - `source`: `"oulad_research"` or `"synthetic_demo"`
     - `entity_type`: `"Student-Course Presentation Enrollment"` or `"Synthetic Demonstration Profile"`
     - `licensing`: Specific license declaration.
     - `disclaimer`: Explicit legal warning stating the record does **not** represent a live student and is prohibited for clinical/academic claims.
     - Boolean safety flags: `is_institutional: false`, `is_research: true/false`, `is_synthetic: true/false`.

---

## 5. Licensing & Provenance Findings

1. **Open University Learning Analytics Dataset (OULAD)**:
   - **Authors**: Martin Hlosta, Zdenek Zdrahal, Jakub Kuzilek (Open University, UK, 2015).
   - **Publication**: Scientific Data (Nature Publishing Group) / Figshare.
   - **DOI**: `10.6084/m9.figshare.5081998.v1`
   - **Licence**: **Open Government Licence v2.0 (OGL v2.0)** — Crown Copyright.
   - **Permitted Use**: Commercial and non-commercial research, transformation, and distribution, subject to attribution.
   - **Provenance Citation**: Maintained in `ml/data/processed/` and verified in schema responses.

2. **Synthetic Demonstration Fixtures**:
   - **Authors**: SUTRA Core Architecture Team.
   - **Licence**: MIT License.
   - **Seed**: Seed 42 (PRNG-generated mock clickstreams).
   - **Attribution & Caveats**: Fictional data; explicitly forbidden for model efficacy or clinical claims.

3. **Institutional Student Records**:
   - **Governance**: Institution-owned, FERPA / GDPR / campus privacy regulations apply.

---

## 6. Implementation Changes

### 6.1 Backend Schemas (`app/schemas/datasets.py`)
- `DataSourceProvenance`: Schema detailing name, entity type, key schema, count, storage, purpose, licensing, and isolation rule.
- `ProvenanceOverviewResponse`: Three-source provenance catalog.
- `ResearchRecordResponse`: Sanitized response containing `source`, `record_identifier`, `entity_type`, `provenance_label`, `licensing`, `purpose`, `disclaimer`, `enrollment_context`, `features`, and boolean safety flags (`is_institutional`, `is_research`, `is_synthetic`).

### 6.2 Backend API Router (`app/api/v1/datasets.py` & `app/api/v1/router.py`)
- Mounted `/api/v1/datasets` under API v1.
- `GET /api/v1/datasets/provenance`: Returns full governance overview.
- `GET /api/v1/datasets/research/oulad/{identifier}`:
  - Supports numeric `id_student` or compound `MODULE-PRESENTATION-ID`.
  - Looks up cached OULAD records.
  - Strips target columns to prevent leakage.
  - Injects OGL v2.0 disclaimer and enrollment context.
- `GET /api/v1/datasets/research/synthetic/{identifier}`:
  - Looks up synthetic fixtures from `demo_seed.json` and `synthetic_batch_100.json`.
  - Injects synthetic disclaimer and metadata.

### 6.3 Rust CLI Client & Models (`cli/src/models.rs`, `cli/src/client.rs`)
- Added DTOs: `DataSourceProvenanceDto`, `ProvenanceOverviewDto`, `ResearchRecordDto`.
- Added client methods:
  - `client.get_dataset_provenance()` -> calls `/datasets/provenance`.
  - `client.lookup_research_record(source, id, module, presentation)` -> calls `/datasets/research/{source}/{id}`.

### 6.4 Rust CLI Subcommands (`cli/src/commands/datasets.rs`, `cli/src/main.rs`)
- Registered `Datasets(DatasetsArgs)` subcommand with two actions:
  1. `sutra datasets info`: Displays tabular overview of the 3 data sources, key schemas, counts, licensing, and isolation invariants.
  2. `sutra datasets lookup --source <oulad|synthetic> <IDENTIFIER> [--module <CODE>] [--presentation <CODE>]`: Fetches and prints research/synthetic records with prominent yellow/red disclaimers and structured feature tables.

---

## 7. Verification & Test Suite

### 7.1 Backend Pytest Suite (`tests/test_datasets_provenance.py`)
6 dedicated test cases verifying:
1. `test_get_datasets_provenance_overview`: Validates presence of all 3 sources, exact counts, licensing strings, and ADR-005 framework.
2. `test_oulad_research_lookup_and_sanitization`: Verifies OULAD record retrieval (student `11391`), confirms 25 features are present, and confirms `target` / `raw_final_result` are stripped.
3. `test_oulad_research_compound_lookup`: Validates module-presentation disambiguation for multi-enrollment students.
4. `test_synthetic_demo_lookup`: Validates retrieval of `SYN-1007` and `SYNTH-BATCH-001` with synthetic disclaimers.
5. `test_research_lookup_not_found`: Validates 404 response for non-existent IDs.
6. `test_strict_isolation_institutional_never_falls_back`: Verifies that `GET /api/v1/students/11391` and `GET /api/v1/students/SYNTH-BATCH-001` return 404, strictly preventing cross-domain fallback.

**Result**: **110/110 passed** across the entire backend test suite.

### 7.2 Rust CLI Unit & DTO Suite (`cli/tests/dataset_tests.rs`)
5 dedicated test cases verifying:
1. `test_provenance_overview_deserialization`: Validates deserialization of 3 sources and record counts.
2. `test_oulad_research_record_deserialization_and_provenance_safety`: Confirms target anti-leakage and provenance disclaimers.
3. `test_synthetic_record_deserialization_and_disclaimer`: Confirms synthetic flag and disclaimer formatting.
4. `test_strict_identifier_boundary_rules`: Asserts that integer OULAD IDs and synthetic strings cannot parse as UUIDs.
5. `test_compound_key_vs_student_id_isolation`: Asserts compound key structure isolation.

**Result**: **43/43 passed** across all CLI test suites (9 CLI, 5 Dataset, 7 Predict, 9 Session, 7 Student, 6 Workflow).

### 7.3 Live CLI Terminal Verification
1. **`sutra datasets info`**:
   - Displayed all 3 sources, storage locations, and isolation invariants.
2. **`sutra datasets lookup --source oulad 11391`**:
   - Correctly resolved `AAA-2013J-11391`, printed enrollment context (module AAA, presentation 2013J), and printed 25 sanitized Day-30 features.
3. **`sutra datasets lookup --source synthetic SYNTH-BATCH-001`**:
   - Correctly returned synthetic batch record with seed-42 disclaimer.
4. **`sutra datasets lookup --source synthetic SYN-1007`**:
   - Correctly returned demo seed fixture vector.
5. **Isolation Test: `sutra students get 11391`**:
   - Exited with `Error: HTTP 404 Not Found: Student '11391' not found in active campus.`
   - Proved zero fallback from operational lookups into research data.
6. **Isolation Test: `sutra students get SYNTH-BATCH-001`**:
   - Exited with `Error: HTTP 404 Not Found: Student 'SYNTH-BATCH-001' not found in active campus.`
7. **Validation Test: `sutra datasets lookup --source invalid 11391`**:
   - Exited with clear error requiring `--source oulad` or `--source synthetic`.

---

## 8. Limitations & Governance Safeguards

1. **Read-Only Research Access**: Research dataset lookup is strictly read-only and cached in memory. It cannot create or mutate database state.
2. **No Clinical / High-Stakes Usage**: OULAD data represents historical 2013 UK higher education clickstreams. It is expressly prohibited from being used as a real-time clinical proxy for live students without calibrated local transfer validation.
3. **Multi-Enrollment Disambiguation**: For students enrolled in multiple course presentations in OULAD, callers can specify `--module` and `--presentation` flags to pinpoint the exact presentation. If omitted, the earliest presentation is safely returned with a list of available presentations.
4. **Target Leakage Prohibition**: In accordance with ML governance, training target columns (`target`, `target_name`, `raw_final_result`) are never exposed via the research API or CLI.

---

## 9. Conclusion

Phase 10 is complete. The boundary between institutional records, OULAD research records, and synthetic demonstration fixtures is formally codified, verified, and protected by automated tests in both Python and Rust.
