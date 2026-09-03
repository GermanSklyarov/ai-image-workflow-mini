import { apiClient } from "../../shared/api/client";

export const retryWorkflowNode = (runId: string, nodeId: string) =>
  apiClient.retryNode(runId, nodeId);
