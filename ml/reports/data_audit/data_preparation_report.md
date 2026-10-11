# SUTRA ML — DATA PREPARATION & TEMPORAL SNAPSHOT REPORT (PHASE TWO)

**Dataset:** Open University Learning Analytics Dataset (OULAD)  
**Experiment:** Day-30 Academic Early-Warning Snapshot  
**Status:** COMPLETE & VERIFIED  
**Scope:** Active Cohort Filtering, Leakage-Free Feature Engineering & Binary Target Construction  

---

## 1. Raw Source Tables Used

- `studentInfo.csv`: Demographics and final course results.
- `studentRegistration.csv`: Registration and unregistration relative day offsets.
- `vle.csv`: Virtual Learning Environment activity site metadata.
- `studentVle.csv`: Daily VLE student interaction logs (10.6M records streamed and filtered).
- `assessments.csv`: Assessment structure, types, and module presentation links.
- `studentAssessment.csv`: Submission dates and banking flags.

---

## 2. Cohort Eligibility & Exclusion Rules

### Prediction Population Rule:
> **Eligible Active Students:** Students who remained registered as of Day 30:
> `date_unregistration IS NULL OR date_unregistration > 30`

> **Excluded Students:** Students who withdrew on or before Day 30:
> `date_unregistration <= 30`

### Methodological Rationale:
Students who withdrew before Day 30 are no longer enrolled when the early-warning model makes its prediction. Including them would introduce survivor bias and artificial predictability (predicting withdrawal for students who already departed). SUTRA aims to identify at-risk students among those still actively attending at Day 30 to enable proactive tutor intervention.

### Observed Cohort Partitioning:
- **Total Raw Registrations:** 32,593
- **Excluded Pre-Cutoff Withdrawals:** 5,127 (15.73%)
- **Active Day-30 Cohort Size:** **27,466** (84.27%)
- **Unique Individual Students in Cohort:** 24,787

| Partition | Total Count | % of Raw Total | Breakdown by Final Result |
| :--- | :--- | :--- | :--- |
| **Excluded** ($t \le 30$) | 5,127 | 15.73% | `Withdrawn`: 5,119, `Fail`: 8 |
| **Active Cohort** ($t > 30$) | **27,466** | 84.27% | `Pass`: 12,361, `Fail`: 7,044, `Withdrawn`: 5,037, `Distinction`: 3,024 |

---

## 3. Target Class Formulation & Distribution

### Formulation:
- **Positive Class ($y=1$, At-Risk):** `final_result` $\in$ `['Fail', 'Withdrawn']`
- **Negative Class ($y=0$, On-Track):** `final_result` $\in$ `['Pass', 'Distinction']`

### Verified Class Balance in Day-30 Active Cohort:

| Binary Target | Class Label | Cohort Count | Percentage | Operational Meaning |
| :--- | :--- | :--- | :--- | :--- |
| **`1`** | **At-Risk** | **12,081** | **43.99%** | Student later fails or withdraws mid-semester |
| **`0`** | **On-Track** | **15,385** | **56.01%** | Student completes module with Pass or Distinction |
| **Total** | - | **27,466** | **100.00%** | Active population eligible for support |

Detailed composition of At-Risk class ($y=1$):
- Course Failures: `7,044` (25.65%)
- Post-Cutoff Withdrawals: `5,037` (18.34%)

---

## 4. Final Feature Set & Temporal Availability Matrix

