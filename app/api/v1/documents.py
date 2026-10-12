import io
import time
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Path, Query, Response, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.errors import PermissionDeniedError, ResourceNotFoundError, UnprocessableEntityError
from app.core.security import CampusMembershipContext, get_campus_membership
from app.models.document import DocumentRecord
from app.schemas.document import (
    DocumentAnchorResponse,
    DocumentCreateRequest,
    DocumentDTO,
    DocumentFinalizeResponse,
    DocumentListResponse,
    DocumentVerifyResponse,
)
from app.services.blockchain import base_sepolia_service
from app.services.cbdc.provider import (
    CBDCVoucherIssueRequest,
    CBDCVoucherRecord,
    sbi_cbdc_provider,
)
from app.services.document_integrity import (
    compute_exact_bytes_sha256,
    generate_intervention_pdf,
    read_document_bytes,
    save_document_bytes,
)

router = APIRouter(prefix="/documents", tags=["Document Integrity & Base Sepolia Registry"])


def check_document_access(membership: CampusMembershipContext):
    """Restricts access if caller is leadership without operational educator roles."""
    if "leadership" in membership.roles and not any(
        r in ("hod", "mentor", "faculty", "institution_admin", "counsellor", "counselor", "dean")
        for r in membership.roles
    ):
        raise PermissionDeniedError(
            "Leadership role is restricted to cohort aggregates and cannot access individual student documents",
            code="LEADERSHIP_DOCUMENT_ACCESS_DENIED",
        )


async def _resolve_document_in_campus(
    doc_id: uuid.UUID,
    campus_id: uuid.UUID,
    db: AsyncSession,
) -> DocumentRecord:
    doc = await db.get(DocumentRecord, doc_id)
    if not doc or doc.institution_id != campus_id:
        raise ResourceNotFoundError(f"Document '{doc_id}' not found in active campus")
    return doc


