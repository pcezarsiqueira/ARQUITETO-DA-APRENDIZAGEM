import { test } from "node:test";
import assert from "node:assert/strict";
import { createProject, duplicateProject } from "../src/domain/projects";
import { emptyDiscovery } from "../src/domain/models";
import { exampleProject } from "../src/domain/example";
import { isOutdated } from "../src/deliverables/versions";
test("requires a real subject but accepts incomplete discovery", () => {
  assert.throws(() => createProject(emptyDiscovery, "1", "now"));
  const p = createProject(
    { ...emptyDiscovery, subject: "  Feedback  " },
    "1",
    "now",
  );
  assert.equal(p.title, "Feedback");
  assert.deepEqual(p.maps, []);
});
test("duplicates without sharing mutable pedagogical data", () => {
  const p = duplicateProject(exampleProject, "new", "now");
  p.maps[0].currentState = "changed";
  assert.notEqual(exampleProject.maps[0].currentState, "changed");
  assert.equal(p.id, "new");
  assert.equal(p.deliverables[0].mapVersion, p.maps[0].version);
});
test("materials retain map provenance and become stale on a new version", () => {
  const d = exampleProject.deliverables[0];
  assert.equal(isOutdated(d, 1), false);
  assert.equal(isOutdated(d, 2), true);
  assert.equal(d.mapVersion, 1);
});
