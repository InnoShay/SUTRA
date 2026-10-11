# SUTRA ML — OULAD DATA AUDIT & QUALITY REPORT (PHASE ONE)

**Dataset:** Open University Learning Analytics Dataset (OULAD)  
**Audit Status:** COMPLETE & VERIFIED  
**Scope:** Raw Dataset Inspection & Relational Integrity (No Modeling / No Snapshot Transformation)  

---

## 1. Dataset Provenance & Acquisition Verification

- **Official Website:** [https://analyse.kmi.open.ac.uk/open_dataset](https://analyse.kmi.open.ac.uk/open_dataset)
- **Official Figshare DOI:** `10.6084/m9.figshare.5081998.v1`
- **Direct Download Endpoint:** `https://ndownloader.figshare.com/files/8606371`
- **Official Archive MD5:** `7412686fd77cf0e0ee1e8c3e9b354308`
- **Computed Archive MD5:** `7412686fd77cf0e0ee1e8c3e9b354308` (Matches Official: **YES**)
- **Local SHA-256 Fingerprint:** `90dda45037939953f979072fa70a809ebe07e90ec783c408762af7698a3825ec`
- **Archive Size:** `46,750,706 bytes` (~44.58 MB)
- **Acquisition Timestamp:** `2026-10-11T17:38:36.147987+00:00`

---

## 2. Table Inventory & Row Counts

| Table Filename | Row Count | Column Count | Duplicate Rows | Memory Strategy |
| :--- | :--- | :--- | :--- | :--- |
| `courses.csv` | 22 | 3 | 0 | In-Memory Load |
| `studentInfo.csv` | 32,593 | 12 | 0 | In-Memory Load |
| `studentRegistration.csv` | 32,593 | 5 | 0 | In-Memory Load |
| `assessments.csv` | 206 | 6 | 0 | In-Memory Load |
| `studentAssessment.csv` | 173,912 | 5 | 0 | In-Memory Load |
| `vle.csv` | 6,364 | 6 | 0 | In-Memory Load |
| `studentVle.csv` | 10,655,280 | 6 | 0 | Streaming Chunks (200k) |

---

## 3. Granular Schema & Missingness Audit

### 3.1 Table: `courses.csv`
- **Total Rows:** 22 | **Total Columns:** 3
- **Key Assessment:** Primary key ['code_module', 'code_presentation'] is strictly UNIQUE (22 unique keys).

| Column Name | Dtype | Non-Null Count | Null Count | Null % | Unique Count | Min / Max (Numeric) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `code_module` | `object` | 22 | 0 | 0.00% | 7 | - |
| `code_presentation` | `object` | 22 | 0 | 0.00% | 4 | - |
| `module_presentation_length` | `int64` | 22 | 0 | 0.00% | 7 | [234.0, 269.0] |

**Observed Category Distributions:**

- **`code_module`**:
  - `BBB`: 4 (18.18%)
  - `DDD`: 4 (18.18%)
  - `FFF`: 4 (18.18%)
  - `EEE`: 3 (13.64%)
  - `GGG`: 3 (13.64%)
  - `AAA`: 2 (9.09%)
  - `CCC`: 2 (9.09%)
- **`code_presentation`**:
  - `2014J`: 7 (31.82%)
  - `2013J`: 6 (27.27%)
  - `2014B`: 6 (27.27%)
  - `2013B`: 3 (13.64%)
- **`module_presentation_length`**:
  - `269`: 5 (22.73%)
  - `241`: 5 (22.73%)
  - `268`: 4 (18.18%)
  - `240`: 3 (13.64%)
  - `262`: 2 (9.09%)
  - `261`: 2 (9.09%)
  - `234`: 1 (4.55%)

### 3.2 Table: `studentInfo.csv`
- **Total Rows:** 32,593 | **Total Columns:** 12
- **Key Assessment:** Primary key ['code_module', 'code_presentation', 'id_student'] is strictly UNIQUE (32593 unique keys).

| Column Name | Dtype | Non-Null Count | Null Count | Null % | Unique Count | Min / Max (Numeric) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `code_module` | `object` | 32,593 | 0 | 0.00% | 7 | - |
| `code_presentation` | `object` | 32,593 | 0 | 0.00% | 4 | - |
| `id_student` | `int64` | 32,593 | 0 | 0.00% | 28,785 | [3733.0, 2716795.0] |
| `gender` | `object` | 32,593 | 0 | 0.00% | 2 | - |
| `region` | `object` | 32,593 | 0 | 0.00% | 13 | - |
| `highest_education` | `object` | 32,593 | 0 | 0.00% | 5 | - |
| `imd_band` | `object` | 31,482 | 1,111 | 3.41% | 10 | - |
| `age_band` | `object` | 32,593 | 0 | 0.00% | 3 | - |
| `num_of_prev_attempts` | `int64` | 32,593 | 0 | 0.00% | 7 | [0.0, 6.0] |
| `studied_credits` | `int64` | 32,593 | 0 | 0.00% | 61 | [30.0, 655.0] |
| `disability` | `object` | 32,593 | 0 | 0.00% | 2 | - |
| `final_result` | `object` | 32,593 | 0 | 0.00% | 4 | - |

**Observed Category Distributions:**

- **`code_module`**:
  - `BBB`: 7,909 (24.27%)
  - `FFF`: 7,762 (23.81%)
  - `DDD`: 6,272 (19.24%)
  - `CCC`: 4,434 (13.60%)
  - `EEE`: 2,934 (9.00%)
  - `GGG`: 2,534 (7.77%)
  - `AAA`: 748 (2.29%)
- **`code_presentation`**:
  - `2014J`: 11,260 (34.55%)
  - `2013J`: 8,845 (27.14%)
  - `2014B`: 7,804 (23.94%)
  - `2013B`: 4,684 (14.37%)
- **`gender`**:
  - `M`: 17,875 (54.84%)
  - `F`: 14,718 (45.16%)
- **`region`**:
  - `Scotland`: 3,446 (10.57%)
  - `East Anglian Region`: 3,340 (10.25%)
  - `London Region`: 3,216 (9.87%)
  - `South Region`: 3,092 (9.49%)
  - `North Western Region`: 2,906 (8.92%)
  - `West Midlands Region`: 2,582 (7.92%)
  - `South West Region`: 2,436 (7.47%)
  - `East Midlands Region`: 2,365 (7.26%)
  - `South East Region`: 2,111 (6.48%)
  - `Wales`: 2,086 (6.40%)
  - `Yorkshire Region`: 2,006 (6.15%)
  - `North Region`: 1,823 (5.59%)
  - `Ireland`: 1,184 (3.63%)
- **`highest_education`**:
  - `A Level or Equivalent`: 14,045 (43.09%)
  - `Lower Than A Level`: 13,158 (40.37%)
  - `HE Qualification`: 4,730 (14.51%)
  - `No Formal quals`: 347 (1.06%)
  - `Post Graduate Qualification`: 313 (0.96%)
- **`imd_band`**:
  - `20-30%`: 3,654 (11.21%)
  - `30-40%`: 3,539 (10.86%)
  - `10-20`: 3,516 (10.79%)
  - `0-10%`: 3,311 (10.16%)
  - `40-50%`: 3,256 (9.99%)
  - `50-60%`: 3,124 (9.58%)
  - `60-70%`: 2,905 (8.91%)
  - `70-80%`: 2,879 (8.83%)
  - `80-90%`: 2,762 (8.47%)
  - `90-100%`: 2,536 (7.78%)
  - `nan`: 1,111 (3.41%)
- **`age_band`**:
  - `0-35`: 22,944 (70.40%)
  - `35-55`: 9,433 (28.94%)
  - `55<=`: 216 (0.66%)
- **`num_of_prev_attempts`**:
  - `0`: 28,421 (87.20%)
  - `1`: 3,299 (10.12%)
  - `2`: 675 (2.07%)
  - `3`: 142 (0.44%)
  - `4`: 39 (0.12%)
  - `5`: 13 (0.04%)
  - `6`: 4 (0.01%)
- **`disability`**:
  - `N`: 29,429 (90.29%)
  - `Y`: 3,164 (9.71%)
- **`final_result`**:
  - `Pass`: 12,361 (37.93%)
  - `Withdrawn`: 10,156 (31.16%)
  - `Fail`: 7,052 (21.64%)
  - `Distinction`: 3,024 (9.28%)

### 3.3 Table: `studentRegistration.csv`
- **Total Rows:** 32,593 | **Total Columns:** 5

| Column Name | Dtype | Non-Null Count | Null Count | Null % | Unique Count | Min / Max (Numeric) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `code_module` | `object` | 32,593 | 0 | 0.00% | 7 | - |
| `code_presentation` | `object` | 32,593 | 0 | 0.00% | 4 | - |
| `id_student` | `int64` | 32,593 | 0 | 0.00% | 28,785 | [3733.0, 2716795.0] |
| `date_registration` | `float64` | 32,548 | 45 | 0.14% | 332 | [-322.0, 167.0] |
| `date_unregistration` | `float64` | 10,072 | 22,521 | 69.10% | 416 | [-365.0, 444.0] |

**Observed Category Distributions:**

- **`code_module`**:
  - `BBB`: 7,909 (24.27%)
  - `FFF`: 7,762 (23.81%)
  - `DDD`: 6,272 (19.24%)
  - `CCC`: 4,434 (13.60%)
  - `EEE`: 2,934 (9.00%)
  - `GGG`: 2,534 (7.77%)
  - `AAA`: 748 (2.29%)
- **`code_presentation`**:
  - `2014J`: 11,260 (34.55%)
  - `2013J`: 8,845 (27.14%)
  - `2014B`: 7,804 (23.94%)
  - `2013B`: 4,684 (14.37%)

**Observed Relative Date Ranges (Days relative to course start):**
- `date_registration`: Min = -322.0 days, Max = 167.0 days
- `date_unregistration`: Min = -365.0 days, Max = 444.0 days

### 3.4 Table: `assessments.csv`
- **Total Rows:** 206 | **Total Columns:** 6
- **Key Assessment:** Primary key ['id_assessment'] is strictly UNIQUE (206 unique keys).

| Column Name | Dtype | Non-Null Count | Null Count | Null % | Unique Count | Min / Max (Numeric) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `code_module` | `object` | 206 | 0 | 0.00% | 7 | - |
| `code_presentation` | `object` | 206 | 0 | 0.00% | 4 | - |
| `id_assessment` | `int64` | 206 | 0 | 0.00% | 206 | [1752.0, 40088.0] |
| `assessment_type` | `object` | 206 | 0 | 0.00% | 3 | - |
| `date` | `float64` | 195 | 11 | 5.34% | 74 | [12.0, 261.0] |
| `weight` | `float64` | 206 | 0 | 0.00% | 24 | [0.0, 100.0] |

**Observed Category Distributions:**

- **`code_module`**:
  - `FFF`: 52 (25.24%)
  - `BBB`: 42 (20.39%)
  - `DDD`: 35 (16.99%)
  - `GGG`: 30 (14.56%)
  - `CCC`: 20 (9.71%)
  - `EEE`: 15 (7.28%)
  - `AAA`: 12 (5.83%)
- **`code_presentation`**:
  - `2014J`: 57 (27.67%)
  - `2014B`: 57 (27.67%)
  - `2013J`: 53 (25.73%)
  - `2013B`: 39 (18.93%)
- **`assessment_type`**:
  - `TMA`: 106 (51.46%)
  - `CMA`: 76 (36.89%)
  - `Exam`: 24 (11.65%)

**Observed Relative Date Ranges (Days relative to course start):**
- `date`: Min = 12.0 days, Max = 261.0 days

### 3.5 Table: `studentAssessment.csv`
- **Total Rows:** 173,912 | **Total Columns:** 5

| Column Name | Dtype | Non-Null Count | Null Count | Null % | Unique Count | Min / Max (Numeric) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id_assessment` | `int64` | 173,912 | 0 | 0.00% | 188 | [1752.0, 37443.0] |
| `id_student` | `int64` | 173,912 | 0 | 0.00% | 23,369 | [6516.0, 2698588.0] |
| `date_submitted` | `int64` | 173,912 | 0 | 0.00% | 312 | [-11.0, 608.0] |
| `is_banked` | `int64` | 173,912 | 0 | 0.00% | 2 | [0.0, 1.0] |
| `score` | `float64` | 173,739 | 173 | 0.10% | 101 | [0.0, 100.0] |

**Observed Category Distributions:**

- **`is_banked`**:
  - `0`: 172,003 (98.90%)
  - `1`: 1,909 (1.10%)

**Observed Relative Date Ranges (Days relative to course start):**
- `date_submitted`: Min = -11.0 days, Max = 608.0 days

### 3.6 Table: `vle.csv`
- **Total Rows:** 6,364 | **Total Columns:** 6
- **Key Assessment:** Primary key ['id_site'] is strictly UNIQUE (6364 unique keys).

| Column Name | Dtype | Non-Null Count | Null Count | Null % | Unique Count | Min / Max (Numeric) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `id_site` | `int64` | 6,364 | 0 | 0.00% | 6,364 | [526721.0, 1077905.0] |
| `code_module` | `object` | 6,364 | 0 | 0.00% | 7 | - |
| `code_presentation` | `object` | 6,364 | 0 | 0.00% | 4 | - |
| `activity_type` | `object` | 6,364 | 0 | 0.00% | 20 | - |
| `week_from` | `float64` | 1,121 | 5,243 | 82.39% | 30 | [0.0, 29.0] |
| `week_to` | `float64` | 1,121 | 5,243 | 82.39% | 30 | [0.0, 29.0] |

**Observed Category Distributions:**

- **`code_module`**:
  - `FFF`: 1,967 (30.91%)
  - `DDD`: 1,708 (26.84%)
  - `BBB`: 1,154 (18.13%)
  - `CCC`: 419 (6.58%)
  - `AAA`: 413 (6.49%)
  - `GGG`: 367 (5.77%)
  - `EEE`: 336 (5.28%)
- **`code_presentation`**:
  - `2013J`: 1,772 (27.84%)
  - `2014B`: 1,671 (26.26%)
  - `2014J`: 1,670 (26.24%)
  - `2013B`: 1,251 (19.66%)

### 3.7 Table: `studentVle.csv`
- **Total Rows:** 10,655,280 | **Total Columns:** 6
- **Key Assessment:** Processed via streaming chunk iterator (chunk_size=200,000).
- **Key Assessment:** Unique active interacting students in logs: 26,074
- **Key Assessment:** Unique VLE sites accessed in logs: 6,268
- **Key Assessment:** Modules present: ['AAA', 'BBB', 'CCC', 'DDD', 'EEE', 'FFF', 'GGG']

| Column Name | Dtype | Non-Null Count | Null Count | Null % | Unique Count | Min / Max (Numeric) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `code_module` | `object` | 10,655,280 | 0 | 0.00% | 7 | - |
| `code_presentation` | `object` | 10,655,280 | 0 | 0.00% | N/A | - |
| `id_student` | `int64` | 10,655,280 | 0 | 0.00% | 26,074 | [6516.0, 2698588.0] |
| `id_site` | `int64` | 10,655,280 | 0 | 0.00% | 6,268 | [526721.0, 1049562.0] |
| `date` | `int64` | 10,655,280 | 0 | 0.00% | N/A | [-25.0, 269.0] |
| `sum_click` | `int64` | 10,655,280 | 0 | 0.00% | N/A | [1.0, 6977.0] |

**Observed Relative Date Ranges (Days relative to course start):**
- `date`: Min = -25.0 days, Max = 269.0 days

---

## 4. Referential Integrity & Relational Verification

| Relationship / Check | Status | Verification Details |
| :--- | :--- | :--- |
| studentRegistration (code_module, code_presentation) -> courses | **PASSED** | Passed: all module-presentations exist in courses. |
| studentInfo (code_module, code_presentation) -> courses | **PASSED** | Passed: all module-presentations exist in courses. |
| studentAssessment (id_assessment) -> assessments | **PASSED** | Passed: all assessment IDs exist in assessments table. |
| Population alignment: studentRegistration <-> studentInfo | **PASSED** | Keys in registration but not info: 0. Keys in info but not registration: 0. |

---

## 5. Raw Outcome Distribution Warning

> [!IMPORTANT]
> The outcome counts below represent the **unfiltered raw historical records** across all 22 course presentations in `studentInfo.csv`. They do **NOT** represent the class balance of the final Day-30 active cohort. Construction of the active cohort and target filtering ($y \in \{0, 1\}$) is strictly reserved for Phase Two.

| Raw Label | Raw Total | Raw % | Operational Interpretation |
| :--- | :--- | :--- | :--- |
| `Pass` | 12,361 | 37.93% | Standard completion (Negative / Safe class in Exp 1) |
| `Withdrawn` | 10,156 | 31.16% | Withdrew (Includes both pre-course and mid-course dropouts) |
| `Fail` | 7,052 | 21.64% | Completed coursework but failed (Positive / At-Risk class) |
| `Distinction` | 3,024 | 9.28% | High-performing completion (Negative / Safe class in Exp 1) |

---

## 6. Processing Limitations & Unresolved Data Questions

1. **Assessment Score Availability Timing:** In studentAssessment.csv, date_submitted records when the student uploaded work, but there is no date_graded column. The tutor score availability time cannot be assumed to equal the submission date.
1. **Assessment Cutoff Date Variations:** Some presentations lack formal assessments prior to Day 30 (e.g. initial TMA scheduled for Day 40), requiring robust missingness handling during feature engineering.
1. **VLE Activity Timestamp Semantics:** Negative dates (e.g., date = -20) represent pre-course access; positive dates represent in-course access. Aggregation pipelines must explicitly account for the negative date domain.
1. **Multiple Enrollments:** A single id_student can appear in multiple course presentations. Models must use grouped splitting to prevent cross-split leakage.

---

## 7. Audit Command & Reproducibility

To reproduce this exact audit report from the workspace root:
```bash
python3 ml/pipelines/run_audit.py
```

To run automated data-quality and loader tests:
```bash
PYTHONPATH=ml/src python3 -m pytest ml/tests
```