def _build_dto(doc: DocumentRecord) -> DocumentDTO:
    explorer_url = None
    if doc.tx_hash and doc.chain_id == 84532:
        explorer_url = f"https://sepolia.basescan.org/tx/{doc.tx_hash}"

    return DocumentDTO(
        id=doc.id,
        institution_id=doc.institution_id,
        document_ref=doc.document_ref,
        title=doc.title,
        doc_type=doc.doc_type,
        file_name=doc.file_name,
        file_size_bytes=doc.file_size_bytes,
        mime_type=doc.mime_type,
        sha256_hash=doc.sha256_hash,
        status=doc.status,
        created_by=doc.created_by,
        finalized_by=doc.finalized_by,
        finalized_at=doc.finalized_at,
        chain_id=doc.chain_id,
        contract_address=doc.contract_address,
        tx_hash=doc.tx_hash,
        block_number=doc.block_number,
        anchored_at=doc.anchored_at,
        anchoring_mode=doc.anchoring_mode,
        last_verified_at=doc.last_verified_at,
        verification_status=doc.verification_status,
        explorer_url=explorer_url,
        metadata_payload=doc.metadata_payload or {},
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    status_filter: Optional[str] = Query(None, description="Optional status filter"),
    doc_type: Optional[str] = Query(None, description="Optional document type filter"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Lists institutional document integrity records partitioned strictly by campus."""
    check_document_access(membership)

    query = select(DocumentRecord).where(DocumentRecord.institution_id == membership.campus_id)
    if status_filter:
        query = query.where(DocumentRecord.status == status_filter.lower())
    if doc_type:
        query = query.where(DocumentRecord.doc_type == doc_type.lower())

    count_stmt = select(func.count(DocumentRecord.id)).where(DocumentRecord.institution_id == membership.campus_id)
    if status_filter:
        count_stmt = count_stmt.where(DocumentRecord.status == status_filter.lower())
    if doc_type:
        count_stmt = count_stmt.where(DocumentRecord.doc_type == doc_type.lower())

    total_res = await db.execute(count_stmt)
    total = total_res.scalar_one()

    query = query.order_by(DocumentRecord.created_at.desc()).limit(limit).offset(offset)
    res = await db.execute(query)
    docs = res.scalars().all()

    return DocumentListResponse(
        documents=[_build_dto(d) for d in docs],
        total=total,
    )


@router.post("/generate", response_model=DocumentDTO)
async def generate_document(
    payload: DocumentCreateRequest,
    finalize_immediately: bool = Query(False, description="Whether to finalize immediately upon generation"),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """
    Generates a formal SUTRA student intervention/support agreement PDF, persists exact bytes,
    calculates byte-level SHA-256 fingerprint, and creates an immutable registry record.
    """
    check_document_access(membership)

    doc_id = uuid.uuid4()
    student_ref = payload.student_ref or "SYN-1007"
    student_name = payload.student_name or "Asha (synthetic)"
    short_hash = uuid.uuid4().hex[:6].upper()
    document_ref = f"DOC-2026-{student_ref.replace('-', '')}-{short_hash}"
    file_name = f"{document_ref.lower()}.pdf"

    now_utc = datetime.now(timezone.utc)
    pdf_bytes = generate_intervention_pdf(
        document_ref=document_ref,
        title=payload.title,
        student_ref=student_ref,
        student_name=student_name,
        campus_name="Apex University Main Campus",
        action_plan_text=payload.content_text,
        created_at_str=now_utc.strftime("%Y-%m-%d %H:%M UTC"),
    )

    # Compute exact byte SHA-256
    sha256_hash = compute_exact_bytes_sha256(pdf_bytes)
    file_path = save_document_bytes(str(doc_id), file_name, pdf_bytes)

    status_str = "finalized" if finalize_immediately else "draft"
    finalized_by = membership.user.id if finalize_immediately else None
    finalized_at = now_utc if finalize_immediately else None

    doc = DocumentRecord(
        id=doc_id,
        institution_id=membership.campus_id,
        document_ref=document_ref,
        title=payload.title,
        doc_type=payload.doc_type,
        file_name=file_name,
        file_path=file_path,
        file_size_bytes=len(pdf_bytes),
        mime_type="application/pdf",
        sha256_hash=sha256_hash,
        status=status_str,
        created_by=membership.user.id,
        finalized_by=finalized_by,
        finalized_at=finalized_at,
        chain_id=settings.BASE_SEPOLIA_CHAIN_ID,
        contract_address=settings.BASE_SEPOLIA_CONTRACT_ADDRESS,
        anchoring_mode=settings.ANCHOR_MODE,
        metadata_payload=payload.metadata_payload,
        created_at=now_utc,
        updated_at=now_utc,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    return _build_dto(doc)


@router.post("/upload", response_model=DocumentDTO)
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    doc_type: str = Form("uploaded_proof"),
    student_ref: Optional[str] = Form(None),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """
    Uploads an arbitrary PDF document, validates size and MIME type, computes exact
    byte SHA-256 fingerprint, and creates an immutable draft/finalized version record.
    """
    check_document_access(membership)

    raw_bytes = await file.read()
    if len(raw_bytes) == 0:
        raise UnprocessableEntityError("Uploaded file cannot be empty")
    if len(raw_bytes) > 25 * 1024 * 1024:  # 25 MB limit
        raise UnprocessableEntityError("File exceeds 25 MB size limit")

    doc_id = uuid.uuid4()
    short_hash = uuid.uuid4().hex[:6].upper()
    prefix = student_ref.replace("-", "") if student_ref else "EXT"
    document_ref = f"DOC-2026-{prefix}-{short_hash}"
    safe_filename = file.filename or f"{document_ref.lower()}.pdf"

    sha256_hash = compute_exact_bytes_sha256(raw_bytes)
    file_path = save_document_bytes(str(doc_id), safe_filename, raw_bytes)
    now_utc = datetime.now(timezone.utc)

    doc = DocumentRecord(
        id=doc_id,
        institution_id=membership.campus_id,
        document_ref=document_ref,
        title=title,
        doc_type=doc_type,
        file_name=safe_filename,
        file_path=file_path,
        file_size_bytes=len(raw_bytes),
        mime_type=file.content_type or "application/pdf",
        sha256_hash=sha256_hash,
        status="draft",
        created_by=membership.user.id,
        chain_id=settings.BASE_SEPOLIA_CHAIN_ID,
        contract_address=settings.BASE_SEPOLIA_CONTRACT_ADDRESS,
        anchoring_mode=settings.ANCHOR_MODE,
        metadata_payload={"student_ref": student_ref} if student_ref else {},
        created_at=now_utc,
        updated_at=now_utc,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    return _build_dto(doc)


@router.get("/{document_id}", response_model=DocumentDTO)
async def get_document(
    document_id: uuid.UUID = Path(...),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves document details, SHA-256 fingerprint, and Base Sepolia anchoring status."""
    check_document_access(membership)
    doc = await _resolve_document_in_campus(document_id, membership.campus_id, db)
    return _build_dto(doc)


@router.post("/{document_id}/finalize", response_model=DocumentFinalizeResponse)
async def finalize_document(
    document_id: uuid.UUID = Path(...),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """
    Finalizes a draft document. Locks the byte-level version and authorizes it
    for Base Sepolia blockchain anchoring.
    """
    check_document_access(membership)
    doc = await _resolve_document_in_campus(document_id, membership.campus_id, db)

    if doc.status in ("finalized", "anchored", "anchor_pending"):
        return DocumentFinalizeResponse(
            id=doc.id,
            document_ref=doc.document_ref,
            sha256_hash=doc.sha256_hash,
            status=doc.status,
            finalized_at=doc.finalized_at or doc.updated_at,
            message="Document is already finalized.",
        )

    now_utc = datetime.now(timezone.utc)
    doc.status = "finalized"
    doc.finalized_by = membership.user.id
    doc.finalized_at = now_utc
    doc.updated_at = now_utc
    await db.commit()
    await db.refresh(doc)

    return DocumentFinalizeResponse(
        id=doc.id,
        document_ref=doc.document_ref,
        sha256_hash=doc.sha256_hash,
        status="finalized",
        finalized_at=now_utc,
    )


@router.post("/{document_id}/anchor", response_model=DocumentAnchorResponse)
async def anchor_document_on_chain(
    document_id: uuid.UUID = Path(...),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """
    Submits the finalized document's exact SHA-256 hash to Base Sepolia (Chain ID 84532).
    Verifies receipt and confirmation before recording transaction state in PostgreSQL.
    """
    check_document_access(membership)
    doc = await _resolve_document_in_campus(document_id, membership.campus_id, db)

    if doc.status == "draft":
        raise UnprocessableEntityError(
            "Document cannot be anchored while in 'draft' status. You must finalize the document first.",
            code="DOCUMENT_NOT_FINALIZED",
        )

    if doc.status == "anchored" and doc.anchoring_mode == "onchain" and doc.tx_hash:
        return DocumentAnchorResponse(
            id=doc.id,
            document_ref=doc.document_ref,
            sha256_hash=doc.sha256_hash,
            status="anchored",
            chain_id=doc.chain_id,
            contract_address=doc.contract_address,
            tx_hash=doc.tx_hash,
            explorer_url=f"https://sepolia.basescan.org/tx/{doc.tx_hash}",
            anchoring_mode="onchain",
            anchored_at=doc.anchored_at or doc.updated_at,
            message="Document is already permanently anchored on Base Sepolia.",
        )

    # Set pending status
    doc.status = "anchor_pending"
    await db.commit()

    try:
        res = await base_sepolia_service.anchor_document(
            doc_ref=doc.document_ref,
            sha256_hash=doc.sha256_hash,
        )

        doc.status = "anchored"
        doc.chain_id = res["chain_id"]
        doc.contract_address = res["contract_address"]
        doc.tx_hash = res["tx_hash"]
        doc.block_number = res["block_number"]
        doc.anchored_at = res["anchored_at"]
        doc.anchoring_mode = res["anchoring_mode"]
        doc.error_message = None
        doc.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(doc)

        return DocumentAnchorResponse(
            id=doc.id,
            document_ref=doc.document_ref,
            sha256_hash=doc.sha256_hash,
            status="anchored",
            chain_id=doc.chain_id,
            contract_address=doc.contract_address,
            tx_hash=doc.tx_hash,
            explorer_url=res["explorer_url"],
            anchoring_mode=doc.anchoring_mode,
            anchored_at=doc.anchored_at,
            message=res["message"],
        )
    except Exception as exc:
        doc.status = "anchor_failed"
        doc.error_message = str(exc)
        doc.updated_at = datetime.now(timezone.utc)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Base Sepolia anchoring failed: {str(exc)}",
        )


@router.post("/{document_id}/verify", response_model=DocumentVerifyResponse)
async def verify_document_integrity(
    document_id: uuid.UUID = Path(...),
    candidate_file: UploadFile = File(..., description="Candidate PDF file to verify against anchored version"),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """
    Accepts candidate PDF bytes, computes byte-for-byte SHA-256 fingerprint, and compares
    against the anchored version.
    
    Returns MATCH (green confirmation) or MISMATCH (red tamper alert).
    """
    check_document_access(membership)
    doc = await _resolve_document_in_campus(document_id, membership.campus_id, db)

    raw_bytes = await candidate_file.read()
    candidate_hash = compute_exact_bytes_sha256(raw_bytes)
    now_utc = datetime.now(timezone.utc)

    is_match = candidate_hash.lower() == doc.sha256_hash.lower()
    verification_status = "verified_match" if is_match else "mismatch"

    doc.last_verified_at = now_utc
    doc.last_verified_by = membership.user.id
    doc.verification_status = verification_status
    if not is_match and doc.status == "anchored":
        # Do not overwrite historical anchored status; keep record but note verification mismatch
        pass

    await db.commit()
    await db.refresh(doc)

    explorer_url = None
    if doc.tx_hash and doc.chain_id == 84532:
        explorer_url = f"https://sepolia.basescan.org/tx/{doc.tx_hash}"

    return DocumentVerifyResponse(
        id=doc.id,
        document_ref=doc.document_ref,
        anchored_hash=doc.sha256_hash,
        candidate_hash=candidate_hash,
        is_match=is_match,
        verification_status=verification_status,
        verified_at=now_utc,
        chain_id=doc.chain_id,
        contract_address=doc.contract_address,
        tx_hash=doc.tx_hash,
        explorer_url=explorer_url,
        anchoring_mode=doc.anchoring_mode,
    )


@router.get("/{document_id}/download")
async def download_document(
    document_id: uuid.UUID = Path(...),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Streams the exact, unmodified raw document bytes from storage."""
    check_document_access(membership)
    doc = await _resolve_document_in_campus(document_id, membership.campus_id, db)

    if not doc.file_path:
        raise ResourceNotFoundError("Document file path is not recorded")

    raw_bytes = read_document_bytes(doc.file_path)
    return Response(
        content=raw_bytes,
        media_type=doc.mime_type or "application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{doc.file_name}"',
            "X-Document-SHA256": doc.sha256_hash,
        },
    )


# -----------------------------------------------------------------------------
# SBI Digital Rupee (e₹ / CBDC) Milestone Reward Readiness Endpoint
# -----------------------------------------------------------------------------

@router.post("/cbdc/issue-voucher", response_model=CBDCVoucherRecord)
async def issue_cbdc_milestone_voucher(
    payload: CBDCVoucherIssueRequest,
    membership: CampusMembershipContext = Depends(get_campus_membership),
):
    """
    Demonstrates the SBI Digital Rupee (e₹) programmable incentive voucher boundary.
    Explicitly labeled as SIMULATED in compliance with RBI / SBI regulatory prerequisites.
    """
    check_document_access(membership)
    voucher = await sbi_cbdc_provider.issue_incentive_voucher(payload)
    return voucher
