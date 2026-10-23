import type {
  Diagnosis,
  Discovery,
  TransformationMap,
  Strategy,
  Deliverable,
  ValidationReport,
} from "@/domain/models";
// Propostas são retornadas para revisão: nunca gravadas automaticamente sobre autoria humana.
export interface PedagogicalEngine {
  diagnose(input: Discovery): Promise<Diagnosis>;
  map(input: {
    discovery: Discovery;
    diagnosis: Diagnosis;
  }): Promise<TransformationMap>;
  suggestStrategies(map: TransformationMap): Promise<Strategy[]>;
  generate(input: {
    map: TransformationMap;
    strategy: Strategy;
    format: Deliverable["format"];
  }): Promise<Deliverable>;
  validate(input: {
    map: TransformationMap;
    deliverables: Deliverable[];
  }): Promise<ValidationReport>;
  proposeRevisions(input: {
    map: TransformationMap;
    report: ValidationReport;
  }): Promise<{ field: string; proposal: string; rationale: string }[]>;
}