| Feature Identifier | Category | Source Table & Logic | Availability Time | Null Imputation / Missing Strategy |
| :--- | :--- | :--- | :--- | :--- |
| `num_of_prev_attempts` | Demographic | `studentInfo.csv` | Enrollment ($t \le 0$) | Integer, no nulls |
| `studied_credits` | Academic Load | `studentInfo.csv` | Enrollment ($t \le 0$) | Integer, no nulls |
| `gender` | Demographic | `studentInfo.csv` | Enrollment ($t \le 0$) | Categorical, no nulls |
| `region` | Demographic | `studentInfo.csv` | Enrollment ($t \le 0$) | Categorical, no nulls |
| `highest_education` | Prior Attainment | `studentInfo.csv` | Enrollment ($t \le 0$) | Categorical, no nulls |
| `imd_band` | Socioeconomic | `studentInfo.csv` | Enrollment ($t \le 0$) | Missing (3.4%) imputed with `'Unknown'` |
| `age_band` | Demographic | `studentInfo.csv` | Enrollment ($t \le 0$) | Categorical, no nulls |
| `disability` | Demographic | `studentInfo.csv` | Enrollment ($t \le 0$) | Categorical, no nulls |
| `days_registered_before_start` | Registration | `studentRegistration.date_registration` | Pre-course ($t \le 0$) | Median imputed (-57.0d) if missing |
| `has_missing_registration_date`| Registration | Indicator for missing `date_registration` | Pre-course ($t \le 0$) | Binary flag (`0` or `1`) |
| `vle_total_clicks_d30` | Engagement | `studentVle.csv` ($\sum \text{sum\_click}$ for $t \le 30$) | Days $-30$ to $30$ | Filled with `0` for unengaged |
| `vle_active_days_d30` | Engagement | `studentVle.csv` ($\text{COUNT(DISTINCT date)}$ for $t \le 30$) | Days $-30$ to $30$ | Filled with `0` for unengaged |
| `vle_clicks_precourse` | Orientation | `studentVle.csv` ($\sum \text{sum\_click}$ for $t < 0$) | Days $-30$ to $0$ | Filled with `0` for unengaged |
| `vle_clicks_poststart_d30` | Early Study | `studentVle.csv` ($\sum \text{sum\_click}$ for $0 \le t \le 30$) | Days $0$ to $30$ | Filled with `0` for unengaged |
| `vle_clicks_last_7d` | Velocity | `studentVle.csv` ($\sum \text{sum\_click}$ for $23 < t \le 30$) | Days $24$ to $30$ | Filled with `0` for unengaged |
| `vle_days_since_last_click` | Recency | $30 - \max(t)$ for $t \le 30$ | Day $30$ | Ceiling at `60.0` for unengaged |
| `vle_clicks_forumng_d30` | Social/Peer | Clicks on forum sites ($t \le 30$) | Days $-30$ to $30$ | Filled with `0` |
| `vle_clicks_oucontent_d30`| Content Study | Clicks on core content ($t \le 30$) | Days $-30$ to $30$ | Filled with `0` |
| `vle_clicks_quiz_d30` | Self-Assessment | Clicks on quiz modules ($t \le 30$) | Days $-30$ to $30$ | Filled with `0` |
| `vle_clicks_homepage_d30`| Navigation | Clicks on course homepage ($t \le 30$) | Days $-30$ to $30$ | Filled with `0` |
| `vle_clicks_other_d30` | Supplementary | Clicks on all other VLE resources ($t \le 30$) | Days $-30$ to $30$ | Filled with `0` |
| `has_vle_activity_d30` | Engagement | Indicator if student accessed VLE by Day $30$ | Day $30$ | Binary flag (`1` if clicks > 0 else `0`) |
| `assessments_submitted_d30` | Formative | Count of submissions with $\text{date\_sub} \le 30$ | Up to Day $30$ | Filled with `0` if no submissions |
| `assessment_banked_d30` | Prior Credit | Count of banked submissions with $\text{date\_sub} \le 30$ | Up to Day $30$ | Filled with `0` |
| `has_early_assessment_submission_d30`| Formative | Indicator if student submitted work by Day $30$ | Up to Day $30$ | Binary flag (`1` or `0`) |

---

## 5. Temporal Availability Policy & Unresolved Limitations

### 5.1 Assessment Scores Excluded:
> [!IMPORTANT]
> **Scores are deliberately omitted from the feature matrix.** While `studentAssessment.csv` records `date_submitted`, it provides **no grade publication timestamp**. Assuming instant grading turnaround at Day 30 would leak feedback that tutors did not actually possess. We only use submission timestamps (`date_submitted <= 30`), submission counts, and banking flags.

### 5.2 Negative Dates Policy:
> [!NOTE]
> OULAD includes VLE activity from the orientation period (up to 25 days before official course start, $t \in [-25, -1]$). These records are **preserved and categorized**: overall metrics (`total_clicks`, `active_days`) encompass all activity $t \le 30$, and `vle_clicks_precourse` explicitly isolates pre-course onboarding engagement.

### 5.3 Leakage Prevention Proofs:
1. **Pre-aggregation before join:** All 10.6M `studentVle` rows are filtered to $t \le 30$ during chunk streaming and aggregated to `(code_module, code_presentation, id_student)` before joining.
2. **Zero Row Explosion:** Exactly 1 row per active student-course presentation (**27,466 rows**).
3. **Post-cutoff unregistration dates discarded:** `date_unregistration` was used strictly to filter the cohort and is completely dropped from the predictor matrix.
4. **Target separation:** `final_result` is mapped to `target` in a decoupled module and excluded from the feature columns.

---

## 6. Output Artifacts & Dataset Verification

- **Primary CSV Dataset:** `/Users/neemaysmac/Desktop/Sutra/ml/data/processed/day30_features.csv` (3.72 MB)
- **Parquet Dataset:** *Omitted (pyarrow/fastparquet engine not installed in environment; CSV format is primary)*
- **Total Rows:** 27,466 | **Total Feature Columns:** 25

---

## 7. Command to Reproduce

```bash
python3 ml/pipelines/run_prep.py
PYTHONPATH=ml/src python3 -m pytest ml/tests
```
