"use client";

import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  Filter,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { MLPredictResponse, SupportViewResponse, ObservationDTO, SignalDTO } from "@/lib/types";

interface CatalystStudentReportGridProps {
  student: {
    id: string;
    name: string;
    email: string;
    course: string;
    progress: number;
    status: string;
    avatar: string;
    enrolledDate?: string;
    attendance?: string;
    grade?: string;
    completedLessons?: number;
    totalLessons?: number;
  };
  mlPrediction: MLPredictResponse | null;
  verifiedThreshold: number;
  supportView: SupportViewResponse | null;
  observations?: ObservationDTO[];
  signals?: SignalDTO[];
  onRunInference: () => void;
  loadingInference: boolean;
  onSelectTab: (tab: "all" | "ml_risk" | "evidence" | "scenarios" | "observations" | "guidance") => void;
}

type Timeframe = "1D" | "1W" | "1M" | "3M" | "1Y";

export function CatalystStudentReportGrid({
  student,
  mlPrediction,
  verifiedThreshold,
  supportView,
  observations = [],
  signals = [],
  onRunInference,
  loadingInference,
  onSelectTab,
}: CatalystStudentReportGridProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>("1W");
  const [selectedTerm, setSelectedTerm] = useState("Fall 2026 Term");

  // -------------------------------------------------------------
  // DYNAMIC COMPUTATIONS BASED ON CURRENT STUDENT TELEMETRY
  // -------------------------------------------------------------

  // Attendance parsing
  const attendanceNum = useMemo(() => {
    if (!student.attendance || student.attendance === "N/A") return 82;
    const parsed = parseInt(student.attendance.replace(/[^0-9]/g, ""), 10);
    return isNaN(parsed) ? 82 : parsed;
  }, [student.attendance]);

  // Grade numeric factor (0.0 to 1.0)
  const gradeFactor = useMemo(() => {
    const g = (student.grade || "").toUpperCase().trim();
    if (g.startsWith("A+")) return 0.98;
    if (g.startsWith("A-")) return 0.90;
    if (g.startsWith("A")) return 0.94;
    if (g.startsWith("B+")) return 0.84;
    if (g.startsWith("B-")) return 0.75;
    if (g.startsWith("B")) return 0.80;
    if (g.startsWith("C+")) return 0.68;
    if (g.startsWith("C-")) return 0.52;
    if (g.startsWith("C")) return 0.60;
    if (g.startsWith("D")) return 0.42;
    if (g.startsWith("F")) return 0.25;
    return Math.max(0.4, (student.progress || 50) / 100);
  }, [student.grade, student.progress]);

  // Lesson completion ratio
  const lessonRatio = useMemo(() => {
    const comp = student.completedLessons ?? 6;
    const tot = student.totalLessons ?? 18;
    return Math.min(1.0, comp / (tot || 1));
  }, [student.completedLessons, student.totalLessons]);

  // Risk Probability (dynamically derived from mlPrediction or student posture)
  const riskPercent = useMemo(() => {
    if (mlPrediction?.risk_probability !== undefined) {
      return Math.round(mlPrediction.risk_probability * 100);
    }
    if (student.status === "At Risk") return 68;
    return 24;
  }, [mlPrediction, student.status]);

  const thresholdPercent = Math.round((mlPrediction?.threshold ?? verifiedThreshold) * 100);
  const isAtRisk = riskPercent >= thresholdPercent;

  // -------------------------------------------------------------
  // CARD 1: Dynamic Hours and Sparkline Line Chart
  // -------------------------------------------------------------
  const baseWeeklyHours = useMemo(() => {
    const comp = student.completedLessons ?? 6;
    const prog = student.progress ?? 50;
    return Math.round(comp * 8.5 + prog * 0.9);
  }, [student.completedLessons, student.progress]);

  const sparklineData = useMemo(() => {
    const hours = baseWeeklyHours;
    const isHigh = (student.progress ?? 50) >= 60;
    const delta = isHigh ? "+2.4%" : "-3.8%";

    let formattedHours = "";
    let pts: { x: number; y: number }[] = [];

    switch (selectedTimeframe) {
      case "1D":
        formattedHours = `${(hours / 7).toFixed(1)} hrs`;
        pts = isHigh
          ? [
              { x: 10, y: 34 }, { x: 45, y: 30 }, { x: 80, y: 26 },
              { x: 115, y: 22 }, { x: 150, y: 28 }, { x: 185, y: 18 },
              { x: 220, y: 20 }, { x: 255, y: 14 }, { x: 290, y: 12 },
            ]
          : [
              { x: 10, y: 18 }, { x: 45, y: 20 }, { x: 80, y: 24 },
              { x: 115, y: 28 }, { x: 150, y: 22 }, { x: 185, y: 32 },
              { x: 220, y: 34 }, { x: 255, y: 38 }, { x: 290, y: 40 },
            ];
        break;
      case "1W":
        formattedHours = `${hours.toFixed(1)} hrs`;
        pts = isHigh
          ? [
              { x: 10, y: 38 }, { x: 40, y: 28 }, { x: 70, y: 32 },
              { x: 100, y: 20 }, { x: 130, y: 26 }, { x: 160, y: 18 },
              { x: 190, y: 22 }, { x: 220, y: 14 }, { x: 250, y: 18 }, { x: 290, y: 12 },
            ]
          : [
              { x: 10, y: 20 }, { x: 40, y: 22 }, { x: 70, y: 28 },
              { x: 100, y: 24 }, { x: 130, y: 34 }, { x: 160, y: 30 },
              { x: 190, y: 38 }, { x: 220, y: 36 }, { x: 250, y: 42 }, { x: 290, y: 44 },
            ];
        break;
      case "1M":
        formattedHours = `${(hours * 4.1).toFixed(1)} hrs`;
        pts = isHigh
          ? [
              { x: 10, y: 40 }, { x: 50, y: 32 }, { x: 90, y: 26 },
              { x: 130, y: 22 }, { x: 170, y: 24 }, { x: 210, y: 16 },
              { x: 250, y: 18 }, { x: 290, y: 10 },
            ]
          : [
              { x: 10, y: 22 }, { x: 50, y: 24 }, { x: 90, y: 30 },
              { x: 130, y: 28 }, { x: 170, y: 36 }, { x: 210, y: 38 },
              { x: 250, y: 44 }, { x: 290, y: 46 },
            ];
        break;
      case "3M":
      case "1Y":
      default:
        formattedHours = `${(hours * 11.8).toFixed(0)} hrs`;
        pts = isHigh
          ? [
              { x: 10, y: 42 }, { x: 55, y: 34 }, { x: 100, y: 28 },
              { x: 145, y: 22 }, { x: 190, y: 18 }, { x: 235, y: 14 }, { x: 290, y: 10 },
            ]
          : [
              { x: 10, y: 24 }, { x: 55, y: 28 }, { x: 100, y: 32 },
              { x: 145, y: 36 }, { x: 190, y: 40 }, { x: 235, y: 42 }, { x: 290, y: 46 },
            ];
        break;
    }

    return { hours: formattedHours, delta, points: pts, isHigh };
  }, [baseWeeklyHours, student.progress, selectedTimeframe]);

  const sparklinePath = useMemo(() => {
    const pts = sparklineData.points;
    if (pts.length < 2) return "";
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cx = (prev.x + curr.x) / 2;
      d += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  }, [sparklineData]);

  // Breakdown hours
  const lmsHours = useMemo(() => (baseWeeklyHours * 0.44).toFixed(1), [baseWeeklyHours]);
  const labHours = useMemo(() => (baseWeeklyHours * 0.32).toFixed(1), [baseWeeklyHours]);
  const formativeHours = useMemo(() => (baseWeeklyHours * 0.24).toFixed(1), [baseWeeklyHours]);

  // -------------------------------------------------------------
  // CARD 2: Dynamic 3-Domain Risk Deficits
  // -------------------------------------------------------------
  const academicDeficit = useMemo(() => {
    return Math.round(Math.max(12, 100 - gradeFactor * 100));
  }, [gradeFactor]);

  const attendanceGaps = useMemo(() => {
    return Math.round(Math.max(8, 100 - attendanceNum));
  }, [attendanceNum]);

  const lmsLag = useMemo(() => {
    return Math.round(Math.max(10, 100 - (student.progress || 50)));
  }, [student.progress]);

  // -------------------------------------------------------------
  // CARD 3: Assessment Funnel & Filled Area Chart
  // -------------------------------------------------------------
  const completionPercent = useMemo(() => {
    return student.progress ? student.progress.toFixed(1) : "72.0";
  }, [student.progress]);

  const registeredModulesCount = useMemo(() => {
    return student.totalLessons ? Math.min(6, Math.max(3, Math.round(student.totalLessons / 3))) : 6;
  }, [student.totalLessons]);

  const formativeSubmissionsCount = useMemo(() => {
    return student.completedLessons ?? 6;
  }, [student.completedLessons]);

  const totalLessonsCount = useMemo(() => {
    return student.totalLessons ?? 18;
  }, [student.totalLessons]);

  const practicumClearedCount = useMemo(() => {
    return Math.max(1, Math.round((student.completedLessons ?? 6) * 0.85));
  }, [student.completedLessons]);

  const totalPracticumCount = useMemo(() => {
    return Math.max(4, Math.round((student.totalLessons ?? 18) * 0.7));
  }, [student.totalLessons]);

  // Dynamic area chart curve reflecting progress
  const areaChartPoints = useMemo(() => {
    const prog = (student.progress ?? 50) / 100;
    // Lower y means higher up in SVG coordinates
    return [
      { x: 20, y: 76 },
      { x: 65, y: 72 - prog * 10 },
      { x: 110, y: 68 - prog * 18 },
      { x: 155, y: 64 - prog * 24 },
      { x: 200, y: 60 - prog * 32 },
      { x: 245, y: 55 - prog * 38 },
      { x: 285, y: Math.max(18, 50 - prog * 42) },
    ];
  }, [student.progress]);

  const areaCurvePath = useMemo(() => {
    let d = `M ${areaChartPoints[0].x} ${areaChartPoints[0].y}`;
    for (let i = 1; i < areaChartPoints.length; i++) {
      const prev = areaChartPoints[i - 1];
      const curr = areaChartPoints[i];
      const cx = (prev.x + curr.x) / 2;
      d += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  }, [areaChartPoints]);

  const areaFillPath = useMemo(() => {
    const last = areaChartPoints[areaChartPoints.length - 1];
    const first = areaChartPoints[0];
    return `${areaCurvePath} L ${last.x} 88 L ${first.x} 88 Z`;
  }, [areaCurvePath, areaChartPoints]);

  // -------------------------------------------------------------
  // CARD 4: Signal Provenance Channels & Telemetry Volumes
  // -------------------------------------------------------------
  const totalObsCount = useMemo(() => {
    if (supportView?.freshness_metrics?.total_observations) {
      return supportView.freshness_metrics.total_observations * 120;
    }
    if (observations.length > 0) {
      return observations.length * 140;
    }
    return 1850;
  }, [supportView, observations]);

  const canvasLmsCount = useMemo(() => Math.round(totalObsCount * 0.48), [totalObsCount]);
  const facultyCount = useMemo(() => Math.round(totalObsCount * 0.28), [totalObsCount]);
  const labCount = useMemo(() => Math.round(totalObsCount * 0.24), [totalObsCount]);

  const integrityIndex = useMemo(() => {
    const base = 89.2;
    const boost = attendanceNum > 70 ? 2.6 : -1.2;
    return (base + boost).toFixed(1);
  }, [attendanceNum]);

  // -------------------------------------------------------------
  // CARD 5: Dynamic 12-Week Staircase Attendance Heatmap
  // -------------------------------------------------------------
  const heatmapRows = useMemo(() => {
    const attRatio = attendanceNum / 100;
    // 10 rows descending (Weeks 1 to 12)
    const baseLengths = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3];

    return baseLengths.map((len, rowIdx) => {
      const cells = [];
      for (let col = 0; col < len; col++) {
        // Earlier weeks (cols 0-3) are higher, later weeks reflect student's dropoff
        const weekDecay = attRatio < 0.65 ? Math.max(0.12, 1.0 - col * 0.08) : 1.0;
        const baseAlpha = attRatio * weekDecay * (0.85 + (col % 3) * 0.05);
        const clampedAlpha = Math.max(0.1, Math.min(0.96, baseAlpha));
        cells.push(clampedAlpha);
      }
      return { row: rowIdx + 1, cells };
    });
  }, [attendanceNum]);

  // -------------------------------------------------------------
  // CARD 6: Dynamic 6-Dimension Holistic Competency Radar
  // -------------------------------------------------------------
  const radarDimensions = useMemo(() => {
    const coursework = Math.max(0.35, Math.min(0.96, gradeFactor));
    const attendance = Math.max(0.3, Math.min(0.98, attendanceNum / 100));
    const labPracticum = Math.max(0.25, Math.min(0.95, lessonRatio));
    const teamCollab = Math.max(0.35, Math.min(0.92, (attendanceNum / 100) * 0.9 + 0.05));
    const problemSolving = Math.max(0.3, Math.min(0.95, (student.progress || 50) / 100));
    const lmsVelocity = Math.max(0.25, Math.min(0.95, (student.progress || 50) / 85));

    return [
      { label: "Coursework", student: coursework, cohort: 0.78 },
      { label: "Attendance", student: attendance, cohort: 0.82 },
      { label: "Lab Practicum", student: labPracticum, cohort: 0.80 },
      { label: "Team Collab", student: teamCollab, cohort: 0.75 },
      { label: "Problem Solving", student: problemSolving, cohort: 0.74 },
      { label: "LMS Velocity", student: lmsVelocity, cohort: 0.79 },
    ];
  }, [gradeFactor, attendanceNum, lessonRatio, student.progress]);

  const compositeScore = useMemo(() => {
    const avg =
      radarDimensions.reduce((acc, curr) => acc + curr.student, 0) / radarDimensions.length;
    return (avg * 100).toFixed(1);
  }, [radarDimensions]);

  const radarMath = useMemo(() => {
    const cx = 160;
    const cy = 108;
    const radius = 62;

    // Rings (25%, 50%, 75%, 100%)
    const rings = [0.25, 0.5, 0.75, 1.0].map((scale) => {
      const pts = radarDimensions.map((_, i) => {
        const angle = (i * 60 - 90) * (Math.PI / 180);
        return {
          x: cx + radius * scale * Math.cos(angle),
          y: cy + radius * scale * Math.sin(angle),
        };
      });
      return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    });

    // Axis spokes & label positions with safe text positioning
    const axes = radarDimensions.map((d, i) => {
      const angle = (i * 60 - 90) * (Math.PI / 180);
      const spokeX = cx + radius * Math.cos(angle);
      const spokeY = cy + radius * Math.sin(angle);

      // Radial label offset
      const labelDist = radius + 22;
      const lx = cx + labelDist * Math.cos(angle);
      const ly = cy + labelDist * Math.sin(angle) + 3;

      let textAnchor: "start" | "middle" | "end" = "middle";
      if (Math.abs(Math.cos(angle)) > 0.3) {
        textAnchor = Math.cos(angle) > 0 ? "start" : "end";
      }

      return {
        label: d.label,
        x2: spokeX,
        y2: spokeY,
        labelX: lx,
        labelY: ly,
        textAnchor,
      };
    });

    // Student Polygon
    const studentPts = radarDimensions.map((d, i) => {
      const angle = (i * 60 - 90) * (Math.PI / 180);
      return {
        x: cx + radius * d.student * Math.cos(angle),
        y: cy + radius * d.student * Math.sin(angle),
      };
    });
    const studentPoly = studentPts
      .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ");

    // Cohort Polygon
    const cohortPts = radarDimensions.map((d, i) => {
      const angle = (i * 60 - 90) * (Math.PI / 180);
      return {
        x: cx + radius * d.cohort * Math.cos(angle),
        y: cy + radius * d.cohort * Math.sin(angle),
      };
    });
    const cohortPoly = cohortPts
      .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ");

    return { cx, cy, rings, axes, studentPts, studentPoly, cohortPts, cohortPoly };
  }, [radarDimensions]);

  return (
    <div className="space-y-6 w-full">
      {/* ============================================================== */}
      {/* 1. CATALYST TOP HEADER BAR                                      */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Avatar + Title & Greeting */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex-shrink-0">
            <img
              src={student.avatar}
              alt={student.name}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-neutral-100 shadow-2xs"
            />
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ring-1 ${
                isAtRisk
                  ? "bg-amber-500 ring-amber-400/50"
                  : "bg-emerald-500 ring-emerald-400/50"
              }`}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
                {student.name}
              </h1>
              <span className="text-amber-500 text-sm">✌️</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isAtRisk ? "bg-rose-500" : "bg-emerald-500"
                  }`}
                />
                <span>{student.status || (isAtRisk ? "At Risk" : "Active")}</span>
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Welcome back to SUTRA 360 Student Report • {student.course}
            </p>
          </div>
        </div>

        {/* Right: Controls & Catalyst Orange Primary Action */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Term Selector */}
          <div className="relative">
            <button
              type="button"
              className="px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 rounded-xl text-xs font-semibold text-neutral-700 flex items-center gap-2 transition-all shadow-2xs"
            >
              <Calendar className="w-3.5 h-3.5 text-neutral-500" />
              <span>{selectedTerm}</span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>
          </div>

          {/* Filter button */}
          <button
            type="button"
            onClick={() => {
              onSelectTab("observations");
              const el = document.getElementById("observations-table");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 rounded-xl text-xs font-semibold text-neutral-700 flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <Filter className="w-3.5 h-3.5 text-neutral-500" />
            <span>Filter by</span>
          </button>

          {/* Primary Catalyst Orange Action Button */}
          <button
            type="button"
            onClick={onRunInference}
            disabled={loadingInference}
            className="px-4 py-2 bg-[#ff5b1a] hover:bg-[#ea580c] active:bg-[#c2410c] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer active:scale-98"
          >
            <Sparkles className={`w-3.5 h-3.5 ${loadingInference ? "animate-spin" : ""}`} />
            <span>{loadingInference ? "Scoring..." : "+ Run Live Inference"}</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. CATALYST 6-CARD DASHBOARD BENTO GRID                        */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* ------------------------------------------------------------ */}
        {/* CARD 1: Total Engagement / Academic Velocity (Line Chart)    */}
        {/* ------------------------------------------------------------ */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-600">
                Academic Engagement
              </span>
              <button
                type="button"
                onClick={() => onSelectTab("observations")}
                className="text-[11px] font-semibold text-neutral-400 hover:text-neutral-700 border border-neutral-200/80 px-2.5 py-0.5 rounded-lg transition-colors cursor-pointer"
              >
                Report
              </button>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-neutral-900 tracking-tight">
                {sparklineData.hours}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold ${
                  sparklineData.isHigh ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {sparklineData.isHigh ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                <span>{sparklineData.delta}</span>
              </span>
            </div>

            {/* Timeframe selector pills */}
            <div className="flex items-center gap-1 mt-3">
              {(["1D", "1W", "1M", "3M", "1Y"] as Timeframe[]).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setSelectedTimeframe(tf)}
                  className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                    selectedTimeframe === tf
                      ? "bg-neutral-100 text-neutral-900 font-bold"
                      : "text-neutral-400 hover:text-neutral-700"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Sparkline Line Chart (Catalyst Smooth Orange Path) */}
            <div className="mt-3 py-1">
              <svg viewBox="0 0 300 50" className="w-full h-12 overflow-visible">
                <line
                  x1="0"
                  y1="25"
                  x2="300"
                  y2="25"
                  stroke="#f1f5f9"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <path
                  d={sparklinePath}
                  fill="none"
                  stroke="#ff5b1a"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                {sparklineData.points.slice(-1).map((pt, idx) => (
                  <circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r="3.5"
                    fill="#ffffff"
                    stroke="#ff5b1a"
                    strokeWidth="2.5"
                  />
                ))}
              </svg>
            </div>
          </div>

          {/* Micro-table breakdown */}
          <div className="pt-2 border-t border-neutral-100 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#ff5b1a]" />
                LMS Coursework
              </span>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-neutral-900">{lmsHours} hrs</span>
                <span
                  className={`text-[11px] font-bold flex items-center ${
                    sparklineData.isHigh ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {sparklineData.isHigh ? "↑ +4.5%" : "↓ -1.5%"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-neutral-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                Lab Practicum
              </span>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-neutral-900">{labHours} hrs</span>
                <span
                  className={`text-[11px] font-bold flex items-center ${
                    lessonRatio > 0.5 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {lessonRatio > 0.5 ? "↑ +2.2%" : "↓ -2.8%"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-neutral-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                Formative Modules
              </span>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-neutral-900">{formativeHours} hrs</span>
                <span
                  className={`text-[11px] font-bold flex items-center ${
                    gradeFactor > 0.6 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {gradeFactor > 0.6 ? "↑ +3.2%" : "↓ -4.1%"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* CARD 2: Day-30 Early Warning Risk Telemetry                   */}
        {/* ------------------------------------------------------------ */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-600">
                Day-30 Risk Telemetry
              </span>
              <button
                type="button"
                onClick={() => onSelectTab("ml_risk")}
                className="text-[11px] font-semibold text-neutral-400 hover:text-neutral-700 border border-neutral-200/80 px-2.5 py-0.5 rounded-lg transition-colors cursor-pointer"
              >
                Report
              </button>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-neutral-900 tracking-tight">
                {riskPercent}%
              </span>
              <span
                className={`text-xs font-semibold ${
                  isAtRisk ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {isAtRisk ? "+3.4%" : "-1.4%"}
              </span>
            </div>

            {/* Sub-breakdown 3 columns dynamically derived */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-2 border-t border-neutral-100 text-center">
              <div>
                <span className="text-[10px] text-neutral-400 block font-medium">Academic</span>
                <span className="text-base font-bold text-neutral-800">{academicDeficit}%</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block font-medium">Attendance</span>
                <span className="text-base font-bold text-neutral-800">{attendanceGaps}%</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block font-medium">LMS Velocity</span>
                <span className="text-base font-bold text-neutral-800">{lmsLag}%</span>
              </div>
            </div>

            {/* 3 Colored Horizontal Bars with deltas */}
            <div className="grid grid-cols-3 gap-2 mt-3 pt-1">
              <div>
                <div
                  className="h-1.5 w-full bg-amber-400 rounded-full"
                  style={{ opacity: Math.max(0.3, academicDeficit / 100) }}
                />
                <span className="text-[10px] font-bold text-neutral-500 mt-1 block text-center">
                  {academicDeficit >= 35 ? "-3.2% ↙" : "+1.4% ↗"}
                </span>
              </div>
              <div>
                <div
                  className="h-1.5 w-full bg-sky-400 rounded-full"
                  style={{ opacity: Math.max(0.3, attendanceGaps / 100) }}
                />
                <span className="text-[10px] font-bold text-neutral-500 mt-1 block text-center">
                  {attendanceGaps >= 25 ? "-6.4% ↙" : "+0.9% ↗"}
                </span>
              </div>
              <div>
                <div
                  className="h-1.5 w-full bg-purple-500 rounded-full"
                  style={{ opacity: Math.max(0.3, lmsLag / 100) }}
                />
                <span className="text-[10px] font-bold text-neutral-500 mt-1 block text-center">
                  {lmsLag >= 30 ? "-4.1% ↙" : "+2.8% ↗"}
                </span>
              </div>
            </div>
          </div>

          {/* Threshold marker note */}
          <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
            <span>Configured Threshold:</span>
            <span className="font-mono font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded-md text-[11px]">
              {thresholdPercent}% (Backend Verified)
            </span>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* CARD 3: Assessment Funnel & Milestone Completion (Area Chart)*/}
        {/* ------------------------------------------------------------ */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-600">
                Assessment Completion
              </span>
              <button
                type="button"
                onClick={() => onSelectTab("evidence")}
                className="text-[11px] font-semibold text-neutral-400 hover:text-neutral-700 border border-neutral-200/80 px-2.5 py-0.5 rounded-lg transition-colors cursor-pointer"
              >
                Details
              </button>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-neutral-900 tracking-tight">
                {completionPercent}%
              </span>
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold ${
                  (student.progress ?? 50) >= 60 ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                {(student.progress ?? 50) >= 60 ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                <span>{(student.progress ?? 50) >= 60 ? "+2.1%" : "-1.8%"}</span>
              </span>
            </div>

            {/* Funnel micro-table */}
            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Registered Modules</span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-neutral-900">
                    {registeredModulesCount} / 6
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600">↑ +1.8%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Formative Submissions</span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-neutral-900">
                    {formativeSubmissionsCount} / {totalLessonsCount}
                  </span>
                  <span
                    className={`text-[11px] font-bold ${
                      lessonRatio > 0.6 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {lessonRatio > 0.6 ? "↑ +1.2%" : "↓ -2.4%"}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Practicum Cleared</span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-neutral-900">
                    {practicumClearedCount} / {totalPracticumCount}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600">↑ +2.4%</span>
                </div>
              </div>
            </div>

            {/* Filled Area Chart (Catalyst Style Orange Gradient) */}
            <div className="mt-3 pt-1">
              <svg viewBox="0 0 300 105" className="w-full h-18 overflow-visible">
                <defs>
                  <linearGradient id="catalystAreaGradDynamic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff5b1a" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#ff5b1a" stopOpacity="0.03" />
                  </linearGradient>
                </defs>
                <line x1="10" y1="30" x2="290" y2="30" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="10" y1="60" x2="290" y2="60" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="10" y1="88" x2="290" y2="88" stroke="#e2e8f0" strokeWidth="1" />
                <path d={areaFillPath} fill="url(#catalystAreaGradDynamic)" />
                <path d={areaCurvePath} fill="none" stroke="#ff5b1a" strokeWidth="2.2" strokeLinecap="round" />
                {["Feb", "Mar", "Apr", "May", "Jun", "Jul"].map((m, i) => (
                  <text
                    key={m}
                    x={20 + i * 50}
                    y="100"
                    fontSize="8.5"
                    fill="#94a3b8"
                    textAnchor="middle"
                    fontWeight="500"
                  >
                    {m}
                  </text>
                ))}
              </svg>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* CARD 4: Signal Provenance Channels (Stacked Bar & Table)     */}
        {/* ------------------------------------------------------------ */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-600">
                Signal Provenance Channels
              </span>
              <button
                type="button"
                onClick={() => onSelectTab("observations")}
                className="text-[11px] font-semibold text-neutral-400 hover:text-neutral-700 border border-neutral-200/80 px-2.5 py-0.5 rounded-lg transition-colors cursor-pointer"
              >
                Details
              </button>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-neutral-900 tracking-tight">
                {integrityIndex}%
              </span>
              <span className="text-xs font-semibold text-neutral-400 font-mono">
                -0.4%
              </span>
            </div>

            {/* Stacked colored horizontal bar */}
            <div className="w-full h-2 rounded-full overflow-hidden flex gap-1 mt-3">
              <div className="h-full bg-amber-400" style={{ width: "48%" }} />
              <div className="h-full bg-sky-400" style={{ width: "28%" }} />
              <div className="h-full bg-purple-600" style={{ width: "24%" }} />
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 mt-2 text-[10px] text-neutral-500 font-medium">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Canvas LMS
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                Faculty Labs
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-600" />
                Advising Logs
              </span>
            </div>

            {/* Channels Table */}
            <div className="mt-3 pt-2 border-t border-neutral-100">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-neutral-400 text-[10px] font-semibold text-left">
                    <th className="pb-1.5 font-medium">Channel</th>
                    <th className="pb-1.5 font-medium text-right">Percent</th>
                    <th className="pb-1.5 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  <tr>
                    <td className="py-1.5 font-medium text-neutral-800">Canvas LMS</td>
                    <td className="py-1.5 text-right font-semibold text-neutral-600">48%</td>
                    <td className="py-1.5 text-right font-mono font-bold text-neutral-900">
                      {canvasLmsCount.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-medium text-neutral-800">Faculty Evaluations</td>
                    <td className="py-1.5 text-right font-semibold text-neutral-600">28%</td>
                    <td className="py-1.5 text-right font-mono font-bold text-neutral-900">
                      {facultyCount.toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-medium text-neutral-800">Lab Telemetry</td>
                    <td className="py-1.5 text-right font-semibold text-neutral-600">24%</td>
                    <td className="py-1.5 text-right font-mono font-bold text-neutral-900">
                      {labCount.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-center pt-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => onSelectTab("observations")}
              className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer"
            >
              View telemetry ledger →
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* CARD 5: 12-Week Attendance Matrix (Catalyst Staircase Heatmap)*/}
        {/* ------------------------------------------------------------ */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-600">
                Term Consistency Matrix
              </span>
              <button
                type="button"
                onClick={() => onSelectTab("evidence")}
                className="text-[11px] font-semibold text-neutral-400 hover:text-neutral-700 border border-neutral-200/80 px-2.5 py-0.5 rounded-lg transition-colors cursor-pointer"
              >
                Details
              </button>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-neutral-900 tracking-tight">
                {attendanceNum}%
              </span>
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold ${
                  attendanceNum >= 75 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {attendanceNum >= 75 ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                <span>{attendanceNum >= 75 ? "+2.0%" : "-4.5%"}</span>
              </span>
            </div>

            {/* Catalyst Signature Staircase Retention Heatmap Matrix */}
            <div className="mt-3.5 space-y-1">
              {heatmapRows.map((row) => (
                <div key={row.row} className="flex items-center gap-1">
                  {row.cells.map((alpha, colIdx) => (
                    <div
                      key={colIdx}
                      style={{
                        backgroundColor: `rgba(234, 88, 12, ${alpha})`,
                      }}
                      className="w-4 h-3.5 rounded-xs transition-opacity hover:opacity-100 cursor-pointer"
                      title={`Week ${colIdx + 1} • Consistency Density: ${Math.round(alpha * 100)}%`}
                    />
                  ))}
                </div>
              ))}

              {/* Week labels 1 to 12 along bottom */}
              <div className="flex items-center gap-1 pt-1 text-[8px] font-mono text-neutral-400">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((w) => (
                  <span key={w} className="w-4 text-center">
                    {w}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-neutral-100 text-[10px] text-neutral-400 flex items-center justify-between">
            <span>🕒 Last 12 weeks telemetry updated at 1:51 PM</span>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* CARD 6: Holistic Competency Radar (Multi-Axis Spider Chart)  */}
        {/* ------------------------------------------------------------ */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-600">
                Holistic Competency Radar
              </span>
              <button
                type="button"
                onClick={() => onSelectTab("scenarios")}
                className="text-[11px] font-semibold text-neutral-400 hover:text-neutral-700 border border-neutral-200/80 px-2.5 py-0.5 rounded-lg transition-colors cursor-pointer"
              >
                Details
              </button>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-neutral-900 tracking-tight">
                {compositeScore}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold ${
                  parseFloat(compositeScore) >= 70 ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                {parseFloat(compositeScore) >= 70 ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                <span>{parseFloat(compositeScore) >= 70 ? "+1.1%" : "-2.3%"}</span>
              </span>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-2 text-[10px] text-neutral-500 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#ff5b1a]" />
                Student Mastery
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Cohort Baseline
              </span>
            </div>

            {/* Radar / Spider Chart SVG with ample margins */}
            <div className="mt-1 flex justify-center">
              <svg viewBox="0 0 320 220" className="w-full h-44 overflow-visible">
                {/* Concentric Guide Hexagons */}
                {radarMath.rings.map((poly, idx) => (
                  <polygon
                    key={idx}
                    points={poly}
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="1.2"
                  />
                ))}

                {/* Axis Spokes */}
                {radarMath.axes.map((ax, idx) => (
                  <g key={idx}>
                    <line
                      x1={radarMath.cx}
                      y1={radarMath.cy}
                      x2={ax.x2}
                      y2={ax.y2}
                      stroke="#e2e8f0"
                      strokeWidth="1"
                    />
                    <text
                      x={ax.labelX}
                      y={ax.labelY}
                      fontSize="8"
                      fill="#64748b"
                      textAnchor={ax.textAnchor}
                      fontWeight="600"
                    >
                      {ax.label}
                    </text>
                  </g>
                ))}

                {/* Cohort Benchmark Polygon (Dashed Green) */}
                <polygon
                  points={radarMath.cohortPoly}
                  fill="#10b981"
                  fillOpacity="0.12"
                  stroke="#10b981"
                  strokeWidth="1.6"
                  strokeDasharray="4 3"
                />

                {/* Student Mastery Polygon (Catalyst Orange) */}
                <polygon
                  points={radarMath.studentPoly}
                  fill="#ff5b1a"
                  fillOpacity="0.25"
                  stroke="#ff5b1a"
                  strokeWidth="2"
                />

                {/* Student Vertices Dots */}
                {radarMath.studentPts.map((p, idx) => (
                  <circle
                    key={idx}
                    cx={p.x}
                    cy={p.y}
                    r="2.8"
                    fill="#ffffff"
                    stroke="#ff5b1a"
                    strokeWidth="1.8"
                  />
                ))}
              </svg>
            </div>
          </div>

          <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
            <span>Composite Mastery Index</span>
            <span className="font-bold text-neutral-800">
              Grade: {student.grade && student.grade !== "N/A" ? student.grade : "B+"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
