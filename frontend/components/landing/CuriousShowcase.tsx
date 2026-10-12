"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { MoveHorizontal } from "lucide-react";

export default function CuriousShowcase() {
  const showcaseProjects = [
    {
      id: 1,
      title: "Academic Peer Tutoring Match",
      image:
        "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: 2,
      title: "Attendance Drift Early Outreach",
      image:
        "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: 3,
      title: "Confidential Wellness Referral",
      image:
        "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: 4,
      title: "Emergency Hardship Aid Desk",
      image:
        "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: 5,
      title: "Mentorship 1-on-1 Consultation",
      image:
        "https://images.unsplash.com/photo-1531545514256-b1400bc00f31?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: 6,
      title: "Remedial Coursework Pacing",
      image:
        "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: 7,
      title: "Cohort Persistence Ledger",
      image:
        "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80",
    },
  ];

  // Tripled dataset to guarantee an infinite, seamless circular loop
  const infiniteProjects = [
    ...showcaseProjects.map((p) => ({ ...p, uniqueKey: `set0-${p.id}` })),
    ...showcaseProjects.map((p) => ({ ...p, uniqueKey: `set1-${p.id}` })),
    ...showcaseProjects.map((p) => ({ ...p, uniqueKey: `set2-${p.id}` })),
  ];

  // Infinite Drag & Dynamic Ratio State
  const containerRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(1200);

  // Dynamic Ratio-Based Dimensions
  const [cardWidth, setCardWidth] = useState(330);
  const [cardHeight, setCardHeight] = useState(460);
  const cardGap = 20; // px seamless gap
  const cardStep = cardWidth + cardGap;
  const setLength = showcaseProjects.length * cardStep;

  // High-performance RAF refs
  const posRef = useRef(0);
  const velRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const isDownRef = useRef(false);
  const lastClientXRef = useRef(0);
  const lastTimestampRef = useRef(0);
  const isUserInteractingRef = useRef(false);
  const userInteractedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Measure Aspect Ratio & Dynamically Expand Dimensions
  useEffect(() => {
    const handleResize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const aspectRatio = vw / Math.max(vh, 1);
      setViewportWidth(vw);

      if (aspectRatio >= 1.7) {
        // Ultrawide: Expand cards generously
        const computedWidth = Math.min(Math.max(vw * 0.22, 340), 440);
        setCardWidth(computedWidth);
        setCardHeight(Math.min(Math.max(vh * 0.52, 440), 560));
      } else if (aspectRatio >= 1.2) {
        // Desktop / Laptop
        const computedWidth = Math.min(Math.max(vw * 0.24, 300), 380);
        setCardWidth(computedWidth);
        setCardHeight(Math.min(Math.max(vh * 0.48, 410), 500));
      } else if (aspectRatio >= 0.8) {
        // Tablet / Square Window
        const computedWidth = Math.min(Math.max(vw * 0.42, 280), 340);
        setCardWidth(computedWidth);
        setCardHeight(420);
      } else {
        // Mobile: Fluid width
        const computedWidth = Math.min(Math.max(vw * 0.78, 250), 310);
        setCardWidth(computedWidth);
        setCardHeight(390);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Set initial position centered in middle set (Set 1)
  useEffect(() => {
    const initialPos = -setLength + (viewportWidth - cardWidth) / 2;
    posRef.current = initialPos;
    setTranslateX(initialPos);
  }, [setLength, viewportWidth, cardWidth]);

  // True Infinite Loop + Inertia Momentum + Autoplay RAF Engine
  useEffect(() => {
    const tick = () => {
      let pos = posRef.current;
      let vel = velRef.current;

      if (!isDownRef.current) {
        // 1. Inertia deceleration if thrown by user
        if (Math.abs(vel) > 0.05) {
          vel *= 0.94;
          pos += vel;
        } else if (!isHovered && !isUserInteractingRef.current) {
          // 2. INFINITE AUTOPLAY: Continuous endless glide
          const autoplaySpeed = 0.75;
          pos -= autoplaySpeed;
        }
      }

      // 3. INFINITE MODULO WRAP-AROUND
      const minWrap = -2 * setLength;
      const maxWrap = 0;

      while (pos < minWrap) {
        pos += setLength;
      }
      while (pos > maxWrap - setLength) {
        pos -= setLength;
      }

      posRef.current = pos;
      velRef.current = vel;
      setTranslateX(pos);

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [setLength, isHovered]);

  const markUserInteraction = () => {
    isUserInteractingRef.current = true;
    if (userInteractedTimeoutRef.current) {
      clearTimeout(userInteractedTimeoutRef.current);
    }
    userInteractedTimeoutRef.current = setTimeout(() => {
      isUserInteractingRef.current = false;
    }, 2000);
  };

  // Drag Handlers
  const onDragStart = (clientX: number) => {
    markUserInteraction();
    isDownRef.current = true;
    setIsDragging(true);
    lastClientXRef.current = clientX;
    lastTimestampRef.current = performance.now();
    velRef.current = 0;
  };

  const onDragMove = (clientX: number) => {
    if (!isDownRef.current) return;
    markUserInteraction();

    const now = performance.now();
    const dt = Math.max(now - lastTimestampRef.current, 8);
    const dx = clientX - lastClientXRef.current;

    const instantVel = (dx / dt) * 16.67;
    velRef.current = velRef.current * 0.35 + instantVel * 0.65;

    let nextPos = posRef.current + dx;

    while (nextPos < -2 * setLength) {
      nextPos += setLength;
    }
    while (nextPos > -setLength) {
      nextPos -= setLength;
    }

    posRef.current = nextPos;
    setTranslateX(nextPos);

    lastClientXRef.current = clientX;
    lastTimestampRef.current = now;
  };

  const onDragEnd = () => {
    if (!isDownRef.current) return;
    isDownRef.current = false;
    setIsDragging(false);
    markUserInteraction();
  };

  // Horizontal Wheel Support (Trackpad Swipe / Shift+Wheel)
  const onWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
      markUserInteraction();
      const delta = e.deltaX !== 0 ? -e.deltaX : -e.deltaY;
      velRef.current += delta * 0.45;
    }
  };

  // Global mouse release safety
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (isDownRef.current) {
        onDragMove(e.clientX);
      }
    };
    const handleWindowMouseUp = () => {
      if (isDownRef.current) {
        onDragEnd();
      }
    };

    window.addEventListener("mousemove", handleWindowMouseMove, { passive: true });
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [setLength]);

  return (
    <section
      id="projects"
      className="py-16 sm:py-24 lg:py-32 bg-white text-slate-900 overflow-hidden select-none transition-colors duration-300"
    >
      <div className="max-w-[2400px] mx-auto px-4 sm:px-6 lg:px-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
          <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-3">
            Behind the Interventions
          </p>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-display font-extrabold tracking-tight text-slate-900 leading-[1.12]">
            Curious How SUTRA Protects <br />
            Every Student?
          </h2>

          <p className="mt-4 text-xs sm:text-sm md:text-base text-slate-500 leading-relaxed max-w-lg mx-auto">
            Explore role-governed support cases, ethical signal provenance, and holistic student care workflows across our platform.
          </p>

          {/* Action CTAs & Interactive Indicator */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white transition-all shadow-xs flex items-center gap-2 group"
            >
              <span>Explore Workflows</span>
            </Link>

            {/* Drag & Infinite Autoplay Cue */}
            <div className="inline-flex items-center gap-1.5 text-slate-400 text-xs font-medium">
              <MoveHorizontal className="w-3.5 h-3.5" />
              <span>Drag to explore</span>
            </div>
          </div>
        </div>

        {/* Drag-Driven Truly Infinite Seamless Horizontal Parallax Stage */}
        <div
          ref={containerRef}
          onWheel={onWheel}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false);
            if (isDownRef.current) {
              onDragEnd();
            }
          }}
          className={`relative w-full py-4 sm:py-8 overflow-hidden no-scrollbar bg-transparent ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          onMouseDown={(e) => onDragStart(e.clientX)}
          onTouchStart={(e) => onDragStart(e.touches[0].clientX)}
          onTouchMove={(e) => onDragMove(e.touches[0].clientX)}
          onTouchEnd={onDragEnd}
        >
          {/* Smooth Infinite Card Track (Zero Card Shadows, Seamless Borders) */}
          <div
            className="flex items-center gap-4 sm:gap-5 will-change-transform no-scrollbar bg-transparent"
            style={{
              transform: `translate3d(${translateX}px, 0, 0)`,
            }}
          >
            {infiniteProjects.map((item, index) => {
              // Real-time horizontal parallax offset calculation for each visible card
              const cardCenterPos = translateX + index * cardStep + cardWidth / 2;
              const viewportCenter = viewportWidth / 2;
              const offsetRatio = (cardCenterPos - viewportCenter) / (viewportWidth * 0.5);

              // Parallax pan distance for inner imagery
              const imageParallaxX = -Math.max(Math.min(offsetRatio * 52, 70), -70);

              return (
                <div
                  key={item.uniqueKey}
                  style={{ 
                    width: `${cardWidth}px`,
                    height: `${cardHeight}px`,
                  }}
                  className="shrink-0 rounded-2xl sm:rounded-3xl md:rounded-[30px] overflow-hidden shadow-none border-0 relative group bg-transparent select-none transform-gpu transition-all duration-300"
                >
                  {/* Straight Image Container with Authentic Horizontal Parallax Pan */}
                  <div className="w-full h-full overflow-hidden relative rounded-2xl sm:rounded-3xl md:rounded-[30px]">
                    <img
                      src={item.image}
                      alt={item.title}
                      draggable={false}
                      className="w-[130%] h-full max-w-none object-cover select-none pointer-events-none will-change-transform transition-transform duration-75 ease-out"
                      style={{
                        transform: `translate3d(${imageParallaxX}px, 0, 0)`,
                      }}
                    />

                    {/* Normal Blackish Shadow Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent pointer-events-none" />

                    {/* Card Title Content */}
                    <div className="absolute bottom-4 sm:bottom-5 left-4 sm:left-5 right-4 sm:right-5 text-white pointer-events-none">
                      <p className="text-xs sm:text-sm md:text-base font-bold leading-snug drop-shadow-md">
                        {item.title}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
