# 09 · Outcomes, Audit Logging & Cohort Analytics

## 1. Distinct Delivery Stages (Activity is Not Impact)

A core tenet of SUTRA is that **activity must never be conflated with student success**:
- Sending an email notification is **not** proof the student read it.
- Booking an appointment is **not** proof the session occurred.
- Delivering a tutoring session is **not** proof the student improved.
- A later grade increase does **not** prove the intervention caused it.

### The Nine Explicit Milestones:
1. `action_offered`: System or reviewer proposes an intervention.
2. `action_approved`: Authorized reviewer formally approves the intervention.
3. `action_assigned`: Coordinator assigns the case to an accountable owner.
4. `owner_accepted`: Owner explicitly acknowledges responsibility.
5. `contact_attempted`: Initial outreach logged (call, email, in-person query).
6. `student_reached`: Student verified as reached under an accepted proof standard.
7. `support_delivered`: The agreed intervention activity took place.
8. `follow_up_completed`: Required post-intervention follow-up milestone reached.
9. `outcome_known`: Reviewer recorded a validated non-unknown outcome.

---

## 2. Standardized Outcome Vocabulary

Every concluded case requires an outcome recorded in `case_outcomes`:
- **`helped`:** Documented evidence demonstrates the student improved or resolved the specific challenge within the observation window.
- **`not_helped`:** The support was delivered, but available evidence indicates no improvement or ongoing decline.
- **`mixed`:** Partial improvement observed alongside unresolved risk indicators.
- **`unknown`:** Insufficient evidence, student unresponsive, follow-up window pending, or outcome cannot be established.

> [!IMPORTANT]
> **Unknown is a Valid & Mandatory State:** If evidence is lacking or inconclusive, the outcome **must remain `unknown`**. It is strictly forbidden to default missing outcomes to `helped` or `not_helped`, or to exclude `unknown` cases from denominators.

---

## 3. Append-Only Audit Event Schema

Every consequential mutation inserts an immutable record into `case_events`:

```json
{
  "id": "01HP89B00123456789ABCDEF01",
  "institution_id": "00000000-0000-4000-8000-000000000001",
  "case_id": "01HP89A9988776655443322110",
  "event_type": "OWNER_ASSIGNED",
  "actor_user_id": "00000000-0000-4000-8000-000000000102",
  "occurred_at": "2026-10-12T10:00:00Z",
  "previous_state": "action_planned",
  "new_state": "assigned",
  "reason_code": "ROUTINE_MENTOR_ALLOCATION",
  "idempotency_key": "idem_assign_998822",
  "request_id": "req_01HP89ABC1234XYZ",
  "metadata": {
    "assigned_to_user_id": "00000000-0000-4000-8000-000000000101",
    "due_at": "2026-10-14T10:00:00Z"
  }
}
```

Audit records are strictly append-only; standard database roles possess zero `UPDATE` or `DELETE` grants on `case_events`.

---

## 4. Denominator-Defined Cohort Metrics

All operational and cohort analytics returned by `GET /api/v1/analytics/*` define explicit mathematical numerators and denominators:

| Metric Name | Numerator | Denominator | Definition Version |
|---|---|---|---|
| **Approval Rate** | Count of signals where `decision = 'approve'` or `'modify'` | Total signals reviewed in window | `v1.0` |
| **Owner Acceptance Coverage** | Cases where state transitioned to `accepted` | Total cases assigned to an owner | `v1.0` |
| **First-Contact Coverage** | Cases with at least one recorded `contact_attempted` | Total accepted cases past contact due date | `v1.0` |
| **Student Reach Rate** | Cases with `student_reached` verified proof | Total cases where contact was attempted | `v1.0` |
| **Support Delivery Rate** | Cases with `support_delivered` recorded | Total cases where student was reached | `v1.0` |
| **Overdue Task Burden** | Open tasks past `due_at` | Total open tasks | `v1.0` |
| **Outcome-Known Coverage** | Cases with outcome $\in$ `['helped', 'not_helped', 'mixed']` | Total cases reaching follow-up window end | `v1.0` |
| **Reported Help Rate** | Cases with `outcome_status = 'helped'` | Cases with known outcomes (`helped` + `not_helped` + `mixed`) | `v1.0` |
| **Median Time to Acceptance** | Median duration (`assigned_at` to `accepted_at`) in hours | Cases with accepted ownership | `v1.0` |

---

## 5. Small-Cell Privacy Suppression & Reconciliation

- **Small-Cell Redaction:** For any breakdown query (by major, gender, age band, disability), if any cohort slice has $N < 5$ individuals, the metrics for that slice are suppressed (`suppressed: true`, values masked with `null`) to prevent indirect re-identification of vulnerable students.
- **Reconciliation Guarantee:** All dashboard and analytics endpoints compute values dynamically via SQL aggregate queries over active tables; zero numbers are hard-coded in API responses.
