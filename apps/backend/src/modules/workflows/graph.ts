import type {
  PortValue,
  WorkflowDefinition,
  WorkflowEdge,
  WorkflowNode,
} from "@ai-image-workflow/shared-types";

export interface WorkflowGraph {
  nodesById: Map<string, WorkflowNode>;
  incomingByNodeId: Map<string, WorkflowEdge[]>;
  outgoingByNodeId: Map<string, WorkflowEdge[]>;
}

export const createWorkflowGraph = (
  workflow: WorkflowDefinition,
): WorkflowGraph => {
  const nodesById = new Map(workflow.nodes.map((node) => [node.id, node]));
  const incomingByNodeId = new Map<string, WorkflowEdge[]>();
  const outgoingByNodeId = new Map<string, WorkflowEdge[]>();

  for (const node of workflow.nodes) {
    incomingByNodeId.set(node.id, []);
    outgoingByNodeId.set(node.id, []);
  }

  for (const edge of workflow.edges) {
    incomingByNodeId.get(edge.targetNodeId)?.push(edge);
    outgoingByNodeId.get(edge.sourceNodeId)?.push(edge);
  }

  return {
    nodesById,
    incomingByNodeId,
    outgoingByNodeId,
  };
};

export const readNodeInputs = (
  nodeId: string,
  graph: WorkflowGraph,
  nodeOutputs: Record<string, Record<string, PortValue>>,
): Record<string, PortValue> => {
  const inputs: Record<string, PortValue> = {};

  for (const edge of graph.incomingByNodeId.get(nodeId) ?? []) {
    const sourceOutputs = nodeOutputs[edge.sourceNodeId];
    const value = sourceOutputs?.[edge.sourcePortId];

    if (!value) {
      throw new Error(
        `Missing output "${edge.sourcePortId}" from dependency node "${edge.sourceNodeId}".`,
      );
    }

    inputs[edge.targetPortId] = value;
  }

  return inputs;
};
