#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CLI_DIR="${REPO_ROOT}/cli"

echo "=== SUTRA CLI: Automated Build & Verification ==="
echo "Repository: ${REPO_ROOT}"
echo "Manifest:   ${CLI_DIR}/Cargo.toml"

# 1. Prerequisite checks
if ! command -v cargo >/dev/null 2>&1; then
    echo "Error: 'cargo' is not installed or not in PATH. Please install Rust (https://rustup.rs/)." >&2
    exit 1
fi

echo "Rust toolchain: $(cargo --version)"

# 2. Complete Test Suite
echo ""
echo "--- Running Complete Rust Test Suite (cargo test) ---"
cargo test --manifest-path "${CLI_DIR}/Cargo.toml"

# 3. Development Build
echo ""
echo "--- Building CLI in Development Mode ---"
cargo build --manifest-path "${CLI_DIR}/Cargo.toml"

# 4. Release Build (Optimized)
echo ""
echo "--- Building Optimized Release Binary ---"
cargo build --release --manifest-path "${CLI_DIR}/Cargo.toml"

BINARY_PATH="${CLI_DIR}/target/release/sutra"
if [[ ! -f "${BINARY_PATH}" ]]; then
    echo "Error: Release binary not found at ${BINARY_PATH}" >&2
    exit 1
fi

# 5. Verify Binary Functionality
echo ""
echo "--- Verifying Release Binary Functionality ---"
VERSION_OUTPUT="$("${BINARY_PATH}" --version)"
echo "Version: ${VERSION_OUTPUT}"

echo "Help banner test:"
"${BINARY_PATH}" --help >/dev/null
echo "✓ Binary successfully starts and exposes help."

echo ""
echo "=== SUTRA CLI Build Verification Passed Successfully ==="
echo "Binary location: ${BINARY_PATH}"
