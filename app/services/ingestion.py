import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import List, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.institution import Institution
from app.models.observation import FinanceObservation, SourceImport, StudentObservation
from app.models.student import Student
from app.schemas.ingestion import (
    ImportBatchRequest,
    ImportBatchResponse,
    ImportErrorItem,
)


class IngestionService:
    """Handles multi-domain observation ingestion, temporal validation, and deduplication."""

    @staticmethod
    async def process_batch_import(
        db: AsyncSession,
        campus_id: uuid.UUID,
        user_id: uuid.UUID,
        batch: ImportBatchRequest,
        idempotency_key: str,
    ) -> ImportBatchResponse:
        # Check if this idempotency key was already processed for this campus
        existing_import_query = select(SourceImport).where(
            SourceImport.institution_id == campus_id,
            SourceImport.idempotency_key == idempotency_key,
        )
        existing_res = await db.execute(existing_import_query)
        existing_import = existing_res.scalar_one_or_none()
        if existing_import:
            # Return cached/existing import result
            row_errors = [ImportErrorItem(**err) for err in existing_import.row_errors]
            return ImportBatchResponse(
                import_id=existing_import.id,
                status=existing_import.status,
                rows_received=existing_import.rows_received,
                rows_accepted=existing_import.rows_accepted,
                rows_duplicate=existing_import.rows_duplicate,
                rows_rejected=existing_import.rows_rejected,
                row_errors=row_errors,
            )

        # Compute payload digest
        payload_bytes = json.dumps(batch.model_dump(), default=str, sort_keys=True).encode("utf-8")
        file_digest = hashlib.sha256(payload_bytes).hexdigest()

        # Cache existing students for this campus
        students_query = select(Student).where(Student.institution_id == campus_id)
        students_res = await db.execute(students_query)
        students_by_ref = {s.external_ref: s for s in students_res.scalars().all()}

        import_id = uuid.uuid4()
        now = datetime.now(timezone.utc)

        rows_received = len(batch.observations) + len(batch.finance_observations)
        rows_accepted = 0
        rows_duplicate = 0
        rows_rejected = 0
        row_errors: List[ImportErrorItem] = []

        # 1. Process general observations (5 domains)
        for idx, obs in enumerate(batch.observations):
            student = students_by_ref.get(obs.external_student_ref)
            if not student:
                rows_rejected += 1
                row_errors.append(
                    ImportErrorItem(
                        row_index=idx,
                        code="UNKNOWN_STUDENT_REFERENCE",
                        message=f"Student reference '{obs.external_student_ref}' does not exist in campus.",
                        ref=obs.external_student_ref,
                    )
                )
                continue

            # Temporal sequence check: available_at cannot precede event_at
            if obs.available_at and obs.available_at < obs.event_at:
                rows_rejected += 1
                row_errors.append(
                    ImportErrorItem(
                        row_index=idx,
                        code="INVALID_TEMPORAL_SEQUENCE",
                        message=f"available_at ({obs.available_at}) cannot precede event_at ({obs.event_at}).",
                        ref=obs.source_record_ref,
                    )
                )
                continue

            # Check deduplication
            dup_query = select(StudentObservation.id).where(
                StudentObservation.institution_id == campus_id,
                StudentObservation.source_system == obs.source_system,
                StudentObservation.source_record_ref == obs.source_record_ref,
                StudentObservation.source_version == obs.source_version,
            )
            dup_res = await db.execute(dup_query)
            if dup_res.scalar_one_or_none():
                rows_duplicate += 1
                continue

            # Wrap non-dict value in dict for JSON storage
            val_payload = obs.value if isinstance(obs.value, dict) else {"val": obs.value}

            db_obs = StudentObservation(
                id=uuid.uuid4(),
                institution_id=campus_id,
                student_id=student.id,
                domain=obs.domain,
                metric_key=obs.metric_key,
                value=val_payload,
                unit=obs.unit,
                event_at=obs.event_at,
                available_at=obs.available_at or obs.event_at,
                ingested_at=now,
                source_system=obs.source_system,
                source_record_ref=obs.source_record_ref,
                source_version=obs.source_version,
                quality_state=obs.quality_state,
                import_id=import_id,
                created_at=now,
            )
            db.add(db_obs)
            rows_accepted += 1

        # 2. Process finance observations (segregated domain per ADR-003)
        base_offset = len(batch.observations)
        for idx, fin_obs in enumerate(batch.finance_observations):
            student = students_by_ref.get(fin_obs.external_student_ref)
            if not student:
                rows_rejected += 1
                row_errors.append(
                    ImportErrorItem(
                        row_index=base_offset + idx,
                        code="UNKNOWN_STUDENT_REFERENCE",
                        message=f"Student reference '{fin_obs.external_student_ref}' does not exist in campus.",
                        ref=fin_obs.external_student_ref,
                    )
                )
                continue

            if fin_obs.available_at and fin_obs.available_at < fin_obs.event_at:
                rows_rejected += 1
                row_errors.append(
                    ImportErrorItem(
                        row_index=base_offset + idx,
                        code="INVALID_TEMPORAL_SEQUENCE",
                        message=f"available_at ({fin_obs.available_at}) cannot precede event_at ({fin_obs.event_at}).",
                        ref=fin_obs.source_record_ref,
                    )
                )
                continue

            dup_query = select(FinanceObservation.id).where(
                FinanceObservation.institution_id == campus_id,
                FinanceObservation.source_system == fin_obs.source_system,
                FinanceObservation.source_record_ref == fin_obs.source_record_ref,
                FinanceObservation.source_version == fin_obs.source_version,
            )
            dup_res = await db.execute(dup_query)
            if dup_res.scalar_one_or_none():
                rows_duplicate += 1
                continue

            db_fin_obs = FinanceObservation(
                id=uuid.uuid4(),
                institution_id=campus_id,
                student_id=student.id,
                fee_support_status=fin_obs.fee_support_status,
                event_at=fin_obs.event_at,
                available_at=fin_obs.available_at or fin_obs.event_at,
                ingested_at=now,
                source_system=fin_obs.source_system,
                source_record_ref=fin_obs.source_record_ref,
                source_version=fin_obs.source_version,
                quality_state=fin_obs.quality_state,
                import_id=import_id,
                created_at=now,
            )
            db.add(db_fin_obs)
            rows_accepted += 1

        # Determine import status
        if rows_rejected > 0:
            import_status = "completed_with_errors" if rows_accepted > 0 else "failed"
        else:
            import_status = "completed"

        # Record source_imports row
        db_import = SourceImport(
            id=import_id,
            institution_id=campus_id,
            source_system=batch.source_system,
            schema_version=batch.schema_version,
            file_digest=file_digest,
            idempotency_key=idempotency_key,
            status=import_status,
            received_by=user_id,
            received_at=now,
            completed_at=datetime.now(timezone.utc),
            rows_received=rows_received,
            rows_accepted=rows_accepted,
            rows_duplicate=rows_duplicate,
            rows_rejected=rows_rejected,
            row_errors=[err.model_dump() for err in row_errors],
        )
        db.add(db_import)
        await db.commit()

        return ImportBatchResponse(
            import_id=import_id,
            status=import_status,
            rows_received=rows_received,
            rows_accepted=rows_accepted,
            rows_duplicate=rows_duplicate,
            rows_rejected=rows_rejected,
            row_errors=row_errors,
        )
