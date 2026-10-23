import { discoveryChanged } from "./diagnosis";
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

export function updateProjectDiscovery(
  project: Project,
  input: Discovery,
  now: string,
): Project {
  const discovery = discoverySchema.parse(input);
  const changed = discoveryChanged(project.discovery, discovery);
  const previous = project.diagnosis;
  if (!changed || !previous?.review)
    return { ...project, discovery, title: discovery.subject, updatedAt: now };
  return {
    ...project,
    discovery,
    title: discovery.subject,
    updatedAt: now,
    diagnosis: {
      ...previous,
      review: {
        ...previous.review,
        status: "draft",
        approvedAt: undefined,
        pedagogicalReview: undefined,
        version: previous.review.version + 1,
      },
    },
    diagnosisHistory: [...(project.diagnosisHistory ?? []), previous].slice(
      -10,
    ),
  };
}
