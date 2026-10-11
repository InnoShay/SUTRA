#!/usr/bin/env python3
"""
Official OULAD Dataset Acquisition Script.

Source:
    - Official Website: https://analyse.kmi.open.ac.uk/open_dataset
    - Peer-Reviewed Citation: Kuzilek, J., Hlosta, M., & Zdrahal, Z. (2017).
      Open University Learning Analytics dataset. Scientific Data, 4, 170171.
    - Official Figshare DOI: 10.6084/m9.figshare.5081998.v1
    - Direct File Endpoint: https://ndownloader.figshare.com/files/8606371
    - Official Figshare MD5: 7412686fd77cf0e0ee1e8c3e9b354308
    - Archive Expected Size: 46,750,706 bytes (~44.58 MB)

Requirements:
    - Downloads authentic archive into a staging area.
    - Verifies official MD5 checksum and computes local SHA-256 fingerprint.
    - Extracts the 7 authentic CSV files into ml/data/raw/.
    - Emits provenance metadata (JSON).
"""

import hashlib
import json
import os
import shutil
import sys
import time
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

FIGSHARE_URL = "https://ndownloader.figshare.com/files/8606371"
FIGSHARE_DOI = "10.6084/m9.figshare.5081998.v1"
OFFICIAL_SOURCE = "https://analyse.kmi.open.ac.uk/open_dataset"
OFFICIAL_MD5 = "7412686fd77cf0e0ee1e8c3e9b354308"
EXPECTED_BYTES = 46750706

EXPECTED_TABLES = [
    "courses.csv",
    "studentInfo.csv",
    "studentRegistration.csv",
    "assessments.csv",
    "studentAssessment.csv",
    "vle.csv",
    "studentVle.csv",
]


def compute_hashes(filepath: Path) -> tuple[str, str]:
    """Compute MD5 and SHA-256 hashes of a file in streaming chunks."""
    md5_hash = hashlib.md5()
    sha256_hash = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(1024 * 1024):
            md5_hash.update(chunk)
            sha256_hash.update(chunk)
    return md5_hash.hexdigest(), sha256_hash.hexdigest()


def download_with_progress(url: str, destination: Path) -> None:
    """Download file from url to destination with real-time byte tracking."""
    print(f"[*] Initiating download from: {url}")
    print(f"[*] Destination: {destination}")

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "SUTRA-ML-Downloader/1.0 (Research/Academic)"},
    )

    start_time = time.time()
    with urllib.request.urlopen(req, timeout=60) as response, open(destination, "wb") as out_file:
        total_size = response.headers.get("Content-Length")
        total_bytes = int(total_size) if total_size else None
        downloaded = 0
        chunk_size = 512 * 1024

        while True:
            chunk = response.read(chunk_size)
            if not chunk:
                break
            out_file.write(chunk)
            downloaded += len(chunk)
            if total_bytes:
                percent = (downloaded / total_bytes) * 100
                elapsed = time.time() - start_time
                speed = (downloaded / (1024 * 1024)) / max(elapsed, 0.001)
                sys.stdout.write(
                    f"\r    -> Downloaded: {downloaded / (1024*1024):.2f} MB / "
                    f"{total_bytes / (1024*1024):.2f} MB ({percent:.1f}%) at {speed:.2f} MB/s"
                )
                sys.stdout.flush()

    sys.stdout.write("\n")
    print(f"[✓] Download completed in {time.time() - start_time:.2f}s")


