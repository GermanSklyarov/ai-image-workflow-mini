import type { WorkflowNode } from "./nodes";

export interface WorkflowEdge {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowValidationIssue {
  code:
    | "node_not_found"
    | "port_not_found"
    | "invalid_port_direction"
    | "incompatible_port_type"
    | "cycle_detected"
    | "missing_required_input";
  message: string;
  nodeId?: string;
  edgeId?: string;
  portId?: string;
}

export interface WorkflowValidationResult {
  valid: boolean;
  issues: WorkflowValidationIssue[];
}
