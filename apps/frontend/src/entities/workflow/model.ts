import type { Edge, Node } from "@xyflow/react";
import type {
  PortDefinition,
  PortValue,
  WorkflowDefinition,
  WorkflowEdge,
  WorkflowNode,
  WorkflowNodeType,
} from "@ai-image-workflow/shared-types";
import { isCompatiblePortType } from "@ai-image-workflow/shared-types";
import { createWorkflowNode } from "../workflow-node";

export type ExecutionStatus = "idle" | "queued" | "running" | "success" | "error";

export interface WorkflowCanvasNodeData extends Record<string, unknown> {
  workflowNode: WorkflowNode;
  status: ExecutionStatus;
  output?: Record<string, PortValue>;
  error?: string;
  onRetry?: (nodeId: string) => void;
}

export type WorkflowCanvasNode = Node<WorkflowCanvasNodeData, "workflowNode">;
export type WorkflowCanvasEdge = Edge;

const nowIso = () => new Date().toISOString();

export const demoWorkflowNodes = (): WorkflowCanvasNode[] => {
  const prompt = createWorkflowNode("prompt", "prompt-1", { x: 80, y: 180 });
  const generateA = createWorkflowNode("generateImage", "generate-a", {
    x: 380,
    y: 90,
  });
  const generateB = createWorkflowNode("generateImage", "generate-b", {
    x: 380,
    y: 280,
  });
  const resultA = createWorkflowNode("result", "result-a", { x: 710, y: 90 });
  const resultB = createWorkflowNode("result", "result-b", { x: 710, y: 280 });

  return [prompt, generateA, generateB, resultA, resultB].map(toCanvasNode);
};

export const demoWorkflowEdges = (): WorkflowCanvasEdge[] => [
  toCanvasEdge("edge-prompt-a", "prompt-1", "text", "generate-a", "prompt"),
  toCanvasEdge("edge-prompt-b", "prompt-1", "text", "generate-b", "prompt"),
  toCanvasEdge("edge-a-result", "generate-a", "image", "result-a", "input"),
  toCanvasEdge("edge-b-result", "generate-b", "image", "result-b", "input"),
];

export const toCanvasNode = (workflowNode: WorkflowNode): WorkflowCanvasNode => ({
  id: workflowNode.id,
  type: "workflowNode",
  position: workflowNode.position ?? { x: 0, y: 0 },
  data: {
    workflowNode,
    status: "idle",
  },
});

export const toCanvasEdge = (
  id: string,
  sourceNodeId: string,
  sourcePortId: string,
  targetNodeId: string,
  targetPortId: string,
): WorkflowCanvasEdge => ({
  id,
  source: sourceNodeId,
  sourceHandle: sourcePortId,
  target: targetNodeId,
  targetHandle: targetPortId,
});

export const serializeWorkflow = (
  nodes: WorkflowCanvasNode[],
  edges: WorkflowCanvasEdge[],
): WorkflowDefinition => ({
  id: "workflow-demo",
  name: "Demo workflow",
  nodes: nodes.map((node) => ({
    ...node.data.workflowNode,
    position: node.position,
  })),
  edges: edges.map(toWorkflowEdge),
  createdAt: nowIso(),
  updatedAt: nowIso(),
});

export const toWorkflowEdge = (edge: WorkflowCanvasEdge): WorkflowEdge => ({
  id: edge.id,
  sourceNodeId: edge.source,
  sourcePortId: edge.sourceHandle ?? "",
  targetNodeId: edge.target,
  targetPortId: edge.targetHandle ?? "",
});

export const findPort = (
  nodes: WorkflowCanvasNode[],
  nodeId: string | null | undefined,
  portId: string | null | undefined,
): PortDefinition | undefined =>
  nodes
    .find((node) => node.id === nodeId)
    ?.data.workflowNode.ports.find((port) => port.id === portId);

export const canConnectPorts = (
  nodes: WorkflowCanvasNode[],
  sourceNodeId: string | null | undefined,
  sourcePortId: string | null | undefined,
  targetNodeId: string | null | undefined,
  targetPortId: string | null | undefined,
): boolean => {
  if (!sourceNodeId || !sourcePortId || !targetNodeId || !targetPortId) {
    return false;
  }

  const source = findPort(nodes, sourceNodeId, sourcePortId);
  const target = findPort(nodes, targetNodeId, targetPortId);

  return Boolean(source && target && isCompatiblePortType(source, target));
};

export const updateNodeConfig = (
  node: WorkflowCanvasNode,
  patch: Partial<WorkflowNode["data"]>,
): WorkflowCanvasNode => ({
  ...node,
  data: {
    ...node.data,
    workflowNode: {
      ...node.data.workflowNode,
      data: {
        ...node.data.workflowNode.data,
        ...patch,
      },
    } as WorkflowNode,
  },
});

export const addWorkflowNode = (
  nodes: WorkflowCanvasNode[],
  type: WorkflowNodeType,
): WorkflowCanvasNode[] => {
  const id = `${type}-${crypto.randomUUID().slice(0, 8)}`;
  const x = 120 + (nodes.length % 4) * 180;
  const y = 120 + Math.floor(nodes.length / 4) * 140;

  return [...nodes, toCanvasNode(createWorkflowNode(type, id, { x, y }))];
};