def acquire_oulad(raw_dir: Path, force: bool = False) -> dict:
    """Acquire, verify, and unpack OULAD dataset."""
    raw_dir.mkdir(parents=True, exist_ok=True)
    staging_zip = raw_dir / "anonymisedData.zip"
    provenance_path = raw_dir / "provenance.json"

    # Check if all 7 tables already exist and force is not specified
    existing = [t for t in EXPECTED_TABLES if (raw_dir / t).is_file()]
    if len(existing) == len(EXPECTED_TABLES) and not force:
        print("[!] All 7 OULAD tables already exist in raw_dir. Verifying presence...")
        if provenance_path.is_file():
            with open(provenance_path) as f:
                return json.load(f)

    # Step 1: Download
    if not staging_zip.is_file() or force:
        try:
            download_with_progress(FIGSHARE_URL, staging_zip)
        except Exception as e:
            print(f"[ERROR] Failed to download OULAD archive: {e}", file=sys.stderr)
            print(
                "\n[MANUAL INSTRUCTIONS]\n"
                "If network or automated download fails:\n"
                f"1. Download 'anonymisedData.zip' manually from {OFFICIAL_SOURCE} or DOI {FIGSHARE_DOI}\n"
                f"2. Place the file at: {staging_zip.resolve()}\n"
                "3. Re-run this script.",
                file=sys.stderr,
            )
            raise

    # Step 2: Verification
    print("[*] Verifying integrity of downloaded archive...")
    computed_md5, computed_sha256 = compute_hashes(staging_zip)
    archive_size = staging_zip.stat().st_size

    print(f"    - Archive Size: {archive_size} bytes (Expected: {EXPECTED_BYTES})")
    print(f"    - Computed MD5: {computed_md5}")
    print(f"    - Official MD5: {OFFICIAL_MD5}")
    print(f"    - Local SHA-256: {computed_sha256}")

    if computed_md5.lower() != OFFICIAL_MD5.lower():
        staging_zip.unlink(missing_ok=True)
        raise ValueError(
            f"MD5 checksum mismatch! Official: {OFFICIAL_MD5}, Computed: {computed_md5}. "
            "Archive was corrupted or compromised. Corrupted file deleted."
        )
    print("[✓] Official MD5 checksum verified successfully.")

    # Step 3: Unpack
    print(f"[*] Extracting CSV files into {raw_dir}...")
    with zipfile.ZipFile(staging_zip, "r") as zf:
        members = zf.namelist()
        print(f"    Found {len(members)} entries in zip archive: {members}")
        for member in members:
            # Handle if zip contains subfolder or flat files
            filename = Path(member).name
            if filename in EXPECTED_TABLES:
                source = zf.open(member)
                target_path = raw_dir / filename
                with open(target_path, "wb") as target:
                    shutil.copyfileobj(source, target)
                size_mb = target_path.stat().st_size / (1024 * 1024)
                print(f"    -> Extracted {filename} ({size_mb:.2f} MB)")

    # Verify all 7 tables exist
    missing = [t for t in EXPECTED_TABLES if not (raw_dir / t).is_file()]
    if missing:
        raise FileNotFoundError(f"Missing expected OULAD tables after extraction: {missing}")

    # Step 4: Write Provenance Record
    table_metadata = {}
    for t in EXPECTED_TABLES:
        t_path = raw_dir / t
        t_md5, t_sha256 = compute_hashes(t_path)
        table_metadata[t] = {
            "size_bytes": t_path.stat().st_size,
            "local_sha256": t_sha256,
            "local_md5": t_md5,
        }

    provenance = {
        "dataset_name": "Open University Learning Analytics Dataset (OULAD)",
        "official_source": OFFICIAL_SOURCE,
        "figshare_doi": FIGSHARE_DOI,
        "download_url": FIGSHARE_URL,
        "archive_filename": staging_zip.name,
        "archive_size_bytes": archive_size,
        "archive_official_md5": OFFICIAL_MD5,
        "archive_computed_md5": computed_md5,
        "archive_local_sha256": computed_sha256,
        "acquired_at_utc": datetime.now(timezone.utc).isoformat(),
        "status": "VERIFIED_AUTHENTIC",
        "extracted_tables": table_metadata,
    }

    with open(provenance_path, "w") as f:
        json.dump(provenance, f, indent=2)

    print(f"[✓] Provenance recorded at: {provenance_path}")
    return provenance


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Acquire and verify authentic OULAD dataset.")
    parser.add_argument(
        "--raw-dir",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "data" / "raw",
        help="Directory to save raw CSV files",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force re-download even if files exist",
    )
    args = parser.parse_args()

    print("=" * 70)
    print("SUTRA ML — OULAD Dataset Acquisition")
    print("=" * 70)
    try:
        acquire_oulad(args.raw_dir, force=args.force)
        print("\n[SUCCESS] OULAD acquisition and integrity verification complete.")
    except Exception as e:
        print(f"\n[FAILURE] Acquisition failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
