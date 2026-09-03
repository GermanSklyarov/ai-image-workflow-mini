import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type {
  WorkflowCanvasEdge,
  WorkflowCanvasNode,
} from "../../entities/workflow";
import { isValidWorkflowConnection } from "../../features/connect-nodes";
import { WorkflowNodeCard } from "./WorkflowNodeCard";

const nodeTypes = {
  workflowNode: WorkflowNodeCard,
} satisfies NodeTypes;

interface WorkflowCanvasProps {
  nodes: WorkflowCanvasNode[];
  edges: WorkflowCanvasEdge[];
  onNodesChange: (changes: NodeChange<WorkflowCanvasNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<WorkflowCanvasEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  onSelectNode: (nodeId: string | null) => void;
  onConnectionError: (message: string) => void;
}

export const WorkflowCanvas = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onSelectNode,
  onConnectionError,
}: WorkflowCanvasProps) => {
  const handleConnect = (connection: Connection) => {
    if (!isValidWorkflowConnection(nodes, connection)) {
      onConnectionError("Ports are incompatible. Connect text to text or image to image.");
      return;
    }

    onConnect(connection);
  };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={handleConnect}
      isValidConnection={(connection) =>
        isValidWorkflowConnection(nodes, {
          source: connection.source,
          sourceHandle: connection.sourceHandle ?? null,
          target: connection.target,
          targetHandle: connection.targetHandle ?? null,
        })
      }
      onNodeClick={(_, node) => onSelectNode(node.id)}
      onPaneClick={() => onSelectNode(null)}
      fitView
    >
      <Background />
      <Controls />
      <MiniMap pannable zoomable />
    </ReactFlow>
  );
};

export { addEdge };
