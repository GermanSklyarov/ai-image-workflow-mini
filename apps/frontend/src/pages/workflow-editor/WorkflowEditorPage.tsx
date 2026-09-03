import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  ReactFlowProvider,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from "@xyflow/react";
import type {
  Preset,
  WorkflowNode,
  WorkflowNodeType,
  WorkflowRun,
} from "@ai-image-workflow/shared-types";
import {
  addWorkflowNode,
  demoWorkflowEdges,
  demoWorkflowNodes,
  serializeWorkflow,
  updateNodeConfig,
  type WorkflowCanvasEdge,
  type WorkflowCanvasNode,
} from "../../entities/workflow";
import { mergeRunIntoNodes } from "../../entities/run";
import { deleteWorkflowNode } from "../../features/delete-node";
import { findSelectedNode } from "../../features/select-node";
import { startWorkflowRun } from "../../features/run-workflow";
import { retryWorkflowNode } from "../../features/retry-node";
import { normalizePresetId } from "../../features/select-preset";
import { apiClient } from "../../shared/api/client";
import { NodePropertiesPanel } from "../../widgets/node-properties-panel";
import { RunStatusPanel } from "../../widgets/run-status-panel";
import { Toolbar } from "../../widgets/toolbar";
import { WorkflowCanvas } from "../../widgets/workflow-canvas";

export const WorkflowEditorPage = () => {
  const [nodes, setNodes] = useState<WorkflowCanvasNode[]>(() => demoWorkflowNodes());
  const [edges, setEdges] = useState<WorkflowCanvasEdge[]>(() => demoWorkflowEdges());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [presets, setPresets] = useState<Preset[]>([]);
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const latestRunId = useRef<string | null>(null);

  const selectedNode = useMemo(
    () => findSelectedNode(nodes, selectedNodeId),
    [nodes, selectedNodeId],
  );

  const serializedWorkflow = useMemo(
    () => serializeWorkflow(nodes, edges),
    [nodes, edges],
  );

  const handleRetryNode = useCallback(
    async (nodeId: string) => {
      if (!latestRunId.current) {
        return;
      }

      setApiError(null);

      try {
        const retriedRun = await retryWorkflowNode(latestRunId.current, nodeId);
        setRun(retriedRun);
        setNodes((currentNodes) =>
          mergeRunIntoNodes(currentNodes, retriedRun, handleRetryNode),
        );

        if (retriedRun.status === "running" || retriedRun.status === "queued") {
          setIsPolling(true);
        }
      } catch (error) {
        setApiError(error instanceof Error ? error.message : "Retry failed.");
      }
    },
    [],
  );

  useEffect(() => {
    apiClient
      .listPresets()
      .then(setPresets)
      .catch((error: unknown) => {
        setApiError(
          error instanceof Error ? error.message : "Unable to load presets.",
        );
      });
  }, []);

  useEffect(() => {
    if (!isPolling || !latestRunId.current) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      const runId = latestRunId.current;

      if (!runId) {
        return;
      }

      apiClient
        .getRun(runId)
        .then((nextRun) => {
          setRun(nextRun);
          setNodes((currentNodes) =>
            mergeRunIntoNodes(currentNodes, nextRun, handleRetryNode),
          );

          if (nextRun.status === "completed" || nextRun.status === "failed") {
            setIsPolling(false);
          }
        })
        .catch((error: unknown) => {
          setApiError(
            error instanceof Error ? error.message : "Unable to poll run status.",
          );
          setIsPolling(false);
        });
    }, 700);

    return () => window.clearInterval(interval);
  }, [handleRetryNode, isPolling]);

  const onNodesChange = useCallback((changes: NodeChange<WorkflowCanvasNode>[]) => {
    setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange<WorkflowCanvasEdge>[]) => {
    setEdges((currentEdges) => applyEdgeChanges(changes, currentEdges));
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((currentEdges) =>
      addEdge(
        {
          ...connection,
          id: `edge-${connection.source}-${connection.sourceHandle}-${connection.target}-${connection.targetHandle}`,
        },
        currentEdges,
      ),
    );
  }, []);

  const handleAddNode = (type: WorkflowNodeType) => {
    setNodes((currentNodes) => addWorkflowNode(currentNodes, type));
  };

  const handleDeleteSelected = () => {
    if (!selectedNodeId) {
      return;
    }

    const next = deleteWorkflowNode(nodes, edges, selectedNodeId);
    setNodes(next.nodes);
    setEdges(next.edges);
    setSelectedNodeId(null);
  };

  const handleNodeConfigChange = (
    nodeId: string,
    patch: Record<string, string>,
  ) => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (node.id !== nodeId) {
          return node;
        }

        if ("name" in patch) {
          return {
            ...node,
            data: {
              ...node.data,
              workflowNode: {
                ...node.data.workflowNode,
                name: patch.name ?? node.data.workflowNode.name,
              } as WorkflowNode,
            },
          };
        }

        return updateNodeConfig(node, patch);
      }),
    );
  };

  const handleRun = async () => {
    setApiError(null);
    setRun(null);
    setNodes((currentNodes) => mergeRunIntoNodes(currentNodes, null, handleRetryNode));

    try {
      const response = await startWorkflowRun(
        nodes,
        edges,
        normalizePresetId(selectedPresetId),
      );
      latestRunId.current = response.runId;
      setIsPolling(true);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "Unable to start run.");
    }
  };

  return (
    <ReactFlowProvider>
      <div className="editor-page">
        <Toolbar
          presets={presets}
          selectedPresetId={selectedPresetId}
          selectedNodeId={selectedNodeId}
          canRun={nodes.length > 0}
          isPolling={isPolling}
          onAddNode={handleAddNode}
          onDeleteSelected={handleDeleteSelected}
          onRun={handleRun}
          onPresetChange={setSelectedPresetId}
        />

        <main className="editor-shell">
          <section className="canvas-shell">
            <WorkflowCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onSelectNode={setSelectedNodeId}
              onConnectionError={setApiError}
            />
          </section>

          <section className="side-panel">
            <NodePropertiesPanel
              node={selectedNode}
              onChange={handleNodeConfigChange}
            />
            <RunStatusPanel run={run} error={apiError} />
            <aside className="panel">
              <h2>Serialized</h2>
              <pre>{JSON.stringify(serializedWorkflow, null, 2)}</pre>
            </aside>
          </section>
        </main>
      </div>
    </ReactFlowProvider>
  );
};
