import type { Connection } from "@xyflow/react";
import { canConnectPorts, type WorkflowCanvasNode } from "../../entities/workflow";

export const isValidWorkflowConnection = (
  nodes: WorkflowCanvasNode[],
  connection: Connection,
): boolean =>
  canConnectPorts(
    nodes,
    connection.source,
    connection.sourceHandle,
    connection.target,
    connection.targetHandle,
  );
