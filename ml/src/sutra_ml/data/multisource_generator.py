"""
SUTRA Deterministic Multisource Synthetic Student Data Generator.

Generates reproducible, internally consistent 360-degree synthetic student success profiles
covering attendance, coursework marks, LMS participation, sensitive fee status, career skills,
and faculty feedback observations.

SAFEGUARDS:
- Strictly synthetic non-PII keys ('SYNTH-360-xxx').
- Deterministic RNG seeding.
- Feeds contain zero real student templates.
- Explicit synthetic provenance metadata.
"""

from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any, List, Optional
import numpy as np

from sutra_ml.schemas.multisource import (
    AcademicPerformanceMetrics,
    AcademicStanding,
    AttendanceMetrics,
    AttendanceTrend,
    DataQualityStatus,
    FacultyEvidenceCategory,
    FacultyObservationEntry,
    FacultySentiment,
    FeePaymentStatus,
    FeeStatusMetrics,
    FinancialAidStatus,
    InternshipStatus,
    LmsParticipationMetrics,
    PlacementTier,
    SkillsAndPlacementMetrics,
    StudentSuccess360Profile,
)


class MultisourceDataGenerator:
    """
    Deterministic synthetic generator for 360-degree student success data.
    """

    def __init__(self, seed: int = 42):
        self.seed = seed
        self.rng = np.random.default_rng(seed)

    def generate_named_scenarios(self) -> dict[str, StudentSuccess360Profile]:
        """
        Generate the 10 curated demonstration scenarios.
        """
        scenarios = {}

        # 1. ON_TRACK_THRIVING
        scenarios["ON_TRACK_THRIVING"] = StudentSuccess360Profile(
            student_key="SYNTH-360-ONTRACK-01",
            academic_term="2026-FALL",
            department="Computer Science",
            program_year=2,
            snapshot_timestamp="2026-10-15T00:00:00Z",
            is_synthetic=True,
            synthetic_seed=self.seed,
            scenario_name="ON_TRACK_THRIVING",
            attendance=AttendanceMetrics(
                overall_attendance_pct=95.5,
                recent_attendance_pct=96.0,
                consecutive_absences=0,
                lecture_attendance_pct=96.0,
                lab_attendance_pct=95.0,
                attendance_trend=AttendanceTrend.STABLE,
                last_attendance_date="2026-10-14",
                source_freshness_days=1,
            ),
            academics=AcademicPerformanceMetrics(
                cumulative_gpa=3.82,
                current_term_average_pct=88.5,
                assessments_completed=4,
                assessments_due=4,
                assessments_overdue=0,
                failed_assessments_count=0,
                recent_quiz_average_pct=92.0,
                midterm_grade="A",
                academic_standing=AcademicStanding.GOOD_STANDING,
                source_freshness_days=1,
            ),
            participation=LmsParticipationMetrics(
                total_platform_logins_d30=38,
                active_learning_days_d30=24,
                days_since_last_lms_login=0,
                discussion_forum_posts=14,
                content_resource_views=165,
                weekly_study_velocity_hours=8.5,
                assignment_submission_rate_pct=100.0,
                source_freshness_days=1,
            ),
            fee_status=FeeStatusMetrics(
                status=FeePaymentStatus.PAID,
                days_past_due=0,
                has_financial_hold=False,
                financial_aid_status=FinancialAidStatus.NONE,
                bursary_eligibility_flag=False,
                source_freshness_days=1,
            ),
            skills_placement=SkillsAndPlacementMetrics(
                technical_skills_score=86.0,
                soft_skills_rating=4.5,
                resume_reviewed=True,
                mock_interview_completed=True,
                mock_interview_score=88.0,
                internship_status=InternshipStatus.APPLYING,
                placement_readiness_tier=PlacementTier.READY,
                certifications_earned=2,
                source_freshness_days=2,
            ),
            faculty_observations=[
                FacultyObservationEntry(
                    observation_id="OBS-001-A",
                    timestamp="2026-10-12T14:30:00Z",
                    faculty_role="COURSE_INSTRUCTOR",
                    course_code="CS201",
                    sentiment=FacultySentiment.POSITIVE,
                    evidence_category=FacultyEvidenceCategory.OUTSTANDING_EFFORT,
                    summary_notes="Student exhibits exceptional grasp of data structures and assists peers in laboratory sessions.",
                    action_recommended_by_faculty="Recommend for peer teaching assistant fellowship next semester.",
                )
            ],
            data_quality=DataQualityStatus(is_stale=False, missing_sources=[], data_completeness_pct=100.0),
        )

        # 2. ATTENDANCE_ANOMALY_STRONG_ACADEMIC
        scenarios["ATTENDANCE_ANOMALY_STRONG_ACADEMIC"] = StudentSuccess360Profile(
            student_key="SYNTH-360-ATT-ANOMALY-02",
            academic_term="2026-FALL",
            department="Electrical Engineering",
            program_year=3,
            snapshot_timestamp="2026-10-15T00:00:00Z",
            is_synthetic=True,
            synthetic_seed=self.seed,
            scenario_name="ATTENDANCE_ANOMALY_STRONG_ACADEMIC",
            attendance=AttendanceMetrics(
                overall_attendance_pct=82.0,
                recent_attendance_pct=42.0,  # Sharp drop
                consecutive_absences=4,
                lecture_attendance_pct=40.0,
                lab_attendance_pct=50.0,
                attendance_trend=AttendanceTrend.CRITICAL_DROP,
                last_attendance_date="2026-09-30",
                source_freshness_days=1,
            ),
            academics=AcademicPerformanceMetrics(
                cumulative_gpa=3.70,
                current_term_average_pct=84.0,  # High academic marks
                assessments_completed=3,
                assessments_due=3,
                assessments_overdue=0,
                failed_assessments_count=0,
                recent_quiz_average_pct=88.0,
                midterm_grade="A-",
                academic_standing=AcademicStanding.GOOD_STANDING,
                source_freshness_days=1,
            ),
            participation=LmsParticipationMetrics(
                total_platform_logins_d30=22,
                active_learning_days_d30=15,
                days_since_last_lms_login=1,
                discussion_forum_posts=3,
                content_resource_views=110,
                weekly_study_velocity_hours=6.0,
                assignment_submission_rate_pct=100.0,
                source_freshness_days=1,
            ),
            fee_status=FeeStatusMetrics(
                status=FeePaymentStatus.PAID,
                days_past_due=0,
                has_financial_hold=False,
                financial_aid_status=FinancialAidStatus.NONE,
                bursary_eligibility_flag=False,
                source_freshness_days=1,
            ),
            skills_placement=SkillsAndPlacementMetrics(
                technical_skills_score=80.0,
                soft_skills_rating=4.0,
                resume_reviewed=True,
                mock_interview_completed=False,
                mock_interview_score=None,
                internship_status=InternshipStatus.APPLYING,
                placement_readiness_tier=PlacementTier.DEVELOPING,
                certifications_earned=1,
                source_freshness_days=3,
            ),
            faculty_observations=[
                FacultyObservationEntry(
                    observation_id="OBS-002-B",
                    timestamp="2026-10-10T11:00:00Z",
                    faculty_role="COURSE_INSTRUCTOR",
                    course_code="EE301",
                    sentiment=FacultySentiment.CONCERN,
                    evidence_category=FacultyEvidenceCategory.ATTENDANCE,
                    summary_notes="Student missed the last 2 weeks of lecture sessions, but continues to submit lab problem sets online with high marks.",
                    action_recommended_by_faculty="Advisor check-in to confirm student wellbeing or timetable overlap.",
                )
            ],
            data_quality=DataQualityStatus(is_stale=False, missing_sources=[], data_completeness_pct=100.0),
        )

        # 3. ACADEMIC_AND_PARTICIPATION_STRUGGLE
        scenarios["ACADEMIC_AND_PARTICIPATION_STRUGGLE"] = StudentSuccess360Profile(
            student_key="SYNTH-360-ACAD-STRUGGLE-03",
            academic_term="2026-FALL",
            department="Mathematics",
            program_year=1,
            snapshot_timestamp="2026-10-15T00:00:00Z",
            is_synthetic=True,
            synthetic_seed=self.seed,
            scenario_name="ACADEMIC_AND_PARTICIPATION_STRUGGLE",
            attendance=AttendanceMetrics(
                overall_attendance_pct=58.0,
                recent_attendance_pct=45.0,
                consecutive_absences=3,
                lecture_attendance_pct=55.0,
                lab_attendance_pct=60.0,
                attendance_trend=AttendanceTrend.DECLINING,
                last_attendance_date="2026-10-06",
                source_freshness_days=2,
            ),
            academics=AcademicPerformanceMetrics(
                cumulative_gpa=1.92,
                current_term_average_pct=44.0,  # Below 50%
                assessments_completed=1,
                assessments_due=3,
                assessments_overdue=2,  # Overdue
                failed_assessments_count=2,  # 2 fails
                recent_quiz_average_pct=38.0,
                midterm_grade="F",
                academic_standing=AcademicStanding.ACADEMIC_WARNING,
                source_freshness_days=2,
            ),
            participation=LmsParticipationMetrics(
                total_platform_logins_d30=6,
                active_learning_days_d30=2,
                days_since_last_lms_login=15,  # Inactive > 14 days
                discussion_forum_posts=0,
                content_resource_views=18,
                weekly_study_velocity_hours=0.8,
                assignment_submission_rate_pct=33.3,
                source_freshness_days=2,
            ),
            fee_status=FeeStatusMetrics(
                status=FeePaymentStatus.PAID,
                days_past_due=0,
                has_financial_hold=False,
                financial_aid_status=FinancialAidStatus.NONE,
                bursary_eligibility_flag=False,
                source_freshness_days=2,
            ),
            skills_placement=SkillsAndPlacementMetrics(
                technical_skills_score=35.0,
                soft_skills_rating=2.0,
                resume_reviewed=False,
                mock_interview_completed=False,
                mock_interview_score=None,
                internship_status=InternshipStatus.NOT_APPLIED,
                placement_readiness_tier=PlacementTier.NEEDS_SUPPORT,
                certifications_earned=0,
                source_freshness_days=4,
            ),
            faculty_observations=[
                FacultyObservationEntry(
                    observation_id="OBS-003-C",
                    timestamp="2026-10-08T16:00:00Z",
                    faculty_role="COURSE_INSTRUCTOR",
                    course_code="MATH101",
                    sentiment=FacultySentiment.CONCERN,
                    evidence_category=FacultyEvidenceCategory.CONCEPTUAL_DIFFICULTY,
                    summary_notes="Student scored 32% on Calculus Quiz 1 and missed the midterm revision session.",
                    action_recommended_by_faculty="Urgent referral to Mathematics Learning Center tutoring.",
                )
            ],
            data_quality=DataQualityStatus(is_stale=False, missing_sources=[], data_completeness_pct=100.0),
        )

        # 4. FINANCIAL_SUPPORT_NEEDED
        scenarios["FINANCIAL_SUPPORT_NEEDED"] = StudentSuccess360Profile(
            student_key="SYNTH-360-FIN-SUPPORT-04",
            academic_term="2026-FALL",
            department="Business Administration",
            program_year=2,
            snapshot_timestamp="2026-10-15T00:00:00Z",
            is_synthetic=True,
            synthetic_seed=self.seed,
            scenario_name="FINANCIAL_SUPPORT_NEEDED",
            attendance=AttendanceMetrics(
                overall_attendance_pct=88.0,
                recent_attendance_pct=85.0,
                consecutive_absences=0,
                lecture_attendance_pct=88.0,
                lab_attendance_pct=88.0,
                attendance_trend=AttendanceTrend.STABLE,
                last_attendance_date="2026-10-14",
                source_freshness_days=1,
            ),
            academics=AcademicPerformanceMetrics(
                cumulative_gpa=3.25,
                current_term_average_pct=76.0,
                assessments_completed=3,
                assessments_due=3,
                assessments_overdue=0,
                failed_assessments_count=0,
                recent_quiz_average_pct=78.0,
                midterm_grade="B",
                academic_standing=AcademicStanding.GOOD_STANDING,
                source_freshness_days=1,
            ),
            participation=LmsParticipationMetrics(
                total_platform_logins_d30=20,
                active_learning_days_d30=14,
                days_since_last_lms_login=2,
                discussion_forum_posts=4,
                content_resource_views=90,
                weekly_study_velocity_hours=5.5,
                assignment_submission_rate_pct=100.0,
                source_freshness_days=1,
            ),
            fee_status=FeeStatusMetrics(
                status=FeePaymentStatus.OVERDUE,
                days_past_due=35,
                has_financial_hold=True,  # Financial hold active
                financial_aid_status=FinancialAidStatus.UNDER_REVIEW,
                bursary_eligibility_flag=True,  # Eligible for emergency aid
                access_restriction_level="RESTRICTED_FINANCIAL_AID_ONLY",
                source_freshness_days=1,
            ),
            skills_placement=SkillsAndPlacementMetrics(
                technical_skills_score=68.0,
                soft_skills_rating=3.8,
                resume_reviewed=True,
                mock_interview_completed=False,
                mock_interview_score=None,
                internship_status=InternshipStatus.APPLYING,
                placement_readiness_tier=PlacementTier.DEVELOPING,
                certifications_earned=1,
                source_freshness_days=2,
            ),
            faculty_observations=[],
            data_quality=DataQualityStatus(is_stale=False, missing_sources=[], data_completeness_pct=100.0),
        )

        # 5. PLACEMENT_READINESS_DEFICIT
        scenarios["PLACEMENT_READINESS_DEFICIT"] = StudentSuccess360Profile(
            student_key="SYNTH-360-PLACE-DEFICIT-05",
            academic_term="2026-FALL",
            department="Computer Science",
            program_year=4,  # Senior year
            snapshot_timestamp="2026-10-15T00:00:00Z",
            is_synthetic=True,
            synthetic_seed=self.seed,
            scenario_name="PLACEMENT_READINESS_DEFICIT",
            attendance=AttendanceMetrics(
                overall_attendance_pct=86.0,
                recent_attendance_pct=88.0,
                consecutive_absences=0,
                lecture_attendance_pct=86.0,
                lab_attendance_pct=86.0,
                attendance_trend=AttendanceTrend.STABLE,
                last_attendance_date="2026-10-14",
                source_freshness_days=1,
            ),
            academics=AcademicPerformanceMetrics(
                cumulative_gpa=3.10,
                current_term_average_pct=72.0,
                assessments_completed=3,
                assessments_due=3,
                assessments_overdue=0,
                failed_assessments_count=0,
                recent_quiz_average_pct=74.0,
                midterm_grade="B-",
                academic_standing=AcademicStanding.GOOD_STANDING,
                source_freshness_days=1,
            ),
            participation=LmsParticipationMetrics(
                total_platform_logins_d30=24,
                active_learning_days_d30=16,
                days_since_last_lms_login=1,
                discussion_forum_posts=2,
                content_resource_views=105,
                weekly_study_velocity_hours=6.0,
                assignment_submission_rate_pct=100.0,
                source_freshness_days=1,
            ),
            fee_status=FeeStatusMetrics(
                status=FeePaymentStatus.PAID,
                days_past_due=0,
                has_financial_hold=False,
                financial_aid_status=FinancialAidStatus.NONE,
                bursary_eligibility_flag=False,
                source_freshness_days=1,
            ),
            skills_placement=SkillsAndPlacementMetrics(
                technical_skills_score=42.0,  # Below benchmark
                soft_skills_rating=2.5,
                resume_reviewed=False,  # Not reviewed
                mock_interview_completed=False,  # Incomplete
                mock_interview_score=None,
                internship_status=InternshipStatus.NOT_APPLIED,
                placement_readiness_tier=PlacementTier.NEEDS_SUPPORT,
                certifications_earned=0,
                source_freshness_days=2,
            ),
            faculty_observations=[
                FacultyObservationEntry(
                    observation_id="OBS-005-E",
                    timestamp="2026-10-05T10:00:00Z",
                    faculty_role="CAREER_PLACEMENT_OFFICER",
                    course_code="CAREER-SEM",
                    sentiment=FacultySentiment.CONCERN,
                    evidence_category=FacultyEvidenceCategory.DEADLINE_STRUGGLE,
                    summary_notes="Senior student has not uploaded certified resume or completed technical interview screening.",
                    action_recommended_by_faculty="Priority invitation to career clinic drop-in session.",
                )
            ],
            data_quality=DataQualityStatus(is_stale=False, missing_sources=[], data_completeness_pct=100.0),
        )

        # 6. CONFLICTING_SIGNALS_HUMAN_REVIEW
        scenarios["CONFLICTING_SIGNALS_HUMAN_REVIEW"] = StudentSuccess360Profile(
            student_key="SYNTH-360-CONFLICT-06",
            academic_term="2026-FALL",
            department="Data Science",
            program_year=2,
            snapshot_timestamp="2026-10-15T00:00:00Z",
            is_synthetic=True,
            synthetic_seed=self.seed,
            scenario_name="CONFLICTING_SIGNALS_HUMAN_REVIEW",
            attendance=AttendanceMetrics(
                overall_attendance_pct=92.0,
                recent_attendance_pct=90.0,
                consecutive_absences=0,
                lecture_attendance_pct=92.0,
                lab_attendance_pct=92.0,
                attendance_trend=AttendanceTrend.STABLE,
                last_attendance_date="2026-10-14",
                source_freshness_days=1,
            ),
            academics=AcademicPerformanceMetrics(
                cumulative_gpa=2.85,
                current_term_average_pct=60.0,
                assessments_completed=0,  # Zero submissions
                assessments_due=2,
                assessments_overdue=2,  # Overdue
                failed_assessments_count=0,
                recent_quiz_average_pct=None,
                midterm_grade="PENDING",
                academic_standing=AcademicStanding.GOOD_STANDING,
                source_freshness_days=1,
            ),
            participation=LmsParticipationMetrics(
                total_platform_logins_d30=55,  # Very high platform logins
                active_learning_days_d30=28,  # Logged in daily
                days_since_last_lms_login=0,
                discussion_forum_posts=18,
                content_resource_views=310,  # Very high content views
                weekly_study_velocity_hours=12.0,
                assignment_submission_rate_pct=0.0,  # But 0% submitted!
                source_freshness_days=1,
            ),
            fee_status=FeeStatusMetrics(
                status=FeePaymentStatus.PAID,
                days_past_due=0,
                has_financial_hold=False,
                financial_aid_status=FinancialAidStatus.NONE,
                bursary_eligibility_flag=False,
                source_freshness_days=1,
            ),
            skills_placement=SkillsAndPlacementMetrics(
                technical_skills_score=72.0,
                soft_skills_rating=3.5,
                resume_reviewed=True,
                mock_interview_completed=False,
                mock_interview_score=None,
                internship_status=InternshipStatus.APPLYING,
                placement_readiness_tier=PlacementTier.DEVELOPING,
                certifications_earned=1,
                source_freshness_days=2,
            ),
            faculty_observations=[
                FacultyObservationEntry(
                    observation_id="OBS-006-F",
                    timestamp="2026-10-12T15:00:00Z",
                    faculty_role="COURSE_INSTRUCTOR",
                    course_code="DS201",
                    sentiment=FacultySentiment.NEUTRAL,
                    evidence_category=FacultyEvidenceCategory.ENGAGEMENT,
                    summary_notes="Student attends all lectures and downloads code notebooks but did not submit Assignment 1 or Assignment 2.",
                    action_recommended_by_faculty="Investigate whether student experienced submission upload errors.",
                )
            ],
            data_quality=DataQualityStatus(is_stale=False, missing_sources=[], data_completeness_pct=100.0),
        )

        # 7. STALE_AND_MISSING_DATA
        scenarios["STALE_AND_MISSING_DATA"] = StudentSuccess360Profile(
            student_key="SYNTH-360-STALE-DATA-07",
            academic_term="2026-FALL",
            department="Civil Engineering",
            program_year=2,
            snapshot_timestamp="2026-10-15T00:00:00Z",
            is_synthetic=True,
            synthetic_seed=self.seed,
            scenario_name="STALE_AND_MISSING_DATA",
            attendance=AttendanceMetrics(
                overall_attendance_pct=75.0,
                recent_attendance_pct=70.0,
                consecutive_absences=1,
                lecture_attendance_pct=75.0,
                lab_attendance_pct=75.0,
                attendance_trend=AttendanceTrend.STABLE,
                last_attendance_date="2026-09-20",
                source_freshness_days=25,  # 25 days stale!
            ),
            academics=AcademicPerformanceMetrics(
                cumulative_gpa=2.90,
                current_term_average_pct=68.0,
                assessments_completed=1,
                assessments_due=1,
                assessments_overdue=0,
                failed_assessments_count=0,
                recent_quiz_average_pct=70.0,
                midterm_grade="C+",
                academic_standing=AcademicStanding.GOOD_STANDING,
                source_freshness_days=22,  # Stale
            ),
            participation=LmsParticipationMetrics(
                total_platform_logins_d30=10,
                active_learning_days_d30=6,
                days_since_last_lms_login=8,
                discussion_forum_posts=1,
                content_resource_views=30,
                weekly_study_velocity_hours=2.5,
                assignment_submission_rate_pct=100.0,
                source_freshness_days=18,  # Stale
            ),
            fee_status=FeeStatusMetrics(
                status=FeePaymentStatus.PAID,
                days_past_due=0,
                has_financial_hold=False,
                financial_aid_status=FinancialAidStatus.NONE,
                bursary_eligibility_flag=False,
                source_freshness_days=30,
            ),
            skills_placement=SkillsAndPlacementMetrics(
                technical_skills_score=55.0,
                soft_skills_rating=3.0,
                resume_reviewed=False,
                mock_interview_completed=False,
                mock_interview_score=None,
                internship_status=InternshipStatus.NOT_APPLIED,
                placement_readiness_tier=PlacementTier.NOT_STARTED,
                certifications_earned=0,
                source_freshness_days=45,
            ),
            faculty_observations=[],
            data_quality=DataQualityStatus(
                is_stale=True,
                missing_sources=["lab_attendance_feed", "lms_clickstream"],
                data_completeness_pct=65.0,
                validation_passed=True,
            ),
        )

        # 8. POST_SUPPORT_RECOVERY
        scenarios["POST_SUPPORT_RECOVERY"] = StudentSuccess360Profile(
            student_key="SYNTH-360-RECOVERY-08",
            academic_term="2026-FALL",
            department="Computer Science",
            program_year=2,
            snapshot_timestamp="2026-10-15T00:00:00Z",
            is_synthetic=True,
            synthetic_seed=self.seed,
            scenario_name="POST_SUPPORT_RECOVERY",
            attendance=AttendanceMetrics(
                overall_attendance_pct=76.0,
                recent_attendance_pct=92.0,  # Recent is much higher!
                consecutive_absences=0,
                lecture_attendance_pct=90.0,
                lab_attendance_pct=95.0,
                attendance_trend=AttendanceTrend.IMPROVING,
                last_attendance_date="2026-10-14",
                source_freshness_days=1,
            ),
            academics=AcademicPerformanceMetrics(
                cumulative_gpa=2.75,
                current_term_average_pct=74.0,
                assessments_completed=3,
                assessments_due=3,
                assessments_overdue=0,  # Overdue resolved
                failed_assessments_count=0,
                recent_quiz_average_pct=82.0,
                midterm_grade="B",
                academic_standing=AcademicStanding.GOOD_STANDING,
                source_freshness_days=1,
            ),
            participation=LmsParticipationMetrics(
                total_platform_logins_d30=28,
                active_learning_days_d30=18,
                days_since_last_lms_login=1,
                discussion_forum_posts=8,
                content_resource_views=140,
                weekly_study_velocity_hours=7.0,
                assignment_submission_rate_pct=100.0,
                source_freshness_days=1,
            ),
            fee_status=FeeStatusMetrics(
                status=FeePaymentStatus.PAID,
                days_past_due=0,
                has_financial_hold=False,
                financial_aid_status=FinancialAidStatus.NONE,
                bursary_eligibility_flag=False,
                source_freshness_days=1,
            ),
            skills_placement=SkillsAndPlacementMetrics(
                technical_skills_score=70.0,
                soft_skills_rating=3.5,
                resume_reviewed=True,
                mock_interview_completed=True,
                mock_interview_score=75.0,
                internship_status=InternshipStatus.APPLYING,
                placement_readiness_tier=PlacementTier.DEVELOPING,
                certifications_earned=1,
                source_freshness_days=2,
            ),
            faculty_observations=[
                FacultyObservationEntry(
                    observation_id="OBS-008-H",
                    timestamp="2026-10-13T10:00:00Z",
                    faculty_role="COURSE_INSTRUCTOR",
                    course_code="CS202",
                    sentiment=FacultySentiment.POSITIVE,
                    evidence_category=FacultyEvidenceCategory.OUTSTANDING_EFFORT,
                    summary_notes="Student attended all tutoring sessions over the past 3 weeks and achieved 84% on Quiz 3. Marked upward trajectory.",
                    action_recommended_by_faculty="Acknowledge student's hard work and maintain periodic check-ins.",
                )
            ],
            data_quality=DataQualityStatus(is_stale=False, missing_sources=[], data_completeness_pct=100.0),
        )

        # 9. OVERDUE_ADVISORY_FOLLOWUP
        scenarios["OVERDUE_ADVISORY_FOLLOWUP"] = StudentSuccess360Profile(
            student_key="SYNTH-360-OVERDUE-FOLLOWUP-09",
            academic_term="2026-FALL",
            department="Mechanical Engineering",
            program_year=3,
            snapshot_timestamp="2026-10-15T00:00:00Z",
            is_synthetic=True,
            synthetic_seed=self.seed,
            scenario_name="OVERDUE_ADVISORY_FOLLOWUP",
            attendance=AttendanceMetrics(
                overall_attendance_pct=64.0,
                recent_attendance_pct=48.0,
                consecutive_absences=4,
                lecture_attendance_pct=50.0,
                lab_attendance_pct=55.0,
                attendance_trend=AttendanceTrend.DECLINING,
                last_attendance_date="2026-10-02",
                source_freshness_days=1,
            ),
            academics=AcademicPerformanceMetrics(
                cumulative_gpa=2.20,
                current_term_average_pct=48.0,
                assessments_completed=1,
                assessments_due=3,
                assessments_overdue=2,
                failed_assessments_count=2,
                recent_quiz_average_pct=40.0,
                midterm_grade="F",
                academic_standing=AcademicStanding.ACADEMIC_WARNING,
                source_freshness_days=1,
            ),
            participation=LmsParticipationMetrics(
                total_platform_logins_d30=12,
                active_learning_days_d30=5,
                days_since_last_lms_login=7,
                discussion_forum_posts=0,
                content_resource_views=35,
                weekly_study_velocity_hours=2.0,
                assignment_submission_rate_pct=33.3,
                source_freshness_days=1,
            ),
            fee_status=FeeStatusMetrics(
                status=FeePaymentStatus.PAID,
                days_past_due=0,
                has_financial_hold=False,
                financial_aid_status=FinancialAidStatus.NONE,
                bursary_eligibility_flag=False,
                source_freshness_days=1,
            ),
            skills_placement=SkillsAndPlacementMetrics(
                technical_skills_score=48.0,
                soft_skills_rating=2.8,
                resume_reviewed=False,
                mock_interview_completed=False,
                mock_interview_score=None,
                internship_status=InternshipStatus.NOT_APPLIED,
                placement_readiness_tier=PlacementTier.NEEDS_SUPPORT,
                certifications_earned=0,
                source_freshness_days=2,
            ),
            faculty_observations=[
                FacultyObservationEntry(
                    observation_id="OBS-009-I",
                    timestamp="2026-09-22T09:00:00Z",  # Over 20 days ago!
                    faculty_role="COURSE_INSTRUCTOR",
                    course_code="ME301",
                    sentiment=FacultySentiment.URGENT_CONCERN,
                    evidence_category=FacultyEvidenceCategory.CONCEPTUAL_DIFFICULTY,
                    summary_notes="Student failed first test and expressed overwhelming stress about the course workload. Requested advisor outreach.",
                    action_recommended_by_faculty="Urgent advisor consultation requested.",
                )
            ],
            data_quality=DataQualityStatus(is_stale=False, missing_sources=[], data_completeness_pct=100.0),
        )

        return scenarios

    def generate_random_profile(self, index: int) -> StudentSuccess360Profile:
        """
        Generate a single plausible randomized 360-degree synthetic student profile.
        """
        key = f"SYNTH-360-BATCH-{index:03d}"
        depts = ["Computer Science", "Information Technology", "Electrical Engineering", "Data Science", "Business Administration"]
        dept = str(self.rng.choice(depts))
        year = int(self.rng.integers(1, 5))

        # Attendance
        overall_att = round(float(self.rng.uniform(55.0, 98.0)), 1)
        att_delta = float(self.rng.uniform(-18.0, 8.0))
        recent_att = round(max(20.0, min(100.0, overall_att + att_delta)), 1)
        consec_abs = int(self.rng.choice([0, 0, 0, 1, 1, 2, 3, 4], p=[0.4, 0.2, 0.15, 0.1, 0.05, 0.05, 0.03, 0.02]))
        if consec_abs >= 4 or recent_att < 50.0:
            trend = AttendanceTrend.CRITICAL_DROP
        elif att_delta < -10.0:
            trend = AttendanceTrend.DECLINING
        elif att_delta > 5.0:
            trend = AttendanceTrend.IMPROVING
        else:
            trend = AttendanceTrend.STABLE

        # Academics
        gpa = round(float(self.rng.uniform(1.8, 3.95)), 2)
        term_avg = round(float(self.rng.uniform(42.0, 95.0)), 1)
        due = int(self.rng.integers(2, 5))
        overdue = int(self.rng.choice([0, 0, 1, 2], p=[0.7, 0.15, 0.1, 0.05]))
        completed = max(0, due - overdue)
        failed_count = int(self.rng.choice([0, 0, 0, 1, 2], p=[0.65, 0.15, 0.1, 0.07, 0.03]))
        standing = AcademicStanding.ACADEMIC_WARNING if (gpa < 2.0 or failed_count >= 2) else AcademicStanding.GOOD_STANDING

        # Participation
        logins = int(self.rng.integers(5, 50))
        active_days = min(30, int(self.rng.integers(2, 26)))
        days_since_lms = int(self.rng.choice([0, 1, 2, 3, 5, 8, 14, 18], p=[0.35, 0.25, 0.15, 0.1, 0.05, 0.05, 0.03, 0.02]))
        study_hours = round(float(self.rng.uniform(1.5, 12.0)), 1)

        # Fee status
        fee_options = [
            FeePaymentStatus.PAID,
            FeePaymentStatus.GRACE_PERIOD,
            FeePaymentStatus.OVERDUE,
            FeePaymentStatus.SCHOLARSHIP_PENDING,
        ]
        fee_idx = int(self.rng.choice([0, 1, 2, 3], p=[0.80, 0.08, 0.08, 0.04]))
        fee_status_val = fee_options[fee_idx]
        has_hold = (fee_status_val == FeePaymentStatus.OVERDUE) and bool(self.rng.choice([True, False], p=[0.7, 0.3]))
        days_due = int(self.rng.integers(15, 45)) if fee_status_val == FeePaymentStatus.OVERDUE else 0

        # Placement
        tech_score = round(float(self.rng.uniform(35.0, 95.0)), 1)
        soft_score = round(float(self.rng.uniform(2.0, 4.8)), 1)
        resume_rev = bool(self.rng.choice([True, False], p=[0.6, 0.4]))
        mock_done = bool(self.rng.choice([True, False], p=[0.5, 0.5]))
        if tech_score >= 75.0 and resume_rev and mock_done:
            place_tier = PlacementTier.READY
        elif tech_score < 50.0:
            place_tier = PlacementTier.NEEDS_SUPPORT
        else:
            place_tier = PlacementTier.DEVELOPING

        # Faculty observations (some get notes)
        faculty_notes = []
        if self.rng.random() < 0.35:
            sent_options = [FacultySentiment.POSITIVE, FacultySentiment.CONCERN, FacultySentiment.NEUTRAL]
            sent_idx = int(self.rng.choice([0, 1, 2], p=[0.4, 0.4, 0.2]))
            sent = sent_options[sent_idx]

            cat_options = [
                FacultyEvidenceCategory.ENGAGEMENT,
                FacultyEvidenceCategory.ATTENDANCE,
                FacultyEvidenceCategory.CONCEPTUAL_DIFFICULTY,
            ]
            cat_idx = int(self.rng.choice([0, 1, 2]))
            cat = cat_options[cat_idx]

            faculty_notes.append(
                FacultyObservationEntry(
                    observation_id=f"OBS-B{index:03d}-1",
                    timestamp="2026-10-11T12:00:00Z",
                    faculty_role="COURSE_INSTRUCTOR",
                    course_code=f"SUBJ{year}01",
                    sentiment=sent,
                    evidence_category=cat,
                    summary_notes=f"Periodic student review: {cat.value.lower()} observation noted in week 5.",
                    action_recommended_by_faculty="Routine academic advisory follow-up if trajectory continues.",
                )
            )

        return StudentSuccess360Profile(
            student_key=key,
            academic_term="2026-FALL",
            department=dept,
            program_year=year,
            snapshot_timestamp="2026-10-15T00:00:00Z",
            is_synthetic=True,
            synthetic_seed=self.seed,
            scenario_name=f"RANDOM_PROFILE_{index:03d}",
            attendance=AttendanceMetrics(
                overall_attendance_pct=overall_att,
                recent_attendance_pct=recent_att,
                consecutive_absences=consec_abs,
                lecture_attendance_pct=overall_att,
                lab_attendance_pct=overall_att,
                attendance_trend=trend,
                last_attendance_date="2026-10-13",
                source_freshness_days=int(self.rng.integers(1, 4)),
            ),
            academics=AcademicPerformanceMetrics(
                cumulative_gpa=gpa,
                current_term_average_pct=term_avg,
                assessments_completed=completed,
                assessments_due=due,
                assessments_overdue=overdue,
                failed_assessments_count=failed_count,
                recent_quiz_average_pct=term_avg,
                midterm_grade="B" if term_avg >= 70 else ("C" if term_avg >= 55 else "F"),
                academic_standing=standing,
                source_freshness_days=int(self.rng.integers(1, 4)),
            ),
            participation=LmsParticipationMetrics(
                total_platform_logins_d30=logins,
                active_learning_days_d30=active_days,
                days_since_last_lms_login=days_since_lms,
                discussion_forum_posts=int(self.rng.integers(0, 10)),
                content_resource_views=int(self.rng.integers(20, 180)),
                weekly_study_velocity_hours=study_hours,
                assignment_submission_rate_pct=round((completed / max(1, due)) * 100.0, 1),
                source_freshness_days=int(self.rng.integers(1, 4)),
            ),
            fee_status=FeeStatusMetrics(
                status=fee_status_val,
                days_past_due=days_due,
                has_financial_hold=has_hold,
                financial_aid_status=FinancialAidStatus.NONE if fee_status_val == FeePaymentStatus.PAID else FinancialAidStatus.SUBMITTED,
                bursary_eligibility_flag=bool(fee_status_val == FeePaymentStatus.OVERDUE),
                source_freshness_days=int(self.rng.integers(1, 5)),
            ),
            skills_placement=SkillsAndPlacementMetrics(
                technical_skills_score=tech_score,
                soft_skills_rating=soft_score,
                resume_reviewed=resume_rev,
                mock_interview_completed=mock_done,
                mock_interview_score=tech_score if mock_done else None,
                internship_status=InternshipStatus.APPLYING if year >= 3 else InternshipStatus.NOT_APPLIED,
                placement_readiness_tier=place_tier,
                certifications_earned=int(self.rng.integers(0, 3)),
                source_freshness_days=int(self.rng.integers(1, 6)),
            ),
            faculty_observations=faculty_notes,
            data_quality=DataQualityStatus(is_stale=False, missing_sources=[], data_completeness_pct=100.0),
        )

    def generate_batch(self, count: int = 100) -> List[StudentSuccess360Profile]:
        """
        Generate N reproducible 360-degree synthetic profiles.
        """
        profiles = []
        for i in range(1, count + 1):
            p = self.generate_random_profile(i)
            profiles.append(p)
        return profiles
