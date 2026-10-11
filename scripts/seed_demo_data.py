"""
SUTRA Demo Data Seeder Script.
Seeds synthetic demo fixtures into SQLite / PostgreSQL database.
"""

import argparse
import asyncio
import json
import os
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal, Base, engine
from app.models import (
    Institution,
    InstitutionMembership,
    Student,
    StudentObservation,
    FinanceObservation,
    PolicyVersion,
    Signal,
    InterventionCatalog,
    Case,
    CaseTask,
    CaseEvent,
    FollowUp,
    CaseOutcome,
)
from app.services.policy_engine import PolicyEngineService

DEMO_CAMPUS_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")

DEMO_USERS = {
    "faculty": {
        "id": uuid.UUID("11111111-1111-1111-1111-111111111111"),
        "name": "Prof. Ananya Sharma",
        "email": "faculty@sutra.edu",
        "role": "faculty",
    },
    "counselor": {
        "id": uuid.UUID("22222222-2222-2222-2222-222222222222"),
        "name": "Dr. Meera Nambiar",
        "email": "counselor@sutra.edu",
        "role": "counselor",
    },
    "dean": {
        "id": uuid.UUID("33333333-3333-3333-3333-333333333333"),
        "name": "Dr. Rajeshwar Rao",
        "email": "dean@sutra.edu",
        "role": "dean",
    },
    "leadership": {
        "id": uuid.UUID("44444444-4444-4444-4444-444444444444"),
        "name": "Prof. S. K. Kulkarni",
        "email": "leadership@sutra.edu",
        "role": "leadership",
    },
    "superadmin": {
        "id": uuid.UUID("55555555-5555-5555-5555-555555555555"),
        "name": "SUTRA Admin",
        "email": "admin@sutra.edu",
        "role": "superadmin",
    },
}


