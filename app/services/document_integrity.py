import hashlib
import io
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from app.core.config import PROJECT_ROOT, settings

logger = logging.getLogger("sutra.documents")


def compute_exact_bytes_sha256(raw_bytes: bytes) -> str:
    """
    Computes exact byte-level SHA-256 fingerprint.
    
    CRITICAL INVARIANT:
    - Never hash a public URL, file path, or filename in place of bytes.
    - Never normalize, sanitize, or re-render document bytes before hashing.
    """
    if not isinstance(raw_bytes, bytes):
        raise TypeError("Input must be raw bytes")
    return hashlib.sha256(raw_bytes).hexdigest().lower()


def get_document_storage_path(document_id: str, file_name: str) -> Path:
    """Returns local storage path for document raw bytes."""
    storage_dir = PROJECT_ROOT / settings.DOCUMENTS_STORAGE_DIR
    storage_dir.mkdir(parents=True, exist_ok=True)
    basename = Path(file_name.replace("\\", "/")).name
    basename = re.sub(r"[^A-Za-z0-9._() -]", "_", basename).strip(" .") or "upload"
    target = (storage_dir / f"{document_id}_{basename[:200]}").resolve()
    if target.parent != storage_dir.resolve():
        raise ValueError("Document storage path escaped the configured storage directory")
    return target


def save_document_bytes(document_id: str, file_name: str, raw_bytes: bytes) -> str:
    """Persists exact bytes to local storage without alteration."""
    path = get_document_storage_path(document_id, file_name)
    with open(path, "wb") as f:
        f.write(raw_bytes)
    return str(path)


def read_document_bytes(file_path: str) -> bytes:
    """Reads raw document bytes from storage."""
    path = Path(file_path)
    if not path.is_absolute():
        path = PROJECT_ROOT / file_path
    if not path.exists():
        raise FileNotFoundError(f"Document file not found at: {path}")
    with open(path, "rb") as f:
        return f.read()


