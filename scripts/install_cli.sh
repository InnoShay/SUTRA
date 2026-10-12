#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CLI_DIR="${REPO_ROOT}/cli"
DEFAULT_DEST="${HOME}/.local/bin"
DEST_DIR="${1:-$DEFAULT_DEST}"

echo "=== SUTRA CLI Installer ==="

# Check OS support
OS_NAME="$(uname -s)"
case "${OS_NAME}" in
    Darwin)
        echo "Detected Platform: macOS (${OS_NAME} $(uname -m)) [Supported]"
        ;;
    Linux)
        echo "Detected Platform: Linux ($(uname -m)) [Supported]"
        ;;
    *)
        echo "Warning: Platform '${OS_NAME}' has not been formally verified. Proceeding with standard POSIX installation."
        ;;
esac

# 1. Locate or build binary
BINARY_SRC="${CLI_DIR}/target/release/sutra"
if [[ ! -f "${BINARY_SRC}" ]]; then
    echo "Release binary not found. Building release binary now..."
    if ! command -v cargo >/dev/null 2>&1; then
        echo "Error: 'cargo' is not installed. Cannot build SUTRA CLI. Please install Rust or build the binary first." >&2
        exit 1
    fi
    cargo build --release --manifest-path "${CLI_DIR}/Cargo.toml"
fi

if [[ ! -f "${BINARY_SRC}" ]]; then
    echo "Error: Could not locate built binary at '${BINARY_SRC}'" >&2
    exit 1
fi

# 2. Check destination directory
echo "Target installation directory: ${DEST_DIR}"
mkdir -p "${DEST_DIR}"

if [[ ! -w "${DEST_DIR}" ]]; then
    echo "Error: Target directory '${DEST_DIR}' is not writable by current user $(whoami)." >&2
    exit 1
fi

TARGET_BIN="${DEST_DIR}/sutra"

# 3. Safe installation (avoiding clobbering unrelated binaries, preserving permissions)
echo "Installing 'sutra' to '${TARGET_BIN}'..."
cp -f "${BINARY_SRC}" "${TARGET_BIN}"
chmod 755 "${TARGET_BIN}"

# 4. Verify installation
INSTALLED_VERSION="$("${TARGET_BIN}" --version)"
echo "Installed version: ${INSTALLED_VERSION}"

# 5. Check PATH advisory
if [[ ":$PATH:" != *":${DEST_DIR}:"* ]]; then
    echo ""
    echo "Notice: '${DEST_DIR}' is not currently in your PATH."
    echo "To run 'sutra' directly from any shell, add this line to your shell profile (~/.zshrc or ~/.bashrc):"
    echo "  export PATH=\"${DEST_DIR}:\$PATH\""
    echo ""
fi

echo "=== Installation Completed Successfully ==="
echo "You can now run: ${TARGET_BIN} --help"
