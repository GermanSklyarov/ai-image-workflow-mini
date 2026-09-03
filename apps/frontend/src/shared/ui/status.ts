import type { ExecutionStatus } from "../../entities/workflow";

export const STATUS_LABEL: Record<ExecutionStatus, string> = {
  idle: "idle",
  queued: "queued",
  running: "running",
  success: "success",
  error: "error",
};
