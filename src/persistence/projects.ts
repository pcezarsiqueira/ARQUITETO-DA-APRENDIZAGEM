import { diagnosisSchema } from "@/domain/diagnosis";
import { z } from "zod";
import { discoverySchema, type Project } from "@/domain/models";
const key = "arquiteto.projects.v1";
const text = z.string().max(20000);
const texts = z.array(text).max(100);
const map = z.object({
  version: z.number().int().positive(),
  currentState: text,
  desiredState: text,
  objectives: z.array(
    z.object({
      id: text,
      behavior: text,
      evidence: text,
      successCriteria: text,
    }),
  ),
  prerequisites: texts,
  barriers: texts,
  intermediateSkills: texts,
  approved: z.boolean(),
});
const strategy = z.object({
  id: text,
  name: text,
  how: text,
  rationale: text,
  risks: text,
  resources: text,
  participation: text,
  verification: text,
});
const scene = z.object({
  objective: text,
  content: text,
  instructorAction: text,
  learnerAction: text,
  visual: text,
  duration: text,
  transition: text,
  evidence: text,
});
const deliverable = z.object({
  id: text,
  format: z.enum(["lesson-plan", "storyboard"]),
  mapVersion: z.number().int().positive(),
  title: text,
  sections: z.array(z.object({ title: text, content: text })),
  scenes: z.array(scene),
});
const project: z.ZodType<Project> = z.object({
  id: text,
  title: text,
  updatedAt: z.iso.datetime(),
  discovery: discoverySchema,
  diagnosis: diagnosisSchema.optional(),
  diagnosisHistory: z.array(diagnosisSchema).max(10).optional(),
  maps: z.array(map),
  strategies: z.array(strategy),
  deliverables: z.array(deliverable),
  validation: z
    .object({
      source: z.enum(["editorial", "ai"]),
      findings: z.array(
        z.object({
          criterion: text,
          justification: text,
          recommendation: text,
        }),
      ),
    })
    .optional(),
  demonstration: z.boolean(),
});
const schema = z.object({
  version: z.literal(1),
  projects: z.array(project).max(200),
});
export function loadProjects(): Project[] {
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  return schema.parse(JSON.parse(raw)).projects;
}
export function saveProjects(projects: Project[]) {
  localStorage.setItem(
    key,
    JSON.stringify(schema.parse({ version: 1, projects })),
  );
}
