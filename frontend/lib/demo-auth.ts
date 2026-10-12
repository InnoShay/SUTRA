/**
 * SUTRA Demo Authenticated Personas & Tokens.
 * Provides cryptographically valid JWT tokens signed with development secret
 * matching app/core/config.py SUPABASE_JWT_SECRET for zero-friction local testing.
 */

import { UserRole } from './types';

export const DEMO_CAMPUS_ID = '00000000-0000-0000-0000-000000000001';

export interface DemoPersona {
  role: UserRole;
  name: string;
  title: string;
  email: string;
  userId: string;
  avatar: string;
  badge: string;
  token: string;
  canViewIndividualStudents: boolean;
  canReassignCases: boolean;
  canViewCounselling: boolean;
  canViewFinance: boolean;
}

export const DEMO_PERSONAS: Record<UserRole, DemoPersona> = {
  faculty: {
    role: 'faculty',
    name: 'Prof. Ananya Sharma',
    title: 'Course Instructor & Faculty Mentor',
    email: 'faculty@sutra.edu',
    userId: '11111111-1111-1111-1111-111111111111',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    badge: 'Faculty Mentor',
    token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMTExMTExMS0xMTExLTExMTEtMTExMS0xMTExMTExMTExMTEiLCJlbWFpbCI6ImZhY3VsdHlAc3V0cmEuZWR1IiwiYXVkIjoiYXV0aGVudGljYXRlZCIsInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoyNTAwMDAwMDAwfQ.n7_Jagq2dPYBazGOsiqx--BNCD5II-iFh269Wnt66qc',
    canViewIndividualStudents: true,
    canReassignCases: false,
    canViewCounselling: false,
    canViewFinance: false,
  },
  counselor: {
    role: 'counselor',
    name: 'Dr. Meera Nambiar',
    title: 'Senior Student Counselor & Wellbeing Specialist',
    email: 'counselor@sutra.edu',
    userId: '22222222-2222-2222-2222-222222222222',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    badge: 'Student Counselor',
    token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMjIyMjIyMi0yMjIyLTIyMjItMjIyMi0yMjIyMjIyMjIyMjIiLCJlbWFpbCI6ImNvdW5zZWxvckBzdXRyYS5lZHUiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJleHAiOjI1MDAwMDAwMDB9.ZkJQyMTibGkpqHRYDyzK5UY4aDDgZR-yVK6UMeXSa8g',
    canViewIndividualStudents: true,
    canReassignCases: false,
    canViewCounselling: true,
    canViewFinance: false,
  },
  dean: {
    role: 'dean',
    name: 'Dr. Rajeshwar Rao',
    title: 'Dean of Academic Affairs & HOD',
    email: 'dean@sutra.edu',
    userId: '33333333-3333-3333-3333-333333333333',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    badge: 'Dean / HOD',
    token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzMzMzMzMzMy0zMzMzLTMzMzMtMzMzMy0zMzMzMzMzMzMzMzMiLCJlbWFpbCI6ImRlYW5Ac3V0cmEuZWR1IiwiYXVkIjoiYXV0aGVudGljYXRlZCIsInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoyNTAwMDAwMDAwfQ.n08SfgMazffssQPU9K8wop-1WkN7oU_-dr_a0QMfQm0',
    canViewIndividualStudents: true,
    canReassignCases: true,
    canViewCounselling: false,
    canViewFinance: false,
  },
  leadership: {
    role: 'leadership',
    name: 'Prof. S. K. Kulkarni',
    title: 'Institutional Leadership & Vice Chancellor',
    email: 'leadership@sutra.edu',
    userId: '44444444-4444-4444-4444-444444444444',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    badge: 'Leadership',
    token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0NDQ0NDQ0NC00NDQ0LTQ0NDQtNDQ0NC00NDQ0NDQ0NDQ0NDQiLCJlbWFpbCI6ImxlYWRlcnNoaXBAc3V0cmEuZWR1IiwiYXVkIjoiYXV0aGVudGljYXRlZCIsInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoyNTAwMDAwMDAwfQ.enrK7nmMvr_srv74Ud6TLYCnluJcGge06ig3D4JcFjk',
    canViewIndividualStudents: false, // Privacy restriction strictly enforced in Phase 4
    canReassignCases: true,
    canViewCounselling: false,
    canViewFinance: false,
  },
  superadmin: {
    role: 'superadmin',
    name: 'SUTRA Admin',
    title: 'System Administrator & Governance Lead',
    email: 'admin@sutra.edu',
    userId: '55555555-5555-5555-5555-555555555555',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    badge: 'System Admin',
    token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTU1NTU1NS01NTU1LTU1NTUtNTU1NS01NTU1NTU1NTU1NTUiLCJlbWFpbCI6ImFkbWluQHN1dHJhLmVkdSIsImF1ZCI6ImF1dGhlbnRpY2F0ZWQiLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImV4cCI6MjUwMDAwMDAwMH0.eu7sZxNGNxXR0P5Vbu00tJyWPgLU9aLcMh3VHxe_Uo4',
    canViewIndividualStudents: true,
    canReassignCases: true,
    canViewCounselling: true,
    canViewFinance: true,
  },
  student: {
    role: 'student',
    name: 'Asha (synthetic)',
    title: 'Enrolled Student • CS-Y2',
    email: 'syn-1007@sutra.edu',
    userId: '66666666-6666-6666-6666-666666666666',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    badge: 'Student',
    token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NjY2NjY2Ni02NjY2LTY2NjYtNjY2Ni02NjY2NjY2NjY2NjYiLCJlbWFpbCI6InN5bi0xMDA3QHN1dHJhLmVkdSIsImF1ZCI6ImF1dGhlbnRpY2F0ZWQiLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImV4cCI6MjUwMDAwMDAwMH0.uJD7UEXtAtglOlqPg8V5PJqpcFnCn00CjEsxlz5Z2Sc',
    canViewIndividualStudents: false, // strictly restricted to own record
    canReassignCases: false,
    canViewCounselling: false,
    canViewFinance: false,
  },
  staff: {
    role: 'staff',
    name: 'Prof. Ananya Sharma',
    title: 'Course Instructor & Faculty Mentor',
    email: 'faculty@sutra.edu',
    userId: '11111111-1111-1111-1111-111111111111',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    badge: 'Staff Mentor',
    token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMTExMTExMS0xMTExLTExMTEtMTExMS0xMTExMTExMTExMTEiLCJlbWFpbCI6ImZhY3VsdHlAc3V0cmEuZWR1IiwiYXVkIjoiYXV0aGVudGljYXRlZCIsInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoyNTAwMDAwMDAwfQ.n7_Jagq2dPYBazGOsiqx--BNCD5II-iFh269Wnt66qc',
    canViewIndividualStudents: true,
    canReassignCases: false,
    canViewCounselling: false,
    canViewFinance: false,
  },
  admin: {
    role: 'admin',
    name: 'SUTRA Admin',
    title: 'System Administrator & Governance Lead',
    email: 'admin@sutra.edu',
    userId: '55555555-5555-5555-5555-555555555555',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    badge: 'System Admin',
    token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTU1NTU1NS01NTU1LTU1NTUtNTU1NS01NTU1NTU1NTU1NTUiLCJlbWFpbCI6ImFkbWluQHN1dHJhLmVkdSIsImF1ZCI6ImF1dGhlbnRpY2F0ZWQiLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImV4cCI6MjUwMDAwMDAwMH0.eu7sZxNGNxXR0P5Vbu00tJyWPgLU9aLcMh3VHxe_Uo4',
    canViewIndividualStudents: true,
    canReassignCases: true,
    canViewCounselling: true,
    canViewFinance: true,
  },
};
