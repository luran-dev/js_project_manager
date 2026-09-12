import { describe, expect, it } from "vitest";
import { mockProjectVibeRepository } from "./repository";

describe("projectVibeRepository", () => {
  it("keeps local snapshot changes behind the repository boundary", async () => {
    const snapshot = await mockProjectVibeRepository.loadSnapshot();
    const renamed = { ...snapshot.workspaces[0]!, name: "Repository Workspace" };

    try {
      await mockProjectVibeRepository.saveSnapshot({ ...snapshot, workspaces: [renamed, ...snapshot.workspaces.slice(1)] });
      const saved = await mockProjectVibeRepository.loadSnapshot();
      const reloaded = await mockProjectVibeRepository.loadSnapshot();

      expect(saved.workspaces[0]?.name).toBe("Repository Workspace");
      expect(saved).not.toBe(reloaded);
      expect(saved.workspaces[0]).not.toBe(reloaded.workspaces[0]);
    } finally {
      await mockProjectVibeRepository.saveSnapshot(snapshot);
    }
  });
});