async def seed_data(fixture_path: Path):
    print(f"[*] Starting SUTRA demo database seed using {fixture_path}...")

    # Create tables if not exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    with open(fixture_path) as f:
        fixtures = json.load(f)

    async with AsyncSessionLocal() as session:
        # 1. Institution
        inst_query = await session.execute(
            select(Institution).where(Institution.id == DEMO_CAMPUS_ID)
        )
        campus = inst_query.scalars().first()
        if not campus:
            campus = Institution(
                id=DEMO_CAMPUS_ID,
                name="SUTRA Synthetic Demonstration Campus",
                status="active",
            )
            session.add(campus)
            await session.flush()
            print("    [+] Created demonstration campus:", campus.name)

        # 2. Memberships
        for key, u in DEMO_USERS.items():
            mem_query = await session.execute(
                select(InstitutionMembership).where(
                    InstitutionMembership.institution_id == DEMO_CAMPUS_ID,
                    InstitutionMembership.user_id == u["id"],
                )
            )
            if not mem_query.scalars().first():
                session.add(
                    InstitutionMembership(
                        id=uuid.uuid4(),
                        institution_id=DEMO_CAMPUS_ID,
                        user_id=u["id"],
                        role=u["role"],
                        is_active=True,
                    )
                )
        await session.flush()
        print("    [+] Seeded 5 standard persona memberships (faculty, counselor, dean, leadership, superadmin)")

        # 3. Policy Version
        policy = await PolicyEngineService.get_or_create_policy_version(session, DEMO_CAMPUS_ID)
        print("    [+] Initialized active policy:", policy.policy_key)

        # 4. Interventions Catalog
        for item in fixtures.get("interventions_catalog", []):
            cat_query = await session.execute(
                select(InterventionCatalog).where(
                    InterventionCatalog.institution_id == DEMO_CAMPUS_ID,
                    InterventionCatalog.intervention_key == item["key"],
                )
            )
            if not cat_query.scalars().first():
                session.add(
                    InterventionCatalog(
                        id=uuid.uuid4(),
                        institution_id=DEMO_CAMPUS_ID,
                        intervention_key=item["key"],
                        display_label=item["name"],
                        domain=item["domain"],
                        description=f"Standard protocol for {item['name']}",
                        recipient_role=item["recipient_roles"][0] if item.get("recipient_roles") else "faculty",
                        required_purpose_key="student_support",
                        requires_human_approval=item.get("requires_human_approval", True),
                    )
                )
        await session.flush()

        # 5. Students
        student_id_map = {}
        for s in fixtures.get("students", []):
            s_query = await session.execute(
                select(Student).where(
                    Student.institution_id == DEMO_CAMPUS_ID,
                    Student.external_ref == s["key"],
                )
            )
            student = s_query.scalars().first()
            if not student:
                student = Student(
                    id=uuid.uuid4(),
                    institution_id=DEMO_CAMPUS_ID,
                    external_ref=s["key"],
                    display_name=s["display_name"],
                    cohort_code=s.get("cohort", "CS-Y2"),
                    enrollment_status="active",
                )
                session.add(student)
                await session.flush()
            student_id_map[s["key"]] = student.id
        print(f"    [+] Seeded {len(student_id_map)} synthetic students")

        # 6. Observations
        now = datetime.now(timezone.utc)
        for obs in fixtures.get("observations", []):
            s_id = student_id_map.get(obs["student"])
            if not s_id:
                continue
            session.add(
                StudentObservation(
                    id=uuid.uuid4(),
                    institution_id=DEMO_CAMPUS_ID,
                    student_id=s_id,
                    domain=obs["domain"],
                    metric_key=obs["metric_key"],
                    value={"value": obs["value"]},
                    quality_state="good",
                    event_at=datetime.fromisoformat(obs["event_at"].replace("Z", "+00:00")),
                    available_at=datetime.fromisoformat(obs["available_at"].replace("Z", "+00:00")),
                    ingested_at=now,
                    source_system=obs.get("source", "seed_data"),
                    source_record_ref=f"REC-{uuid.uuid4().hex[:8]}",
                    source_version=1,
                )
            )
        await session.flush()

        # 7. Evaluate Policy Engine to generate Signals
        signals_created = 0
        for ext_key, s_id in student_id_map.items():
            sig = await PolicyEngineService.evaluate_student(
                db=session,
                campus_id=DEMO_CAMPUS_ID,
                student_id=s_id,
            )
            if sig:
                signals_created += 1
        print(f"    [+] Evaluated policy engine: {signals_created} initial signals created")

        # 8. Create a sample actionable Case with tasks, follow-up, and timeline
        sig_query = await session.execute(
            select(Signal).where(Signal.institution_id == DEMO_CAMPUS_ID)
        )
        sample_sig = sig_query.scalars().first()
        if sample_sig:
            case_query = await session.execute(
                select(Case).where(
                    Case.originating_signal_id == sample_sig.id
                )
            )
            if not case_query.scalars().first():
                faculty_user_id = DEMO_USERS["faculty"]["id"]
                case = Case(
                    id=uuid.uuid4(),
                    institution_id=DEMO_CAMPUS_ID,
                    student_id=sample_sig.student_id,
                    originating_signal_id=sample_sig.id,
                    selected_intervention_key="mentor_check_in",
                    state="IN_PROGRESS",
                    primary_owner_user_id=faculty_user_id,
                    due_at=now + timedelta(days=3),
                    accepted_at=now - timedelta(hours=2),
                    is_escalated=False,
                )
                session.add(case)
                await session.flush()

                # Add tasks
                task1 = CaseTask(
                    id=uuid.uuid4(),
                    institution_id=DEMO_CAMPUS_ID,
                    case_id=case.id,
                    domain="mentor",
                    generic_label="Initial 1-on-1 Academic Mentorship Session",
                    state="in_progress",
                    assignee_user_id=faculty_user_id,
                    due_at=now + timedelta(days=2),
                    idempotency_key=f"task-init-{case.id}-1",
                )
                task2 = CaseTask(
                    id=uuid.uuid4(),
                    institution_id=DEMO_CAMPUS_ID,
                    case_id=case.id,
                    domain="counselling",
                    generic_label="Student Wellness Resource Check",
                    state="pending",
                    assignee_user_id=DEMO_USERS["counselor"]["id"],
                    due_at=now + timedelta(days=5),
                    idempotency_key=f"task-init-{case.id}-2",
                )
                session.add_all([task1, task2])

                # Add Follow-up
                fu = FollowUp(
                    id=uuid.uuid4(),
                    institution_id=DEMO_CAMPUS_ID,
                    case_id=case.id,
                    follow_up_type="contact_attempt",
                    contact_status="student_reached",
                    proof_kind="appointment_record",
                    occurred_at=now - timedelta(hours=1),
                    recorded_by=faculty_user_id,
                    sanitized_note="Student met in office; confirmed commuting challenges affecting morning sessions.",
                    proof_ref="CAL-OFFICE-OCT12",
                    idempotency_key=f"fu-init-{case.id}",
                )
                session.add(fu)

                # Add Event
                evt = CaseEvent(
                    id=uuid.uuid4(),
                    institution_id=DEMO_CAMPUS_ID,
                    case_id=case.id,
                    event_type="STATE_TRANSITION",
                    actor_user_id=faculty_user_id,
                    actor_kind="USER",
                    from_state="ACCEPTED",
                    to_state="IN_PROGRESS",
                    reason_code="FOLLOWUP_INITIATED",
                    event_metadata={"initiated_by": "Prof. Ananya Sharma"},
                    idempotency_key=f"evt-init-{case.id}",
                )
                session.add(evt)
                print("    [+] Created demonstration support case with tasks and follow-up history")

        await session.commit()
        print("[*] SUTRA demo database seeding complete successfully!")


def main():
    parser = argparse.ArgumentParser(description="Seed SUTRA demo data")
    parser.add_argument(
        "--fixture",
        type=str,
        default="docs/fixtures/demo_seed.json",
        help="Path to demo_seed.json fixture file",
    )
    args = parser.parse_args()

    fixture_path = Path(args.fixture)
    if not fixture_path.exists():
        alt = Path("SUTRA_Backend_Docs/fixtures/demo_seed.json")
        if alt.exists():
            fixture_path = alt
        else:
            raise FileNotFoundError(f"Fixture file not found at {args.fixture}")

    asyncio.run(seed_data(fixture_path))


if __name__ == "__main__":
    main()
