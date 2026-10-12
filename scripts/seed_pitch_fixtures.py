"""
SUTRA — Comprehensive Pitch-Ready Demo Fixture Seeder
Populates SQLite (sutra_dev.db) with rich, realistic student retention operational data:
- Campus & 5 RBAC demo persona memberships
- 6 Synthetic students (SYN-1007 to SYN-1012)
- Multi-domain observations (attendance, academic, LMS participation, rubric skills, feedback)
- Segregated financial observation (ADR-003)
- ML inference logs with Platt-calibrated log-odds & Shapley feature attributions
- Evidence packets & signals (2 actionable pending alerts, 3 closed-loop reviewed signals)
- Multi-state support cases (In Progress, Under Review Escalated, Follow-up Due, Resolved)
- Real tasks, follow-ups with sanitized notes, proof records, and complete state machine event trails
"""

import asyncio
import hashlib
import json
import sys
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from sqlalchemy import delete, select
from app.core.database import AsyncSessionLocal, Base, engine
from app.models import (
    Institution,
    InstitutionMembership,
    Student,
    StudentObservation,
    FinanceObservation,
    PolicyVersion,
    EvidencePacket,
    Signal,
    InterventionCatalog,
    Case,
    CaseTask,
    CaseEvent,
    FollowUp,
    CaseOutcome,
)
from app.models.ml import MLInferenceLog

DEMO_CAMPUS_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")

DEMO_USERS = {
    "faculty": {
        "id": uuid.UUID("11111111-1111-1111-1111-111111111111"),
        "name": "Prof. Ananya Sharma",
        "email": "faculty@sutra.edu",
        "roles": ["faculty", "mentor"],
    },
    "counselor": {
        "id": uuid.UUID("22222222-2222-2222-2222-222222222222"),
        "name": "Dr. Meera Nambiar",
        "email": "counselor@sutra.edu",
        "roles": ["counsellor"],
    },
    "dean": {
        "id": uuid.UUID("33333333-3333-3333-3333-333333333333"),
        "name": "Dr. Rajeshwar Rao",
        "email": "dean@sutra.edu",
        "roles": ["hod", "faculty"],
    },
    "leadership": {
        "id": uuid.UUID("44444444-4444-4444-4444-444444444444"),
        "name": "Prof. S. K. Kulkarni",
        "email": "leadership@sutra.edu",
        "roles": ["leadership"],
    },
    "superadmin": {
        "id": uuid.UUID("55555555-5555-5555-5555-555555555555"),
        "name": "SUTRA Admin",
        "email": "admin@sutra.edu",
        "roles": ["institution_admin"],
    },
    "yash": {
        "id": uuid.UUID("80c46ffd-1490-4160-a0ae-8d62e5155f8d"),
        "name": "Yash Goel",
        "email": "yash@sutra.edu",
        "roles": ["institution_admin", "faculty", "hod", "mentor"],
    },
    "haruto": {
        "id": uuid.UUID("739f8c9b-5a63-4b66-90eb-b322117543c9"),
        "name": "Haruto Okura",
        "email": "haruto@sutra.edu",
        "roles": ["faculty", "counsellor"],
    },
}

STUDENT_DATA = [
    {
        "id": uuid.UUID("b0000000-0000-0000-0000-000000001007"),
        "external_ref": "SYN-1007",
        "display_name": "Asha (synthetic)",
        "cohort_code": "CS-Y2",
        "enrollment_status": "active",
        "status_label": "At Risk",
    },
    {
        "id": uuid.UUID("b0000000-0000-0000-0000-000000001008"),
        "external_ref": "SYN-1008",
        "display_name": "Dev (synthetic)",
        "cohort_code": "CS-Y2",
        "enrollment_status": "active",
        "status_label": "Active",
    },
    {
        "id": uuid.UUID("b0000000-0000-0000-0000-000000001009"),
        "external_ref": "SYN-1009",
        "display_name": "Ira (synthetic)",
        "cohort_code": "CS-Y2",
        "enrollment_status": "active",
        "status_label": "At Risk",
    },
    {
        "id": uuid.UUID("b0000000-0000-0000-0000-000000001010"),
        "external_ref": "SYN-1010",
        "display_name": "Noor (synthetic)",
        "cohort_code": "CS-Y2",
        "enrollment_status": "active",
        "status_label": "Active",
    },
    {
        "id": uuid.UUID("b0000000-0000-0000-0000-000000001011"),
        "external_ref": "SYN-1011",
        "display_name": "Milan (synthetic)",
        "cohort_code": "CS-Y2",
        "enrollment_status": "active",
        "status_label": "At Risk",
    },
    {
        "id": uuid.UUID("b0000000-0000-0000-0000-000000001012"),
        "external_ref": "SYN-1012",
        "display_name": "Tara (synthetic)",
        "cohort_code": "CS-Y2",
        "enrollment_status": "completed",
        "status_label": "Completed",
    },
]

INTERVENTIONS = [
    {
        "id": uuid.UUID("c1000000-0000-0000-0000-000000000001"),
        "key": "mentor_check_in",
        "domain": "mentor",
        "display_label": "Academic Mentor Check-In",
        "description": "Standard 1-on-1 advisor consultation to assess study barriers and formulate recovery steps.",
        "recipient_role": "faculty",
    },
    {
        "id": uuid.UUID("c1000000-0000-0000-0000-000000000002"),
        "key": "academic_tutoring_offer",
        "domain": "academic",
        "display_label": "Subject Tutoring Referral",
        "description": "Structured peer and faculty subject tutorial matching for coursework catch-up.",
        "recipient_role": "faculty",
    },
    {
        "id": uuid.UUID("c1000000-0000-0000-0000-000000000003"),
        "key": "counselling_referral",
        "domain": "counselling",
        "display_label": "Student Wellbeing Referral",
        "description": "Confidential counseling consultation for personal, mental health, or stress management support.",
        "recipient_role": "counsellor",
    },
    {
        "id": uuid.UUID("c1000000-0000-0000-0000-000000000004"),
        "key": "fee_emergency_counselling",
        "domain": "finance",
        "display_label": "Emergency Financial Aid Consultation",
        "description": "Confidential guidance on emergency grants, fee installment schedules, and scholarships.",
        "recipient_role": "finance",
    },
]


