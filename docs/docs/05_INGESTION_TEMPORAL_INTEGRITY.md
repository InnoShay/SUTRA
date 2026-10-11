# 05 · Ingestion, Data Quality, and Temporal Integrity

## 1. Multi-Source Ingestion Boundary

SUTRA ingests observations across the six PS6 educational categories:
1. **Attendance:** Class/session attendance ratios, absences, and date ranges.
2. **Academic Performance:** Assignment submissions, assessments, and grade release indicators.
3. **Engagement / LMS Activity:** Virtual Learning Environment (VLE) interactions, active study days, and recency.
4. **Fee Support (Restricted):** Institutional fee clearance and financial aid status (segregated in `finance_observations`).
5. **Skills & Competencies:** Rubric-assessed practical milestones and competency levels.
6. **Faculty Feedback:** Structured qualitative concerns submitted by course instructors.

All sources ingest through neutral CSV/JSON schema contracts (`POST /api/v1/imports`). External LMS/SIS connectors (e.g. EduEagle) map directly into this normalized internal representation.

---

## 2. Normalized Observation Contract

```json
{
  "institution_id": "00000000-0000-4000-8000-000000000001",
  "external_student_ref": "SYN-1007",
  "domain": "academic",
  "metric_key": "assessment_submission_count",
  "value": 3.0,
  "unit": "count",
  "quality_state": "sufficient",
  "event_at": "2026-10-02T14:30:00Z",
  "available_at": "2026-10-03T09:00:00Z",
  "source_system": "canvas_lms_v2",
  "source_record_ref": "sub_98124"
}
```

---

## 3. The Four Critical Timestamps (Anti-Leakage Safeguards)

To eliminate data leakage, SUTRA enforces strict separation between four distinct timestamps:
- `event_at`: The exact UTC timestamp when the underlying physical event occurred (e.g., student submitted assignment, class was held).
- `available_at`: The exact UTC timestamp when the record became available to decision-makers or the system (e.g., instructor published grades, attendance register was finalized).
- `ingested_at`: The exact UTC timestamp when SUTRA received and persisted the record (set server-side; cannot be backdated).
- `decision_at`: The exact UTC timestamp when a policy rule evaluation or ML inference run was executed.

> [!CRITICAL]
> **Temporal Integrity Rule:** An observation is eligible for an evaluation as-of cutoff $T$ **if and only if `available_at <= T`**.  
> If `available_at` is unrecorded or unknown, the system must treat the data as indeterminate and must **never** silently substitute `event_at`.

---

## 4. The 2026 OULAD Leakage Finding & Architectural Response

Recent educational data mining literature demonstrates that published models evaluated on the Open University Learning Analytics Dataset (OULAD) suffered from severe **future-information leakage**:
1. Evaluating VLE clicks or assessment grades recorded *after* the early-warning prediction window ($t > 30$).
2. Including post-cutoff course withdrawal dates (`date_unregistration > 30`) as predictors.
3. Leaking assessment feedback scores that were graded weeks after the prediction cutoff.

### SUTRA's Verified Safeguards:
- **Hard Temporal Cutoff:** All 10.6M raw VLE interaction logs are chunk-filtered at $t \le 30$ days before feature aggregation.
- **Score Exclusion:** While early assessment submissions (`date_submitted <= 30`) are counted, scores are excluded because OULAD records no grade publication timestamp (`date_graded`). Assuming instant grade availability leaks future feedback.
- **Pre-Cutoff Cohort Filtering:** Students who withdrew before Day 30 ($t \le 30$) are completely excluded from the prediction population to prevent survivor bias.

---

## 5. Missing Data Policy: Never Impute Silent Zeroes

A fundamental product rule of SUTRA is:
> **Missing or stale data equals `unknown` or `insufficient_evidence` — NEVER a silent zero.**

- If attendance logs have not synced for 14 days, the student's status is `stale_source` or `insufficient_evidence`. It must **never** be imputed as 0% attendance.
- If a student has zero clicks because the LMS tracking was offline, the system marks the indicator as `quality_state: missing`.
- Rules requiring missing evidence return `unknown`, prompting human educators to investigate data connectivity before jumping to adverse student conclusions.

---

## 6. Import Pipeline Execution & Error Handling

1. **Batch Receipt:** `POST /api/v1/imports` creates a `source_imports` row with SHA256 payload digest.
2. **Schema & Range Validation:** Validates domains, units, numeric bounds, and date chronology (`event_at <= available_at`).
3. **Student Reference Resolution:** Matches `external_student_ref` within the campus. Unmatched references generate row errors (`UNKNOWN_STUDENT_REFERENCE`); real student records are never auto-created from unverified imports.
4. **Deduplication:** Dedupes rows using unique key `(institution_id, source_system, source_record_ref)`.
5. **Transactional Persistence:** Valid rows are inserted; invalid rows are recorded in `source_imports.error_details`.
6. **Status Finalization:** The batch completes as `completed`, `completed_with_errors`, or `failed`.