def generate_intervention_pdf(
    document_ref: str,
    title: str,
    student_ref: str = "SYN-1007",
    student_name: str = "Asha (synthetic)",
    campus_name: str = "Apex University Main Campus",
    action_plan_text: Optional[str] = None,
    created_at_str: Optional[str] = None,
) -> bytes:
    """
    Generates a formal, professional SUTRA Student Success & Intervention Agreement PDF.
    Returns exact binary PDF bytes.
    """
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.platypus import (
        SimpleDocTemplate,
        Paragraph,
        Spacer,
        Table,
        TableStyle,
        HRFlowable,
    )
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )

    styles = getSampleStyleSheet()
    header_style = ParagraphStyle(
        "HeaderTitle",
        parent=styles["Heading1"],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0F172A"),
        fontName="Helvetica-Bold",
    )
    subhead_style = ParagraphStyle(
        "SubHead",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#64748B"),
        fontName="Helvetica",
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontSize=10,
        leading=15,
        textColor=colors.HexColor("#1E293B"),
        fontName="Helvetica",
    )
    bold_label = ParagraphStyle(
        "BoldLabel",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#475569"),
        fontName="Helvetica-Bold",
    )
    callout_style = ParagraphStyle(
        "Callout",
        parent=styles["Normal"],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#0369A1"),
        fontName="Helvetica",
    )

    story = []

    # Title & Banner
    story.append(Paragraph("SUTRA — STUDENT SUCCESS ENGINE", subhead_style))
    story.append(Paragraph(title, header_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph(f"Campus Tenancy: {campus_name} | Document ID: {document_ref}", subhead_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0F172A"), spaceAfter=15))

    # Meta Table
    date_display = created_at_str or datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    meta_data = [
        [
            Paragraph("STUDENT IDENTIFIER", bold_label),
            Paragraph(f"{student_name} ({student_ref})", body_style),
            Paragraph("FINALIZATION DATE", bold_label),
            Paragraph(date_display, body_style),
        ],
        [
            Paragraph("POLICY FRAMEWORK", bold_label),
            Paragraph("UG Attendance & Milestone SLA v1.0", body_style),
            Paragraph("BLOCKCHAIN ANCHOR", bold_label),
            Paragraph("Base Sepolia (Chain ID 84532)", body_style),
        ],
    ]
    meta_table = Table(meta_data, colWidths=[120, 160, 110, 140])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 16))

    # Context & Milestones
    story.append(Paragraph("1. INTERVENTION OBJECTIVE & SCOPE", ParagraphStyle("H2", parent=styles["Heading2"], fontSize=12, textColor=colors.HexColor("#0F172A"), fontName="Helvetica-Bold")))
    story.append(Spacer(1, 6))
    plan_desc = (
        action_plan_text or
        "Following early-warning telemetry evaluation, this structured intervention agreement outlines coordinated "
        "remediation steps designed to restore academic persistence, resolve subject assessment backlogs, and ensure "
        "access to dedicated faculty mentoring and campus wellness resources."
    )
    story.append(Paragraph(plan_desc, body_style))
    story.append(Spacer(1, 14))

    # Remediation Action Steps Table
    story.append(Paragraph("2. AGREED MILESTONES & ACTION PLAN", ParagraphStyle("H2", parent=styles["Heading2"], fontSize=12, textColor=colors.HexColor("#0F172A"), fontName="Helvetica-Bold")))
    story.append(Spacer(1, 6))

    steps_data = [
        [
            Paragraph("#", bold_label),
            Paragraph("Remediation Action Step", bold_label),
            Paragraph("Owner", bold_label),
            Paragraph("Target Milestone", bold_label),
        ],
        [
            Paragraph("1", body_style),
            Paragraph("Attend weekly 1-on-1 tutoring sessions for core technical coursework", body_style),
            Paragraph("Academic Support Center", body_style),
            Paragraph("Week 5 Check-in", body_style),
        ],
        [
            Paragraph("2", body_style),
            Paragraph("Submit revised problem set draft and lab diagnostic log", body_style),
            Paragraph("Learner & Faculty Mentor", body_style),
            Paragraph("14-Day SLA", body_style),
        ],
        [
            Paragraph("3", body_style),
            Paragraph("Review attendance recovery threshold (> 75% target attendance)", body_style),
            Paragraph("Course Coordinator", body_style),
            Paragraph("Monthly Audit", body_style),
        ],
    ]
    steps_table = Table(steps_data, colWidths=[25, 275, 120, 110])
    steps_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#94A3B8")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(steps_table)
    story.append(Spacer(1, 16))

    # Cryptographic Integrity Guarantee
    story.append(Paragraph("3. CRYPTOGRAPHIC INTEGRITY & ON-CHAIN ANCHORING", ParagraphStyle("H2", parent=styles["Heading2"], fontSize=12, textColor=colors.HexColor("#0F172A"), fontName="Helvetica-Bold")))
    story.append(Spacer(1, 6))
    integrity_text = (
        "<b>Document integrity:</b> SUTRA computes a SHA-256 fingerprint from this PDF's exact binary bytes. "
        "After the document is finalized, an authorized wallet may anchor that fingerprint to Base Sepolia "
        "through the <code>SutraDocumentRegistry</code>. The document record shows whether an anchor was "
        "actually confirmed. Verification compares a candidate file with the fingerprint stored on-chain."
    )
    story.append(Paragraph(integrity_text, callout_style))
    story.append(Spacer(1, 24))

    # Signature Block
    sig_data = [
        [
            Paragraph("___________________________________<br/><b>Authorized Faculty / Mentor</b>", body_style),
            Paragraph("___________________________________<br/><b>Student Acknowledgment</b>", body_style),
        ]
    ]
    sig_table = Table(sig_data, colWidths=[265, 265])
    sig_table.setStyle(TableStyle([
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(sig_table)
    story.append(Spacer(1, 12))

    # Disclaimer Footer
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CBD5E1"), spaceAfter=8))
    footer_text = (
        "SUTRA Document Integrity Ledger • Confidential Institutional Document • "
        "Byte-level SHA-256 Fingerprint • Base Sepolia anchor status is recorded separately in SUTRA • Governed by FERPA/ADR-003 Privacy Boundaries"
    )
    story.append(Paragraph(footer_text, ParagraphStyle("Footer", parent=styles["Normal"], fontSize=7, textColor=colors.HexColor("#94A3B8"), alignment=1)))

    doc.build(story)
    return buffer.getvalue()