async def seed_pitch_database():
    print("[*] Starting SUTRA comprehensive demo seeding for jury presentation...")

    # Ensure all tables exist in SQLite
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    now = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as session:
        # Clear existing transactional tables for clean, consistent state
        print("    [-] Clearing stale signals, cases, observations...")
        await session.execute(delete(CaseOutcome))
        await session.execute(delete(FollowUp))
        await session.execute(delete(CaseEvent))
        await session.execute(delete(CaseTask))
        await session.execute(delete(Case))
        await session.execute(delete(Signal))
        await session.execute(delete(EvidencePacket))
        await session.execute(delete(MLInferenceLog))
        await session.execute(delete(StudentObservation))
        await session.execute(delete(FinanceObservation))
        await session.execute(delete(Student))
        await session.flush()

        # 1. Institution
        inst_query = await session.execute(select(Institution).where(Institution.id == DEMO_CAMPUS_ID))
        campus = inst_query.scalars().first()
        if not campus:
            campus = Institution(
                id=DEMO_CAMPUS_ID,
                name="Apex University Main Campus",
                status="active",
                created_at=now,
            )
            session.add(campus)
            await session.flush()
        else:
            campus.name = "Apex University Main Campus"
            campus.status = "active"

        # 2. Memberships
        for user_key, udata in DEMO_USERS.items():
            for role in udata["roles"]:
                mem_q = await session.execute(
                    select(InstitutionMembership).where(
                        InstitutionMembership.institution_id == DEMO_CAMPUS_ID,
                        InstitutionMembership.user_id == udata["id"],
                        InstitutionMembership.role == role,
                    )
                )
                if not mem_q.scalars().first():
                    session.add(
                        InstitutionMembership(
                            id=uuid.uuid4(),
                            institution_id=DEMO_CAMPUS_ID,
                            user_id=udata["id"],
                            role=role,
                            is_active=True,
                            created_at=now,
                        )
                    )
        await session.flush()
        print("    [+] Verified 5 demo personas & developer memberships")

        # 3. Policy Version
        pv_q = await session.execute(
            select(PolicyVersion).where(
                PolicyVersion.institution_id == DEMO_CAMPUS_ID,
                PolicyVersion.policy_key == "ug_attendance_academic_v1",
            )
        )
        policy = pv_q.scalars().first()
        if not policy:
            policy_def = {
                "name": "Undergraduate Academic & Attendance Early Warning Policy",
                "rules": [
                    {"rule_key": "ug_attendance_drop", "threshold": 0.70, "operator": "<", "metric_key": "attendance_rate", "suggested_intervention": "mentor_check_in"},
                    {"rule_key": "assignment_backlog", "threshold": 2, "operator": ">=", "metric_key": "missing_assignments_count", "suggested_intervention": "academic_tutoring_offer"},
                    {"rule_key": "faculty_feedback_concern", "threshold": True, "operator": "==", "metric_key": "support_check_requested", "suggested_intervention": "mentor_check_in"},
                ],
            }
            policy = PolicyVersion(
                id=uuid.UUID("a0000000-0000-0000-0000-000000000001"),
                institution_id=DEMO_CAMPUS_ID,
                policy_key="ug_attendance_academic_v1",
                version=1,
                status="published",
                definition=policy_def,
                checksum="sha256-ug-policy-v1-canonical",
                evaluator_version="2.0.0",
                published_at=now - timedelta(days=30),
                effective_from=now - timedelta(days=30),
                created_at=now - timedelta(days=30),
            )
            session.add(policy)
            await session.flush()
        print("    [+] Initialized active published policy version")

        # 4. Intervention Catalog
        for cat in INTERVENTIONS:
            cat_q = await session.execute(
                select(InterventionCatalog).where(
                    InterventionCatalog.institution_id == DEMO_CAMPUS_ID,
                    InterventionCatalog.intervention_key == cat["key"],
                )
            )
            if not cat_q.scalars().first():
                session.add(
                    InterventionCatalog(
                        id=cat["id"],
                        institution_id=DEMO_CAMPUS_ID,
                        intervention_key=cat["key"],
                        domain=cat["domain"],
                        display_label=cat["display_label"],
                        description=cat["description"],
                        recipient_role=cat["recipient_role"],
                        required_purpose_key="student_support" if cat["domain"] != "finance" else "fee_support",
                        requires_human_approval=True,
                        active=True,
                        version=1,
                        created_at=now,
                    )
                )
        await session.flush()
        print("    [+] Loaded intervention catalog (mentor, academic, counselling, finance)")

        # 5. Students
        for s in STUDENT_DATA:
            stu_q = await session.execute(
                select(Student).where(
                    Student.institution_id == DEMO_CAMPUS_ID,
                    Student.external_ref == s["external_ref"],
                )
            )
            existing_stu = stu_q.scalars().first()
            if not existing_stu:
                session.add(
                    Student(
                        id=s["id"],
                        institution_id=DEMO_CAMPUS_ID,
                        external_ref=s["external_ref"],
                        display_name=s["display_name"],
                        cohort_code=s["cohort_code"],
                        enrollment_status=s["enrollment_status"],
                        created_at=now - timedelta(days=60),
                        updated_at=now,
                    )
                )
            else:
                existing_stu.display_name = s["display_name"]
                existing_stu.cohort_code = s["cohort_code"]
                existing_stu.enrollment_status = s["enrollment_status"]
        await session.flush()
        print("    [+] Registered 6 synthetic cohort students (SYN-1007 to SYN-1012)")

        # 6. Student Multi-Domain Observations
        # Asha (SYN-1007): At Risk Attendance Drop & Assignment Backlog
        asha_id = uuid.UUID("b0000000-0000-0000-0000-000000001007")
        session.add_all([
            StudentObservation(
                id=uuid.UUID("d1000000-0000-0000-0000-000000000001"),
                institution_id=DEMO_CAMPUS_ID,
                student_id=asha_id,
                domain="attendance",
                metric_key="attendance_rate",
                value={"val": 0.58, "unit": "percentage"},
                unit="percentage",
                event_at=now - timedelta(days=10),
                available_at=now - timedelta(days=10),
                ingested_at=now - timedelta(days=10),
                source_system="SIS_ATTENDANCE",
                source_record_ref="REC-ATT-1007",
                source_version=1,
                quality_state="valid",
            ),
            StudentObservation(
                id=uuid.UUID("d1000000-0000-0000-0000-000000000002"),
                institution_id=DEMO_CAMPUS_ID,
                student_id=asha_id,
                domain="academic",
                metric_key="missing_assignments_count",
                value={"val": 3, "unit": "count"},
                unit="count",
                event_at=now - timedelta(days=7),
                available_at=now - timedelta(days=7),
                ingested_at=now - timedelta(days=7),
                source_system="LMS_ASSIGNMENTS",
                source_record_ref="REC-ASN-1007",
                source_version=1,
                quality_state="valid",
            ),
            StudentObservation(
                id=uuid.UUID("d1000000-0000-0000-0000-000000000003"),
                institution_id=DEMO_CAMPUS_ID,
                student_id=asha_id,
                domain="academic",
                metric_key="latest_score",
                value={"val": 41, "unit": "score"},
                unit="score",
                event_at=now - timedelta(days=5),
                available_at=now - timedelta(days=5),
                ingested_at=now - timedelta(days=5),
                source_system="LMS_GRADES",
                source_record_ref="REC-GRD-1007",
                source_version=1,
                quality_state="valid",
            ),
            StudentObservation(
                id=uuid.UUID("d1000000-0000-0000-0000-000000000004"),
                institution_id=DEMO_CAMPUS_ID,
                student_id=asha_id,
                domain="participation",
                metric_key="weekly_activity_count",
                value={"val": 2, "unit": "sessions"},
                unit="sessions",
                event_at=now - timedelta(days=4),
                available_at=now - timedelta(days=4),
                ingested_at=now - timedelta(days=4),
                source_system="VLE_ANALYTICS",
                source_record_ref="REC-VLE-1007",
                source_version=1,
                quality_state="valid",
            ),
            StudentObservation(
                id=uuid.UUID("d1000000-0000-0000-0000-000000000005"),
                institution_id=DEMO_CAMPUS_ID,
                student_id=asha_id,
                domain="faculty_feedback",
                metric_key="support_check_requested",
                value={"val": True},
                unit="flag",
                event_at=now - timedelta(days=2),
                available_at=now - timedelta(days=2),
                ingested_at=now - timedelta(days=2),
                source_system="FACULTY_PORTAL",
                source_record_ref="REC-FBK-1007",
                source_version=1,
                quality_state="valid",
            ),
        ])

        # Ira (SYN-1009): At Risk Assignment Backlog
        ira_id = uuid.UUID("b0000000-0000-0000-0000-000000001009")
        session.add_all([
            StudentObservation(
                id=uuid.UUID("d1000000-0000-0000-0000-000000000006"),
                institution_id=DEMO_CAMPUS_ID,
                student_id=ira_id,
                domain="attendance",
                metric_key="attendance_rate",
                value={"val": 0.64, "unit": "percentage"},
                unit="percentage",
                event_at=now - timedelta(days=8),
                available_at=now - timedelta(days=8),
                ingested_at=now - timedelta(days=8),
                source_system="SIS_ATTENDANCE",
                source_record_ref="REC-ATT-1009",
                source_version=1,
                quality_state="valid",
            ),
            StudentObservation(
                id=uuid.UUID("d1000000-0000-0000-0000-000000000007"),
                institution_id=DEMO_CAMPUS_ID,
                student_id=ira_id,
                domain="academic",
                metric_key="missing_assignments_count",
                value={"val": 2, "unit": "count"},
                unit="count",
                event_at=now - timedelta(days=6),
                available_at=now - timedelta(days=6),
                ingested_at=now - timedelta(days=6),
                source_system="LMS_ASSIGNMENTS",
                source_record_ref="REC-ASN-1009",
                source_version=1,
                quality_state="valid",
            ),
        ])

        # Milan (SYN-1011): Academic & Counseling Check
        milan_id = uuid.UUID("b0000000-0000-0000-0000-000000001011")
        session.add_all([
            StudentObservation(
                id=uuid.UUID("d1000000-0000-0000-0000-000000000008"),
                institution_id=DEMO_CAMPUS_ID,
                student_id=milan_id,
                domain="attendance",
                metric_key="attendance_rate",
                value={"val": 0.62, "unit": "percentage"},
                unit="percentage",
                event_at=now - timedelta(days=12),
                available_at=now - timedelta(days=12),
                ingested_at=now - timedelta(days=12),
                source_system="SIS_ATTENDANCE",
                source_record_ref="REC-ATT-1011",
                source_version=1,
                quality_state="valid",
            ),
            StudentObservation(
                id=uuid.UUID("d1000000-0000-0000-0000-000000000009"),
                institution_id=DEMO_CAMPUS_ID,
                student_id=milan_id,
                domain="faculty_feedback",
                metric_key="support_check_requested",
                value={"val": True},
                unit="flag",
                event_at=now - timedelta(days=4),
                available_at=now - timedelta(days=4),
                ingested_at=now - timedelta(days=4),
                source_system="FACULTY_PORTAL",
                source_record_ref="REC-FBK-1011",
                source_version=1,
                quality_state="valid",
            ),
        ])

        # Dev (SYN-1008): Healthy Engagement
        dev_id = uuid.UUID("b0000000-0000-0000-0000-000000001008")
        session.add_all([
            StudentObservation(
                id=uuid.UUID("d1000000-0000-0000-0000-000000000010"),
                institution_id=DEMO_CAMPUS_ID,
                student_id=dev_id,
                domain="attendance",
                metric_key="attendance_rate",
                value={"val": 0.94, "unit": "percentage"},
                unit="percentage",
                event_at=now - timedelta(days=5),
                available_at=now - timedelta(days=5),
                ingested_at=now - timedelta(days=5),
                source_system="SIS_ATTENDANCE",
                source_record_ref="REC-ATT-1008",
                source_version=1,
                quality_state="valid",
            ),
            StudentObservation(
                id=uuid.UUID("d1000000-0000-0000-0000-000000000011"),
                institution_id=DEMO_CAMPUS_ID,
                student_id=dev_id,
                domain="academic",
                metric_key="missing_assignments_count",
                value={"val": 0, "unit": "count"},
                unit="count",
                event_at=now - timedelta(days=3),
                available_at=now - timedelta(days=3),
                ingested_at=now - timedelta(days=3),
                source_system="LMS_ASSIGNMENTS",
                source_record_ref="REC-ASN-1008",
                source_version=1,
                quality_state="valid",
            ),
        ])

        # Noor (SYN-1010): Recovered from Tutoring
        noor_id = uuid.UUID("b0000000-0000-0000-0000-000000001010")
        session.add(
            StudentObservation(
                id=uuid.UUID("d1000000-0000-0000-0000-000000000012"),
                institution_id=DEMO_CAMPUS_ID,
                student_id=noor_id,
                domain="attendance",
                metric_key="attendance_rate",
                value={"val": 0.91, "unit": "percentage"},
                unit="percentage",
                event_at=now - timedelta(days=4),
                available_at=now - timedelta(days=4),
                ingested_at=now - timedelta(days=4),
                source_system="SIS_ATTENDANCE",
                source_record_ref="REC-ATT-1010",
                source_version=1,
                quality_state="valid",
            )
        )

        # Tara (SYN-1012): High Engagement Completed
        tara_id = uuid.UUID("b0000000-0000-0000-0000-000000001012")
        session.add(
            StudentObservation(
                id=uuid.UUID("d1000000-0000-0000-0000-000000000013"),
                institution_id=DEMO_CAMPUS_ID,
                student_id=tara_id,
                domain="attendance",
                metric_key="attendance_rate",
                value={"val": 0.98, "unit": "percentage"},
                unit="percentage",
                event_at=now - timedelta(days=2),
                available_at=now - timedelta(days=2),
                ingested_at=now - timedelta(days=2),
                source_system="SIS_ATTENDANCE",
                source_record_ref="REC-ATT-1012",
                source_version=1,
                quality_state="valid",
            )
        )

        # 7. Segregated Finance Observation (ADR-003)
        session.add(
            FinanceObservation(
                id=uuid.UUID("d2000000-0000-0000-0000-000000000001"),
                institution_id=DEMO_CAMPUS_ID,
                student_id=asha_id,
                fee_support_status="review_requested",
                event_at=now - timedelta(days=4),
                available_at=now - timedelta(days=4),
                ingested_at=now - timedelta(days=4),
                source_system="SIS_FINANCE",
                source_record_ref="REC-FEE-1007",
                source_version=1,
                quality_state="valid",
            )
        )
        await session.flush()
        print("    [+] Inserted multi-domain observations across all students + ADR-003 financial record")

        # 8. ML Inference Logs
        session.add_all([
            MLInferenceLog(
                id=uuid.UUID("e3000000-0000-0000-0000-000000000001"),
                institution_id=DEMO_CAMPUS_ID,
                student_id=asha_id,
                external_student_ref="SYN-1007",
                model_name="logistic_regression_baseline",
                model_version="1.0.0",
                prediction_cutoff="Day 30",
                risk_probability=0.68,
                threshold=0.46,
                classification="At_Risk",
                top_attributions=[
                    {"feature": "attendance_rate", "value": 0.58, "attribution": 0.42, "direction": "increases_risk"},
                    {"feature": "missing_assignments_count", "value": 3.0, "attribution": 0.28, "direction": "increases_risk"},
                    {"feature": "vle_active_days_d30", "value": 8.0, "attribution": 0.14, "direction": "increases_risk"},
                    {"feature": "studied_credits", "value": 60.0, "attribution": -0.12, "direction": "decreases_risk"},
                ],
                latency_ms=22.4,
                created_at=now - timedelta(days=2),
            ),
            MLInferenceLog(
                id=uuid.UUID("e3000000-0000-0000-0000-000000000002"),
                institution_id=DEMO_CAMPUS_ID,
                student_id=ira_id,
                external_student_ref="SYN-1009",
                model_name="logistic_regression_baseline",
                model_version="1.0.0",
                prediction_cutoff="Day 30",
                risk_probability=0.74,
                threshold=0.46,
                classification="At_Risk",
                top_attributions=[
                    {"feature": "attendance_rate", "value": 0.64, "attribution": 0.38, "direction": "increases_risk"},
                    {"feature": "missing_assignments_count", "value": 2.0, "attribution": 0.22, "direction": "increases_risk"},
                    {"feature": "vle_total_clicks_d30", "value": 45.0, "attribution": 0.18, "direction": "increases_risk"},
                ],
                latency_ms=19.1,
                created_at=now - timedelta(days=3),
            ),
            MLInferenceLog(
                id=uuid.UUID("e3000000-0000-0000-0000-000000000003"),
                institution_id=DEMO_CAMPUS_ID,
                student_id=milan_id,
                external_student_ref="SYN-1011",
                model_name="logistic_regression_baseline",
                model_version="1.0.0",
                prediction_cutoff="Day 30",
                risk_probability=0.62,
                threshold=0.46,
                classification="At_Risk",
                top_attributions=[
                    {"feature": "attendance_rate", "value": 0.62, "attribution": 0.34, "direction": "increases_risk"},
                    {"feature": "vle_active_days_d30", "value": 5.0, "attribution": 0.24, "direction": "increases_risk"},
                ],
                latency_ms=18.5,
                created_at=now - timedelta(days=4),
            ),
            MLInferenceLog(
                id=uuid.UUID("e3000000-0000-0000-0000-000000000004"),
                institution_id=DEMO_CAMPUS_ID,
                student_id=dev_id,
                external_student_ref="SYN-1008",
                model_name="logistic_regression_baseline",
                model_version="1.0.0",
                prediction_cutoff="Day 30",
                risk_probability=0.18,
                threshold=0.46,
                classification="On_Track",
                top_attributions=[
                    {"feature": "attendance_rate", "value": 0.94, "attribution": -0.45, "direction": "decreases_risk"},
                    {"feature": "missing_assignments_count", "value": 0.0, "attribution": -0.32, "direction": "decreases_risk"},
                ],
                latency_ms=15.0,
                created_at=now - timedelta(days=5),
            ),
        ])
        await session.flush()
        print("    [+] Generated ML inference logs with feature attributions")

        # 9. Evidence Packets
        packet_asha = EvidencePacket(
            id=uuid.UUID("e0000000-0000-0000-0000-000000000001"),
            institution_id=DEMO_CAMPUS_ID,
            student_id=asha_id,
            policy_version_id=policy.id,
            schema_version="1.0",
            as_of_at=now - timedelta(days=2),
            snapshot={
                "attendance_rate": 0.58,
                "missing_assignments_count": 3,
                "latest_score": 41,
                "weekly_activity_count": 2,
            },
            digest="sha256-evidence-syn1007-snapshot",
            retention_class="demo_short_lived",
            expires_at=now + timedelta(days=90),
            created_at=now - timedelta(days=2),
        )
        packet_ira = EvidencePacket(
            id=uuid.UUID("e0000000-0000-0000-0000-000000000002"),
            institution_id=DEMO_CAMPUS_ID,
            student_id=ira_id,
            policy_version_id=policy.id,
            schema_version="1.0",
            as_of_at=now - timedelta(days=3),
            snapshot={
                "attendance_rate": 0.64,
                "missing_assignments_count": 2,
            },
            digest="sha256-evidence-syn1009-snapshot",
            retention_class="demo_short_lived",
            expires_at=now + timedelta(days=90),
            created_at=now - timedelta(days=3),
        )
        packet_milan = EvidencePacket(
            id=uuid.UUID("e0000000-0000-0000-0000-000000000003"),
            institution_id=DEMO_CAMPUS_ID,
            student_id=milan_id,
            policy_version_id=policy.id,
            schema_version="1.0",
            as_of_at=now - timedelta(days=4),
            snapshot={
                "attendance_rate": 0.62,
                "support_check_requested": True,
            },
            digest="sha256-evidence-syn1011-snapshot",
            retention_class="demo_short_lived",
            expires_at=now + timedelta(days=90),
            created_at=now - timedelta(days=4),
        )
        packet_dev = EvidencePacket(
            id=uuid.UUID("e0000000-0000-0000-0000-000000000004"),
            institution_id=DEMO_CAMPUS_ID,
            student_id=dev_id,
            policy_version_id=policy.id,
            schema_version="1.0",
            as_of_at=now - timedelta(days=5),
            snapshot={
                "attendance_rate": 0.94,
                "missing_assignments_count": 0,
            },
            digest="sha256-evidence-syn1008-snapshot",
            retention_class="demo_short_lived",
            expires_at=now + timedelta(days=90),
            created_at=now - timedelta(days=5),
        )
        packet_noor = EvidencePacket(
            id=uuid.UUID("e0000000-0000-0000-0000-000000000005"),
            institution_id=DEMO_CAMPUS_ID,
            student_id=noor_id,
            policy_version_id=policy.id,
            schema_version="1.0",
            as_of_at=now - timedelta(days=6),
            snapshot={
                "attendance_rate": 0.72,
                "missing_assignments_count": 1,
            },
            digest="sha256-evidence-syn1010-snapshot",
            retention_class="demo_short_lived",
            expires_at=now + timedelta(days=90),
            created_at=now - timedelta(days=6),
        )
        session.add_all([packet_asha, packet_ira, packet_milan, packet_dev, packet_noor])
        await session.flush()

        # 10. Signals
        # 2 Pending (Action Required in Review Alerts) + 3 Reviewed (Closed Loop)
        sig_asha = Signal(
            id=uuid.UUID("e1000000-0000-0000-0000-000000000001"),
            institution_id=DEMO_CAMPUS_ID,
            student_id=asha_id,
            policy_version_id=policy.id,
            evidence_packet_id=packet_asha.id,
            rule_key="ug_attendance_drop",
            result="attention_suggested",
            quality_state="sufficient",
            explanation={
                "summary": "Attendance dropped to 58% (policy threshold: 70%). 3 assignments unsubmitted.",
                "attendance_rate": 0.58,
                "missing_assignments": 3,
                "threshold": 0.70,
                "recommendation": "Academic mentor check-in",
                "ml_evidence_card": {
                    "card_type": "ml_early_warning_evidence",
                    "model_name": "logistic_regression_baseline",
                    "model_version": "1.0.0",
                    "prediction_cutoff": "Day 30",
                    "risk_probability": 0.68,
                    "threshold": 0.46,
                    "classification": "At_Risk",
                    "attributions": [
                        {"feature": "attendance_rate", "value": 0.58, "attribution": 0.42, "direction": "increases_risk"},
                        {"feature": "missing_assignments_count", "value": 3, "attribution": 0.28, "direction": "increases_risk"},
                        {"feature": "vle_active_days_d30", "value": 8, "attribution": 0.14, "direction": "increases_risk"},
                    ],
                    "limitations": [
                        "Excludes non-modular course records.",
                        "Represents correlation, not causal certainty.",
                    ],
                },
            },
            evaluated_at=now - timedelta(days=2),
            reviewed_decision=None,  # PENDING REVIEW
            reviewed_by=None,
            reviewed_at=None,
            review_reason_code=None,
            created_at=now - timedelta(days=2),
        )

        sig_ira = Signal(
            id=uuid.UUID("e1000000-0000-0000-0000-000000000002"),
            institution_id=DEMO_CAMPUS_ID,
            student_id=ira_id,
            policy_version_id=policy.id,
            evidence_packet_id=packet_ira.id,
            rule_key="assignment_backlog",
            result="attention_suggested",
            quality_state="sufficient",
            explanation={
                "summary": "2 assignments overdue in CS201 and CS202. VLE clicks low.",
                "missing_assignments_count": 2,
                "recommendation": "Subject tutoring referral",
                "ml_evidence_card": {
                    "card_type": "ml_early_warning_evidence",
                    "model_name": "logistic_regression_baseline",
                    "model_version": "1.0.0",
                    "prediction_cutoff": "Day 30",
                    "risk_probability": 0.74,
                    "threshold": 0.46,
                    "classification": "At_Risk",
                    "attributions": [
                        {"feature": "missing_assignments_count", "value": 2, "attribution": 0.38, "direction": "increases_risk"},
                        {"feature": "attendance_rate", "value": 0.64, "attribution": 0.22, "direction": "increases_risk"},
                    ],
                },
            },
            evaluated_at=now - timedelta(days=3),
            reviewed_decision=None,  # PENDING REVIEW
            reviewed_by=None,
            reviewed_at=None,
            review_reason_code=None,
            created_at=now - timedelta(days=3),
        )

        sig_milan = Signal(
            id=uuid.UUID("e1000000-0000-0000-0000-000000000003"),
            institution_id=DEMO_CAMPUS_ID,
            student_id=milan_id,
            policy_version_id=policy.id,
            evidence_packet_id=packet_milan.id,
            rule_key="faculty_feedback_concern",
            result="attention_suggested",
            quality_state="sufficient",
            explanation={
                "summary": "Faculty mentor requested wellness check-in.",
                "support_check_requested": True,
            },
            evaluated_at=now - timedelta(days=4),
            reviewed_decision="approve",  # REVIEWED
            reviewed_by=DEMO_USERS["faculty"]["id"],
            reviewed_at=now - timedelta(days=3, hours=2),
            review_reason_code="FACULTY_SUPPORT_REQUESTED",
            created_at=now - timedelta(days=4),
        )

        sig_dev = Signal(
            id=uuid.UUID("e1000000-0000-0000-0000-000000000004"),
            institution_id=DEMO_CAMPUS_ID,
            student_id=dev_id,
            policy_version_id=policy.id,
            evidence_packet_id=packet_dev.id,
            rule_key="all_metrics_normal",
            result="no_rule_triggered",
            quality_state="sufficient",
            explanation={
                "summary": "All metrics within standard bounds. Attendance 94%.",
            },
            evaluated_at=now - timedelta(days=5),
            reviewed_decision="dismiss",  # REVIEWED
            reviewed_by=DEMO_USERS["faculty"]["id"],
            reviewed_at=now - timedelta(days=4, hours=20),
            review_reason_code="BENIGN_PROFILE_VERIFIED",
            created_at=now - timedelta(days=5),
        )

        sig_noor = Signal(
            id=uuid.UUID("e1000000-0000-0000-0000-000000000005"),
            institution_id=DEMO_CAMPUS_ID,
            student_id=noor_id,
            policy_version_id=policy.id,
            evidence_packet_id=packet_noor.id,
            rule_key="ug_attendance_drop",
            result="attention_suggested",
            quality_state="sufficient",
            explanation={
                "summary": "Historical attendance drop successfully recovered.",
            },
            evaluated_at=now - timedelta(days=6),
            reviewed_decision="approve",  # REVIEWED
            reviewed_by=DEMO_USERS["dean"]["id"],
            reviewed_at=now - timedelta(days=5, hours=12),
            review_reason_code="TUTORING_COMPLETED_RESOLVED",
            created_at=now - timedelta(days=6),
        )

        session.add_all([sig_asha, sig_ira, sig_milan, sig_dev, sig_noor])
        await session.flush()
        print("    [+] Created 5 policy signals (2 Pending Action Required, 3 Reviewed Closed-Loop)")

        # 11. Support Cases across Diverse Lifecycle States
        # Case 1: Asha (SYN-1007) - IN_PROGRESS
        case_asha = Case(
            id=uuid.UUID("f0000000-0000-0000-0000-000000000001"),
            institution_id=DEMO_CAMPUS_ID,
            student_id=asha_id,
            originating_signal_id=sig_asha.id,
            selected_intervention_key="mentor_check_in",
            state="support_in_progress",
            primary_owner_user_id=DEMO_USERS["faculty"]["id"],
            due_at=now + timedelta(days=3),
            accepted_at=now - timedelta(hours=4),
            is_escalated=False,
            version=2,
            created_by=DEMO_USERS["faculty"]["id"],
            created_at=now - timedelta(days=1),
            updated_at=now - timedelta(hours=2),
        )

        # Case 2: Ira (SYN-1009) - UNDER_REVIEW (Escalated to HOD!)
        case_ira = Case(
            id=uuid.UUID("f0000000-0000-0000-0000-000000000002"),
            institution_id=DEMO_CAMPUS_ID,
            student_id=ira_id,
            originating_signal_id=sig_ira.id,
            selected_intervention_key="academic_tutoring_offer",
            state="under_review",
            primary_owner_user_id=DEMO_USERS["dean"]["id"],
            due_at=now + timedelta(days=4),
            accepted_at=None,
            is_escalated=True,  # URGENT ESCALATION FOR DASHBOARD KPI
            version=1,
            created_by=DEMO_USERS["dean"]["id"],
            created_at=now - timedelta(hours=18),
            updated_at=now - timedelta(hours=18),
        )

        # Case 3: Milan (SYN-1011) - FOLLOW_UP_REQUIRED
        case_milan = Case(
            id=uuid.UUID("f0000000-0000-0000-0000-000000000003"),
            institution_id=DEMO_CAMPUS_ID,
            student_id=milan_id,
            originating_signal_id=sig_milan.id,
            selected_intervention_key="counselling_referral",
            state="follow_up_due",
            primary_owner_user_id=DEMO_USERS["counselor"]["id"],
            due_at=now + timedelta(days=2),
            accepted_at=now - timedelta(days=2),
            is_escalated=False,
            version=3,
            created_by=DEMO_USERS["faculty"]["id"],
            created_at=now - timedelta(days=3),
            updated_at=now - timedelta(hours=6),
        )

        # Case 4: Noor (SYN-1010) - RESOLVED / CLOSED
        case_noor = Case(
            id=uuid.UUID("f0000000-0000-0000-0000-000000000004"),
            institution_id=DEMO_CAMPUS_ID,
            student_id=noor_id,
            originating_signal_id=sig_noor.id,
            selected_intervention_key="academic_tutoring_offer",
            state="closed",
            primary_owner_user_id=DEMO_USERS["faculty"]["id"],
            due_at=now - timedelta(days=1),
            accepted_at=now - timedelta(days=5),
            is_escalated=False,
            version=4,
            created_by=DEMO_USERS["dean"]["id"],
            created_at=now - timedelta(days=5),
            updated_at=now - timedelta(days=1),
        )

        session.add_all([case_asha, case_ira, case_milan, case_noor])
        await session.flush()

        # 12. Case Tasks
        # Asha Tasks (Powers "Next Support Milestone" widget)
        task_asha_1 = CaseTask(
            id=uuid.UUID("f1000000-0000-0000-0000-000000000001"),
            institution_id=DEMO_CAMPUS_ID,
            case_id=case_asha.id,
            domain="mentor",
            generic_label="Initial 1-on-1 Academic Mentorship Session",
            state="in_progress",
            assignee_user_id=DEMO_USERS["faculty"]["id"],
            due_at=now + timedelta(days=2),
            deadline_version=1,
            idempotency_key="task-asha-mentor-01",
            created_at=now - timedelta(hours=4),
        )
        task_asha_2 = CaseTask(
            id=uuid.UUID("f1000000-0000-0000-0000-000000000002"),
            institution_id=DEMO_CAMPUS_ID,
            case_id=case_asha.id,
            domain="counselling",
            generic_label="Student Wellness Resource Check",
            state="pending",
            assignee_user_id=DEMO_USERS["counselor"]["id"],
            due_at=now + timedelta(days=5),
            deadline_version=1,
            idempotency_key="task-asha-counsel-02",
            created_at=now - timedelta(hours=4),
        )

        # Milan Tasks
        task_milan_1 = CaseTask(
            id=uuid.UUID("f1000000-0000-0000-0000-000000000003"),
            institution_id=DEMO_CAMPUS_ID,
            case_id=case_milan.id,
            domain="counselling",
            generic_label="Confidential Intake Counseling Session",
            state="completed",
            assignee_user_id=DEMO_USERS["counselor"]["id"],
            due_at=now - timedelta(days=1),
            completed_at=now - timedelta(hours=8),
            deadline_version=1,
            idempotency_key="task-milan-counsel-01",
            created_at=now - timedelta(days=2),
        )
        task_milan_2 = CaseTask(
            id=uuid.UUID("f1000000-0000-0000-0000-000000000004"),
            institution_id=DEMO_CAMPUS_ID,
            case_id=case_milan.id,
            domain="counselling",
            generic_label="Follow-Up Wellness & Study Check",
            state="in_progress",
            assignee_user_id=DEMO_USERS["counselor"]["id"],
            due_at=now + timedelta(days=2),
            deadline_version=1,
            idempotency_key="task-milan-counsel-02",
            created_at=now - timedelta(hours=8),
        )

        session.add_all([task_asha_1, task_asha_2, task_milan_1, task_milan_2])
        await session.flush()

        # 13. Follow-Ups with Sanitized Proof Records
        fu_asha = FollowUp(
            id=uuid.UUID("f2000000-0000-0000-0000-000000000001"),
            institution_id=DEMO_CAMPUS_ID,
            case_id=case_asha.id,
            follow_up_type="contact_attempt",
            contact_status="student_reached",
            proof_kind="appointment_record",
            occurred_at=now - timedelta(hours=3),
            recorded_by=DEMO_USERS["faculty"]["id"],
            sanitized_note="Student met in office; confirmed commuting challenges affecting morning sessions. Arranged hybrid lab schedule.",
            proof_ref="CAL-OFFICE-OCT12",
            idempotency_key="fu-asha-contact-01",
            created_at=now - timedelta(hours=3),
        )
        fu_milan = FollowUp(
            id=uuid.UUID("f2000000-0000-0000-0000-000000000002"),
            institution_id=DEMO_CAMPUS_ID,
            case_id=case_milan.id,
            follow_up_type="contact_attempt",
            contact_status="student_reached",
            proof_kind="appointment_record",
            occurred_at=now - timedelta(hours=8),
            recorded_by=DEMO_USERS["counselor"]["id"],
            sanitized_note="Initial counseling intake session completed via Google Meet. Student engaged positively; time management toolkit shared.",
            proof_ref="MEET-INTAKE-OCT12",
            idempotency_key="fu-milan-contact-01",
            created_at=now - timedelta(hours=8),
        )
        session.add_all([fu_asha, fu_milan])

        # 14. Case Events (Audit Trail for Transitions)
        events = [
            CaseEvent(
                id=uuid.uuid4(),
                institution_id=DEMO_CAMPUS_ID,
                case_id=case_asha.id,
                actor_user_id=DEMO_USERS["faculty"]["id"],
                actor_kind="user",
                event_type="CASE_REVIEW_STARTED",
                from_state="suggested",
                to_state="under_review",
                reason_code="SIGNAL_REVIEWED",
                event_metadata={"initiated_by": "Prof. Ananya Sharma"},
                idempotency_key="evt-asha-01",
                created_at=now - timedelta(hours=10),
            ),
            CaseEvent(
                id=uuid.uuid4(),
                institution_id=DEMO_CAMPUS_ID,
                case_id=case_asha.id,
                actor_user_id=DEMO_USERS["faculty"]["id"],
                actor_kind="user",
                event_type="INTERVENTION_APPROVED",
                from_state="under_review",
                to_state="action_planned",
                reason_code="INTERVENTION_SELECTED",
                event_metadata={"intervention": "mentor_check_in"},
                idempotency_key="evt-asha-02",
                created_at=now - timedelta(hours=8),
            ),
            CaseEvent(
                id=uuid.uuid4(),
                institution_id=DEMO_CAMPUS_ID,
                case_id=case_asha.id,
                actor_user_id=DEMO_USERS["faculty"]["id"],
                actor_kind="user",
                event_type="ASSIGNMENT_ACCEPTED",
                from_state="assigned",
                to_state="accepted",
                reason_code="OWNER_ACCEPTED",
                event_metadata={"owner": "Prof. Ananya Sharma"},
                idempotency_key="evt-asha-03",
                created_at=now - timedelta(hours=4),
            ),
            CaseEvent(
                id=uuid.uuid4(),
                institution_id=DEMO_CAMPUS_ID,
                case_id=case_asha.id,
                actor_user_id=DEMO_USERS["faculty"]["id"],
                actor_kind="user",
                event_type="SUPPORT_STARTED",
                from_state="accepted",
                to_state="support_in_progress",
                reason_code="FOLLOWUP_INITIATED",
                event_metadata={"session_notes_recorded": True},
                idempotency_key="evt-asha-04",
                created_at=now - timedelta(hours=3),
            ),
            CaseEvent(
                id=uuid.uuid4(),
                institution_id=DEMO_CAMPUS_ID,
                case_id=case_ira.id,
                actor_user_id=DEMO_USERS["dean"]["id"],
                actor_kind="user",
                event_type="CASE_REVIEW_STARTED",
                from_state="suggested",
                to_state="under_review",
                reason_code="ESCALATED_TO_HOD",
                event_metadata={"escalated": True, "reviewer": "Dr. Rajeshwar Rao"},
                idempotency_key="evt-ira-01",
                created_at=now - timedelta(hours=18),
            ),
        ]
        session.add_all(events)

        # 15. Case Outcome for Resolved Case (Noor)
        outcome_noor = CaseOutcome(
            id=uuid.UUID("f3000000-0000-0000-0000-000000000001"),
            institution_id=DEMO_CAMPUS_ID,
            case_id=case_noor.id,
            outcome_status="resolved_positive",
            rationale="Subject tutoring completed successfully. All backlog submissions cleared and attendance recovered to 91%.",
            evidence_kind="staff_review",
            follow_up_window_start=now - timedelta(days=14),
            follow_up_window_end=now - timedelta(days=1),
            recorded_by=DEMO_USERS["faculty"]["id"],
            recorded_at=now - timedelta(days=1),
        )
        session.add(outcome_noor)

        await session.commit()
        print("\n=======================================================")
        print("  SUTRA PITCH DATA SEEDING COMPLETE SUCCESSFULLY! ")
        print("=======================================================")
        print("  - Cohort Students: 6 (Asha, Dev, Ira, Noor, Milan, Tara)")
        print("  - Policy Signals: 5 (2 Pending Review, 3 Closed-Loop)")
        print("  - Support Cases: 4 (1 In-Progress, 1 Escalated, 1 Follow-up, 1 Resolved)")
        print("  - Active Tasks: 4 (Nearest Follow-up due in 48h for Asha)")
        print("  - ML Inference Logs: 4 (with Platt-calibrated feature attributions)")
        print("=======================================================\n")


if __name__ == "__main__":
    asyncio.run(seed_pitch_database())
