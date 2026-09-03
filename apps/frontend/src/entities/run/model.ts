import type { WorkflowRun } from "@ai-image-workflow/shared-types";
import type { WorkflowCanvasNode, WorkflowCanvasNodeData } from "../workflow";

export const mergeRunIntoNodes = (
  nodes: WorkflowCanvasNode[],
  run: WorkflowRun | null,
  onRetry?: (nodeId: string) => void,
): WorkflowCanvasNode[] =>
  nodes.map((node) => {
    const job = run?.jobs.find((item) => item.nodeId === node.id);
    const output = run?.nodeOutputs[node.id];
    const data: WorkflowCanvasNodeData = {
      ...node.data,
      status: job?.status ?? "idle",
    };

    if (output) {
      data.output = output;
    } else {
      delete data.output;
    }

    if (job?.error?.message) {
      data.error = job.error.message;
    } else {
      delete data.error;
    }

    if (onRetry) {
      data.onRetry = onRetry;
    } else {
      delete data.onRetry;
    }

    return {
      ...node,
      data,
    };
  });
