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
    avatar: '',
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
    avatar: '',
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
    avatar: '',
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
    avatar: '',
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
    avatar: '',
    badge: 'System Admin',
    token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTU1NTU1NS01NTU1LTU1NTUtNTU1NS01NTU1NTU1NTU1NTUiLCJlbWFpbCI6ImFkbWluQHN1dHJhLmVkdSIsImF1ZCI6ImF1dGhlbnRpY2F0ZWQiLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImV4cCI6MjUwMDAwMDAwMH0.eu7sZxNGNxXR0P5Vbu00tJyWPgLU9aLcMh3VHxe_Uo4',
    canViewIndividualStudents: true,
    canReassignCases: true,
    canViewCounselling: true,
    canViewFinance: true,
  },
};
