import type {
  PortDefinition,
  WorkflowDefinition,
  WorkflowEdge,
  WorkflowNode,
  WorkflowValidationIssue,
  WorkflowValidationResult,
} from "@ai-image-workflow/shared-types";
import { isCompatiblePortType } from "@ai-image-workflow/shared-types";

const findPort = (
  node: WorkflowNode | undefined,
  portId: string,
): PortDefinition | undefined => node?.ports.find((port) => port.id === portId);

const addIssue = (
  issues: WorkflowValidationIssue[],
  issue: WorkflowValidationIssue,
) => {
  issues.push(issue);
};

const validateEdge = (
  edge: WorkflowEdge,
  nodesById: Map<string, WorkflowNode>,
  issues: WorkflowValidationIssue[],
) => {
  const sourceNode = nodesById.get(edge.sourceNodeId);
  const targetNode = nodesById.get(edge.targetNodeId);

  if (!sourceNode) {
    addIssue(issues, {
      code: "node_not_found",
      message: `Source node "${edge.sourceNodeId}" does not exist.`,
      edgeId: edge.id,
      nodeId: edge.sourceNodeId,
    });
  }

  if (!targetNode) {
    addIssue(issues, {
      code: "node_not_found",
      message: `Target node "${edge.targetNodeId}" does not exist.`,
      edgeId: edge.id,
      nodeId: edge.targetNodeId,
    });
  }

  const sourcePort = findPort(sourceNode, edge.sourcePortId);
  const targetPort = findPort(targetNode, edge.targetPortId);

  if (sourceNode && !sourcePort) {
    addIssue(issues, {
      code: "port_not_found",
      message: `Source port "${edge.sourcePortId}" does not exist on node "${sourceNode.id}".`,
      edgeId: edge.id,
      nodeId: sourceNode.id,
      portId: edge.sourcePortId,
    });
  }

  if (targetNode && !targetPort) {
    addIssue(issues, {
      code: "port_not_found",
      message: `Target port "${edge.targetPortId}" does not exist on node "${targetNode.id}".`,
      edgeId: edge.id,
      nodeId: targetNode.id,
      portId: edge.targetPortId,
    });
  }

  if (!sourcePort || !targetPort) {
    return;
  }

  if (sourcePort.direction !== "output" || targetPort.direction !== "input") {
    addIssue(issues, {
      code: "invalid_port_direction",
      message: `Edge "${edge.id}" must connect output port to input port.`,
      edgeId: edge.id,
    });
    return;
  }

  if (!isCompatiblePortType(sourcePort, targetPort)) {
    addIssue(issues, {
      code: "incompatible_port_type",
      message: `Edge "${edge.id}" connects ${sourcePort.dataType} to ${targetPort.dataType}.`,
      edgeId: edge.id,
    });
  }
};

const detectCycle = (
  workflow: WorkflowDefinition,
  nodesById: Map<string, WorkflowNode>,
): string | undefined => {
  const outgoing = new Map<string, string[]>();

  for (const node of workflow.nodes) {
    outgoing.set(node.id, []);
  }

  for (const edge of workflow.edges) {
    if (nodesById.has(edge.sourceNodeId) && nodesById.has(edge.targetNodeId)) {
      outgoing.get(edge.sourceNodeId)?.push(edge.targetNodeId);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (nodeId: string): string | undefined => {
    if (visiting.has(nodeId)) {
      return nodeId;
    }

    if (visited.has(nodeId)) {
      return undefined;
    }

    visiting.add(nodeId);

    for (const targetNodeId of outgoing.get(nodeId) ?? []) {
      const cyclicNodeId = visit(targetNodeId);

      if (cyclicNodeId) {
        return cyclicNodeId;
      }
    }

    visiting.delete(nodeId);
    visited.add(nodeId);

    return undefined;
  };

  for (const node of workflow.nodes) {
    const cyclicNodeId = visit(node.id);

    if (cyclicNodeId) {
      return cyclicNodeId;
    }
  }

  return undefined;
};

export const validateWorkflow = (
  workflow: WorkflowDefinition,
): WorkflowValidationResult => {
  const issues: WorkflowValidationIssue[] = [];
  const nodesById = new Map(workflow.nodes.map((node) => [node.id, node]));
  const incomingByTargetPort = new Set(
    workflow.edges.map((edge) => `${edge.targetNodeId}:${edge.targetPortId}`),
  );

  for (const edge of workflow.edges) {
    validateEdge(edge, nodesById, issues);
  }

  for (const node of workflow.nodes) {
    for (const port of node.ports) {
      if (
        port.direction === "input" &&
        port.required &&
        !incomingByTargetPort.has(`${node.id}:${port.id}`)
      ) {
        addIssue(issues, {
          code: "missing_required_input",
          message: `Required input port "${port.id}" on node "${node.id}" has no dependency.`,
          nodeId: node.id,
          portId: port.id,
        });
      }
    }
  }

  const cyclicNodeId = detectCycle(workflow, nodesById);

  if (cyclicNodeId) {
    addIssue(issues, {
      code: "cycle_detected",
      message: `Workflow contains a cycle around node "${cyclicNodeId}".`,
      nodeId: cyclicNodeId,
    });
  }

  return {
    valid: issues.length === 0,
    issues,
  };
};
