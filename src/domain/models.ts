import type { Diagnosis } from "./diagnosis";
export type { Diagnosis } from "./diagnosis";
import { z } from "zod";
export const discoverySchema = z.object({
  subject: z.string().trim().min(1).max(160),
  teach: z.string().max(2000),
  audience: z.string().max(1000),
  priorKnowledge: z.string().max(2000),
  difficulties: z.string().max(2000),
  experiences: z.string().max(3000),
  modality: z.string().max(200),
  constraints: z.string().max(1000),
});
export type Discovery = z.infer<typeof discoverySchema>;
export type LearningObjective = {
  id: string;
  behavior: string;
  evidence: string;
  successCriteria: string;
};
export type TransformationMap = {
  version: number;
  currentState: string;
  desiredState: string;
  objectives: LearningObjective[];
  prerequisites: string[];
  barriers: string[];
  intermediateSkills: string[];
  approved: boolean;
};
export type Strategy = {
  id: string;
  name: string;
  how: string;
  rationale: string;
  risks: string;
  resources: string;
  participation: string;
  verification: string;
};
export type Scene = {
  objective: string;
  content: string;
  instructorAction: string;
  learnerAction: string;
  visual: string;
  duration: string;
  transition: string;
  evidence: string;
};
export type Deliverable = {
  id: string;
  format: "lesson-plan" | "storyboard";
  mapVersion: number;
  title: string;
  sections: { title: string; content: string }[];
  scenes: Scene[];
};
export type ValidationReport = {
  source: "editorial" | "ai";
  findings: {
    criterion: string;
    justification: string;
    recommendation: string;
  }[];
};
export type Project = {
  id: string;
  title: string;
  updatedAt: string;
  discovery: Discovery;
  diagnosis?: Diagnosis;
  diagnosisHistory?: Diagnosis[];
  maps: TransformationMap[];
  strategies: Strategy[];
  deliverables: Deliverable[];
  validation?: ValidationReport;
  demonstration: boolean;
};
export const emptyDiscovery: Discovery = {
  subject: "",
  teach: "",
  audience: "",
  priorKnowledge: "",
  difficulties: "",
  experiences: "",
  modality: "",
  constraints: "",
};
