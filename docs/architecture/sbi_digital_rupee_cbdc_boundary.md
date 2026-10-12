# SUTRA — SBI Digital Rupee (e₹ / CBDC) Integration Architecture & Future Boundary

## 1. Executive Summary & Purpose

The SUTRA platform (Student Success and Intervention Orchestration Engine) evaluates academic persistence, milestone completion, and retention interventions. To encourage positive learning behaviors and persistence milestones, SUTRA provides an architectural boundary for **programmable student incentive vouchers** settled via the Reserve Bank of India (RBI) / State Bank of India (SBI) Digital Rupee (e₹ / CBDC) network.

**HACKATHON IMPLEMENTATION STATUS: SIMULATED READY ONLY**
In compliance with strict financial governance and legal regulations:
- SUTRA **does not** transfer real e₹ currency in this hackathon prototype.
- No production bank credentials, private keys, or API tokens are fabricated or committed.
- All simulated transactions are prominently labeled as `SIMULATED_ISSUED` or `SIMULATED_REDEEMED`.
- The document integrity & blockchain anchoring features (Base Sepolia) operate **independently** of CBDC availability.

---

## 2. External Prerequisites for Production Live Deployment

Before connecting SUTRA to the live State Bank of India e₹-R (Retail CBDC) programmable payment gateway, the institution must complete the following mandatory steps:

| Step | Requirement | Responsible Entity | Deliverable / Output |
| :--- | :--- | :--- | :--- |
| **1** | **Authorized Institutional SBI Relationship Contact** | University CFO / Financial Administration | Dedicated SBI Corporate Banking Relationship Manager (RM) and Fintech Alliances onboarding ticket. |
| **2** | **Corporate CBDC Escrow & Merchant Wallet Onboarding** | SBI Transaction Banking Unit | Institutional Escrow VPA / Corporate e₹ Wallet ID with multi-signature authorization limits. |
| **3** | **Sandbox API Specifications & SDK Access** | SBI Digital Banking / RBI Innovation Hub | Formal API Swagger/OpenAPI documentation for Programmable e₹ (e-RUPI / CBDC-R Purpose-Bound Vouchers). |
| **4** | **Mutual TLS (mTLS) & HSM Key Registration** | Campus IT Security | X.509 Certificate Exchange and Hardware Security Module (HSM) signing key setup. |
| **5** | **Merchant Category Code (MCC) Whitelisting** | University & SBI Merchant Services | Whitelist of eligible student redemption merchants (campus bookstore, cafeteria, tuition offset, certified tutoring). |
| **6** | **Daily Clearing & Reconciliation Rails** | University Bursar | Automated SFTP / Webhook settlement journal matching SUTRA milestone receipts against SBI core banking ledgers. |

---

## 3. Programmable CBDC Incentive Lifecycle Architecture

```
+-----------------------------------------------------------------------------------------+
|                                    SUTRA ENGINE                                          |
|                                                                                         |
|  [Case Milestone Achieved]  -->  [Intervention Completed]  -->  [Faculty / Mentor Sign-off]
+---------------------------------------------+-------------------------------------------+
                                              |
                                              v
                              +-------------------------------+
                              |    CBDCProvider Interface     |
                              |  (app/services/cbdc/provider) |
                              +---------------+---------------+
                                              |
                       +----------------------+----------------------+
                       |                                             |
                       v                                             v
           [Simulated Adapter]                         [Future SBI e₹ Gateway]
        (Hackathon Demo Mode: Active)               (Production Stage: External Spec)
        - Issue Voucher Reference                  - POST /v1/cbdc/vouchers/issue
        - In-memory mock ledger                    - mTLS Signature via Institutional HSM
        - Zero financial risk                      - Direct Push to Student e₹ App (SMS/QR)
```

### Purpose-Bound Programmability
Under RBI circular guidelines for programmable CBDC, vouchers issued through SUTRA are restricted by:
- **MCC Category**: `8299` (Educational Services), `5942` (Bookstores), `5814` (Campus Canteen).
- **Expiry Period**: 60-day milestone window from issue date.
- **Non-Transferability**: Locked to the student recipient's verified mobile number / e₹ identity token.

---

## 4. Software Interface Specification (`CBDCProvider`)

SUTRA exposes a unified, modular Python interface located at `app/services/cbdc/provider.py`:

```python
class CBDCProvider(ABC):
    @abstractmethod
    async def issue_incentive_voucher(self, request: CBDCVoucherIssueRequest) -> CBDCVoucherRecord: ...

    @abstractmethod
    async def redeem_voucher(self, voucher_id: str, campus_id: str) -> CBDCVoucherRecord: ...

    @abstractmethod
    async def query_voucher_status(self, voucher_id: str, campus_id: str) -> Optional[CBDCVoucherRecord]: ...
```

### Canonical Request Payload
```json
{
  "student_ref": "SYN-1007",
  "amount_inr": 500.0,
  "purpose_code": "ACADEMIC_PERSISTENCE_REWARD",
  "milestone_ref": "MILESTONE-W5-CHECKIN",
  "campus_id": "00000000-0000-0000-0000-000000000001"
}
```

---

## 5. Security & Privacy Safeguards (ADR-003 Compliance)

1. **Separation of Student Records from Bank Transactions**: SUTRA internal databases never store student bank account numbers, UPI PINs, or CBDC wallet private seeds.
2. **Pseudonymous Milestone Anchoring**: When communicating with the SBI voucher gateway, only the pseudonymous student reference (`SYN-1007`) or tokenized mobile hash is transmitted.
3. **Audit Ledger Alignment**: All voucher issues and status changes are recorded in SUTRA's immutable audit log alongside the associated student support case.
