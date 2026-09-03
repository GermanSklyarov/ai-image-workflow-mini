import type { WorkflowCanvasEdge, WorkflowCanvasNode } from "../../entities/workflow";
import { serializeWorkflow } from "../../entities/workflow";
import { apiClient } from "../../shared/api/client";

export const startWorkflowRun = async (
  nodes: WorkflowCanvasNode[],
  edges: WorkflowCanvasEdge[],
  presetId?: string,
) =>
  apiClient.createRun({
    workflow: serializeWorkflow(nodes, edges),
    ...(presetId ? { presetId } : {}),
  });
