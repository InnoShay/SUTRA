import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class CBDCVoucherIssueRequest(BaseModel):
    student_ref: str = Field(..., description="Pseudonymous student reference (e.g. SYN-1007)")
    amount_inr: float = Field(..., ge=1.0, le=50000.0, description="Incentive reward value in INR (e₹)")
    purpose_code: str = Field(..., description="Purpose code, e.g. ACADEMIC_PERSISTENCE_REWARD, ATTENDANCE_RECOVERY")
    milestone_ref: str = Field(..., description="Milestone reference identifier")
    campus_id: str = Field(..., description="Issuing campus tenant identifier")


class CBDCVoucherRecord(BaseModel):
    voucher_id: str
    student_ref: str
    amount_inr: float
    currency: str = "INR (e₹ Digital Rupee)"
    purpose_code: str
    milestone_ref: str
    campus_id: str
    status: str  # "SIMULATED_ISSUED", "SIMULATED_REDEEMED", "PENDING_PSP_CLEARING"
    is_simulated: bool = True
    disclaimer: str = (
        "SIMULATED ADAPTER: SUTRA has NOT transferred real Central Bank Digital Currency (CBDC / e₹). "
        "Production execution requires formal RBI / SBI Corporate Banking PSP authorization."
    )
    issued_at: datetime
    redeemed_at: Optional[datetime] = None
    transaction_reference: Optional[str] = None


class CBDCProvider(ABC):
    """
    Abstract integration boundary for State Bank of India (SBI) Digital Rupee (e₹)
    Central Bank Digital Currency (CBDC) tokenized reward rails.
    """

    @abstractmethod
    async def issue_incentive_voucher(
        self, request: CBDCVoucherIssueRequest
    ) -> CBDCVoucherRecord:
        """Issues a programmable, tokenized e₹ voucher to an eligible learner."""
        pass

    @abstractmethod
    async def redeem_voucher(
        self, voucher_id: str, campus_id: str
    ) -> CBDCVoucherRecord:
        """Redeems an e₹ voucher at an authorized campus merchant."""
        pass

    @abstractmethod
    async def query_voucher_status(
        self, voucher_id: str, campus_id: str
    ) -> Optional[CBDCVoucherRecord]:
        """Queries status of an existing voucher from the settlement rail."""
        pass


class SimulatedSBIDigitalRupeeProvider(CBDCProvider):
    """
    Simulated implementation of the SBI Digital Rupee provider boundary for hackathon demonstrations.
    All transactions are explicitly labeled as SIMULATED.
    """

    def __init__(self):
        # In-memory registry for mock verification
        self._ledger: Dict[str, CBDCVoucherRecord] = {}

    async def issue_incentive_voucher(
        self, request: CBDCVoucherIssueRequest
    ) -> CBDCVoucherRecord:
        voucher_id = f"eR-SIM-{uuid.uuid4().hex[:12].upper()}"
        now = datetime.now(timezone.utc)
        record = CBDCVoucherRecord(
            voucher_id=voucher_id,
            student_ref=request.student_ref,
            amount_inr=request.amount_inr,
            purpose_code=request.purpose_code,
            milestone_ref=request.milestone_ref,
            campus_id=request.campus_id,
            status="SIMULATED_ISSUED",
            is_simulated=True,
            issued_at=now,
            transaction_reference=f"SBI-CBDC-SIM-TX-{uuid.uuid4().hex[:8].upper()}",
        )
        self._ledger[voucher_id] = record
        return record

    async def redeem_voucher(
        self, voucher_id: str, campus_id: str
    ) -> CBDCVoucherRecord:
        record = self._ledger.get(voucher_id)
        if not record:
            now = datetime.now(timezone.utc)
            record = CBDCVoucherRecord(
                voucher_id=voucher_id,
                student_ref="SYN-1007",
                amount_inr=500.0,
                purpose_code="ACADEMIC_PERSISTENCE_REWARD",
                milestone_ref="MILESTONE-W5-CHECKIN",
                campus_id=campus_id,
                status="SIMULATED_REDEEMED",
                is_simulated=True,
                issued_at=now,
                redeemed_at=now,
                transaction_reference=f"SBI-CBDC-SIM-TX-{uuid.uuid4().hex[:8].upper()}",
            )
            self._ledger[voucher_id] = record
            return record

        now = datetime.now(timezone.utc)
        updated = record.model_copy(update={
            "status": "SIMULATED_REDEEMED",
            "redeemed_at": now,
        })
        self._ledger[voucher_id] = updated
        return updated

    async def query_voucher_status(
        self, voucher_id: str, campus_id: str
    ) -> Optional[CBDCVoucherRecord]:
        return self._ledger.get(voucher_id)


# Global singleton provider instance
sbi_cbdc_provider = SimulatedSBIDigitalRupeeProvider()
