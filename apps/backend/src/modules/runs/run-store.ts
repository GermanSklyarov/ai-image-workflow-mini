import type { WorkflowRun } from "@ai-image-workflow/shared-types";

export class RunStore {
  private readonly runs = new Map<string, WorkflowRun>();

  create(run: WorkflowRun): WorkflowRun {
    this.runs.set(run.id, run);
    return run;
  }

  get(runId: string): WorkflowRun | undefined {
    return this.runs.get(runId);
  }

  update(run: WorkflowRun): WorkflowRun {
    run.updatedAt = new Date().toISOString();
    this.runs.set(run.id, run);
    return run;
  }
}
