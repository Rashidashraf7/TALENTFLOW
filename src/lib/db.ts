import Dexie, { Table } from 'dexie';

export interface Job {
  id: string;
  title: string;
  slug: string;
  status: 'active' | 'archived';
  tags: string[];
  order: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  jobId: string;
  stage: 'applied' | 'screen' | 'tech' | 'offer' | 'hired' | 'rejected';
  appliedAt: Date;
  updatedAt: Date;
  notes?: string;
  resume?: string;
}

export interface TimelineEvent {
  id: string;
  candidateId: string;
  type: 'stage_change' | 'note' | 'assessment';
  from?: string;
  to?: string;
  note?: string;
  createdAt: Date;
  createdBy: string;
}

export interface Assessment {
  id: string;
  jobId: string;
  title: string;
  description?: string;
  sections: AssessmentSection[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AssessmentSection {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
}

export interface Question {
  id: string;
  type: 'single-choice' | 'multi-choice' | 'short-text' | 'long-text' | 'numeric' | 'file';
  question: string;
  required: boolean;
  options?: string[];
  numericRange?: { min: number; max: number };
  maxLength?: number;
  conditionalOn?: { questionId: string; value: string };
}

export interface AssessmentResponse {
  id: string;
  assessmentId: string;
  candidateId: string;
  responses: { [questionId: string]: any };
  submittedAt: Date;
}

export class TalentFlowDB extends Dexie {
  jobs!: Table<Job>;
  candidates!: Table<Candidate>;
  timeline!: Table<TimelineEvent>;
  assessments!: Table<Assessment>;
  responses!: Table<AssessmentResponse>;

  constructor() {
    super('TalentFlowDB');
    this.version(1).stores({
      jobs: 'id, status, order, slug',
      candidates: 'id, jobId, stage, email, name',
      timeline: 'id, candidateId, createdAt',
      assessments: 'id, jobId',
      responses: 'id, assessmentId, candidateId',
    });
  }
}

export const db = new TalentFlowDB();
