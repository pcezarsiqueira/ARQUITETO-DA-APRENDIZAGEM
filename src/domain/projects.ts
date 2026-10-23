import { discoverySchema, type Discovery, type Project } from "./models";
export function createProject(
  discovery: Discovery,
  id: string,
  now: string,
): Project {
  const valid = discoverySchema.parse(discovery);
  return {
    id,
    title: valid.subject,
    updatedAt: now,
    discovery: valid,
    maps: [],
    strategies: [],
    deliverables: [],
    demonstration: false,
  };
}
export function duplicateProject(
  project: Project,
  id: string,
  now: string,
): Project {
  return {
    ...structuredClone(project),
    id,
    title: `${project.title} (cópia)`,
    updatedAt: now,
  };
}
