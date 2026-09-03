import type { WorkflowCanvasNode } from "../../entities/workflow";

export const findSelectedNode = (
  nodes: WorkflowCanvasNode[],
  selectedNodeId: string | null,
) => nodes.find((node) => node.id === selectedNodeId) ?? null;
