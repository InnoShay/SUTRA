# ADR-004 · FastAPI Backend Architecture with SQLAlchemy 2.x and Alembic
- **Status:** Accepted (Reconciled Canonical Target).
- **Context:** The SUTRA product backend must support high-concurrency asynchronous I/O, server-side JWT authentication, rigorous request validation, transactional database operations, and native interoperability with Python scientific/ML libraries (`pandas`, `scikit-learn`, `numpy`).
- **Decision:** Build the main application server using **FastAPI** on Python 3.10+, utilizing:
  1. **Pydantic v2:** For request validation, data serialization, and response schemas with strict type safety and high performance.
  2. **SQLAlchemy 2.x (Async):** As the object-relational mapping and query abstraction layer, operating in 2.0-style syntax over `asyncpg`.
  3. **Alembic:** For version-controlled, reproducible database schema migrations.
  4. **Supabase Auth JWT Verification:** Enforced in FastAPI dependency injection (`get_current_user`, `get_campus_membership`) by verifying cryptographic signatures with server-held secrets on every protected route.
  5. **Pytest & HTTPX:** For comprehensive unit, integration, and security negative test suites.
- **Consequences:**
  - High developer velocity and automatic OpenAPI 3.1 documentation generation.
  - Native Python interoperability with the internal `sutra_ml` inference engine.
  - Strict compile-time and runtime typing across API boundaries.
- **Rejected Alternatives:**
  - Django / DRF (rejected: heavy runtime overhead, synchronous defaults, less flexible async I/O).
  - Flask (rejected: lacks native modern async support, lacks built-in Pydantic OpenAPI integration).
- **Review Trigger:** Incompatible dependency conflicts or major architectural framework shifts.
