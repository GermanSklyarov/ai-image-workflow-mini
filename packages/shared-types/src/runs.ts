import type { NodeOutputMap } from "./nodes";
import type { PortValue } from "./ports";
import type { WorkflowDefinition } from "./workflows";

export type JobStatus = "queued" | "running" | "success" | "error";
export type RunStatus = "queued" | "running" | "completed" | "failed";

export interface JobError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface WorkflowJob {
  id: string;
  runId: string;
  nodeId: string;
  status: JobStatus;
  attempts: number;
  queuedAt?: string;
  startedAt?: string;
  finishedAt?: string;
  input?: Record<string, PortValue>;
  output?: NodeOutputMap;
  error?: JobError;
}

export interface WorkflowRun {
  id: string;
  workflow: WorkflowDefinition;
  presetId?: string;
  status: RunStatus;
  jobs: WorkflowJob[];
  nodeOutputs: Record<string, NodeOutputMap>;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  error?: JobError;
}

export interface CreateRunRequest {
  workflow: WorkflowDefinition;
  presetId?: string;
}

export interface CreateRunResponse {
  runId: string;
}

export interface RetryJobRequest {
  nodeId: string;
}
