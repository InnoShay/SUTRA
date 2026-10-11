import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Path, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.errors import ResourceNotFoundError
from app.core.security import CampusMembershipContext, get_campus_membership, require_roles
from app.models.observation import SourceImport
from app.schemas.ingestion import ImportBatchRequest, ImportBatchResponse, ImportErrorItem
from app.services.ingestion import IngestionService

router = APIRouter(prefix="/imports", tags=["Ingestion"])


@router.post("", response_model=ImportBatchResponse, status_code=status.HTTP_201_CREATED)
async def submit_import_batch(
    batch: ImportBatchRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    membership: CampusMembershipContext = Depends(require_roles(["institution_admin", "hod", "faculty"])),
    db: AsyncSession = Depends(get_db),
):
    """Submits multi-domain observation batch with temporal validation and deduplication."""
    if not idempotency_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Header 'Idempotency-Key' is required for batch import mutations",
        )

    return await IngestionService.process_batch_import(
        db=db,
        campus_id=membership.campus_id,
        user_id=membership.user.id,
        batch=batch,
        idempotency_key=idempotency_key,
    )


@router.get("/{import_id}", response_model=ImportBatchResponse)
async def get_import_status(
    import_id: uuid.UUID = Path(...),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves batch import status, row counts, and validation errors."""
    record = await db.get(SourceImport, import_id)
    if not record or record.institution_id != membership.campus_id:
        raise ResourceNotFoundError(f"Import {import_id} not found in active campus")

    row_errors = [ImportErrorItem(**err) for err in record.row_errors]
    return ImportBatchResponse(
        import_id=record.id,
        status=record.status,
        rows_received=record.rows_received,
        rows_accepted=record.rows_accepted,
        rows_duplicate=record.rows_duplicate,
        rows_rejected=record.rows_rejected,
        row_errors=row_errors,
    )
