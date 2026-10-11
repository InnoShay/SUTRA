"""
Resource consumption telemetry for SUTRA ML training on macOS Apple Silicon and POSIX.

Measures wall-clock time, process CPU time, process CPU utilization %,
and peak resident set size (RSS) memory during model training.
"""

import os
import resource
import sys
import threading
import time
from typing import Any, Optional

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    psutil = None
    HAS_PSUTIL = False


def get_peak_memory_mb() -> float:
    """
    Get peak process memory in megabytes using getrusage.
    On macOS (Darwin), ru_maxrss is in bytes. On Linux, it is in kilobytes.
    """
    usage = resource.getrusage(resource.RUSAGE_SELF)
    maxrss = usage.ru_maxrss
    if sys.platform == "darwin":
        return maxrss / (1024 * 1024)
    else:
        return maxrss / 1024


def get_current_process_memory_mb() -> float:
    """Get current resident memory in megabytes."""
    if HAS_PSUTIL and psutil is not None:
        try:
            return psutil.Process(os.getpid()).memory_info().rss / (1024 * 1024)
        except Exception:
            pass
    return get_peak_memory_mb()


class ResourceSampler:
    """
    Background sampling thread that captures process CPU and memory utilization
    during meaningful computation blocks.
    """

    def __init__(self, interval_sec: float = 0.05):
        self.interval_sec = interval_sec
        self.cpu_samples: list[float] = []
        self.rss_samples: list[float] = []
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._process = psutil.Process(os.getpid()) if HAS_PSUTIL and psutil is not None else None

    def start(self):
        self.cpu_samples = []
        self.rss_samples = []
        self._stop_event.clear()
        if self._process is not None:
            # Prime cpu_percent measurement
            try:
                self._process.cpu_percent(interval=None)
            except Exception:
                pass

        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def _run(self):
        while not self._stop_event.is_set():
            if self._process is not None:
                try:
                    cpu = self._process.cpu_percent(interval=None)
                    rss = self._process.memory_info().rss / (1024 * 1024)
                    self.cpu_samples.append(cpu)
                    self.rss_samples.append(rss)
                except Exception:
                    pass
            self._stop_event.wait(self.interval_sec)

    def stop(self) -> dict[str, Any]:
        if self._thread is not None and self._thread.is_alive():
            self._stop_event.set()
            self._thread.join(timeout=1.0)

        # Final sample
        if self._process is not None:
            try:
                cpu = self._process.cpu_percent(interval=None)
                rss = self._process.memory_info().rss / (1024 * 1024)
                if cpu > 0:
                    self.cpu_samples.append(cpu)
                self.rss_samples.append(rss)
            except Exception:
                pass

        sample_count = len(self.cpu_samples)
        mean_cpu = float(sum(self.cpu_samples) / max(1, sample_count)) if sample_count > 0 else 0.0
        peak_cpu = float(max(self.cpu_samples)) if sample_count > 0 else 0.0
        mean_rss = float(sum(self.rss_samples) / max(1, sample_count)) if sample_count > 0 else get_peak_memory_mb()
        peak_rss = float(max(self.rss_samples)) if sample_count > 0 else get_peak_memory_mb()

        return {
            "samples_count": sample_count,
            "mean_process_cpu_percent": round(mean_cpu, 2),
            "peak_process_cpu_percent": round(peak_cpu, 2),
            "mean_rss_mb": round(mean_rss, 2),
            "peak_rss_mb": round(peak_rss, 2),
            "note_cpu_convention": "macOS multi-core: 100% equals 1 fully saturated CPU core; >100% indicates multi-threaded execution across multiple performance/efficiency cores.",
            "note_gpu": "Apple Silicon GPU activity is unmeasured / not utilized by CPU BLAS/OpenMP routines.",
        }


class MonitoredSection:
    """
    Context manager that accurately profiles a designated execution section:
    captures wall-clock time, process CPU time, and concurrent resource samples.
    """

    def __init__(self, section_name: str, sample_interval: float = 0.05):
        self.section_name = section_name
        self.sampler = ResourceSampler(interval_sec=sample_interval)
        self.start_wall_time = 0.0
        self.start_cpu_time = 0.0
        self.elapsed_wall_sec = 0.0
        self.elapsed_cpu_sec = 0.0
        self.start_peak_mb = 0.0
        self.end_peak_mb = 0.0
        self.sample_metrics: dict[str, Any] = {}

    def __enter__(self):
        self.start_wall_time = time.perf_counter()
        self.start_cpu_time = time.process_time()
        self.start_peak_mb = get_peak_memory_mb()
        self.sampler.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.elapsed_wall_sec = time.perf_counter() - self.start_wall_time
        self.elapsed_cpu_sec = time.process_time() - self.start_cpu_time
        self.end_peak_mb = get_peak_memory_mb()
        self.sample_metrics = self.sampler.stop()

    def get_summary(self) -> dict[str, Any]:
        return {
            "section_name": self.section_name,
            "wall_clock_sec": round(self.elapsed_wall_sec, 4),
            "process_cpu_sec": round(self.elapsed_cpu_sec, 4),
            "cpu_time_ratio": round(self.elapsed_cpu_sec / max(1e-6, self.elapsed_wall_sec), 2),
            "start_peak_rss_mb": round(self.start_peak_mb, 2),
            "end_peak_rss_mb": round(self.end_peak_mb, 2),
            "sampling": self.sample_metrics,
        }
