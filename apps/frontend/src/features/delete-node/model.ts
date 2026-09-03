import type { WorkflowCanvasEdge, WorkflowCanvasNode } from "../../entities/workflow";

export const deleteWorkflowNode = (
  nodes: WorkflowCanvasNode[],
  edges: WorkflowCanvasEdge[],
  nodeId: string,
) => ({
  nodes: nodes.filter((node) => node.id !== nodeId),
  edges: edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
});
