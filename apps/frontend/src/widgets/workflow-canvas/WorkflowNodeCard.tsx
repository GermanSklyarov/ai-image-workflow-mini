import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { PortDefinition } from "@ai-image-workflow/shared-types";
import { NODE_LABEL } from "../../entities/workflow-node";
import type { WorkflowCanvasNode } from "../../entities/workflow";

const handleClassName = (port: PortDefinition) =>
  `workflow-handle workflow-handle--${port.dataType}`;

export const WorkflowNodeCard = ({
  data,
  selected,
}: NodeProps<WorkflowCanvasNode>) => {
  const node = data.workflowNode;
  const imageOutput = Object.values(data.output ?? {}).find(
    (value) => value.type === "image",
  );
  const canRetry =
    data.status === "error" &&
    (node.type === "generateImage" || node.type === "editImage");

  return (
    <div className={`workflow-node workflow-node--${data.status}`} data-selected={selected}>
      <div className="workflow-node__header">
        <strong>{node.name || NODE_LABEL[node.type]}</strong>
        <span>{data.status}</span>
      </div>

      <div className="workflow-node__body">
        {node.type === "prompt" && <p>{node.data.prompt || "No prompt"}</p>}
        {node.type === "imageInput" && <p>{node.data.imageUrl || "No image URL"}</p>}
        {node.type === "generateImage" && (
          <p>{node.data.promptOverride || "Text to image"}</p>
        )}
        {node.type === "editImage" && <p>{node.data.instruction || "Image edit"}</p>}
        {node.type === "result" && imageOutput?.type === "image" && (
          <img src={imageOutput.url} alt={node.name} />
        )}
        {data.error && <p className="workflow-node__error">{data.error}</p>}
        {canRetry && (
          <button type="button" onClick={() => data.onRetry?.(node.id)}>
            Retry
          </button>
        )}
      </div>

      {node.ports.map((port) => (
        <Handle
          key={port.id}
          id={port.id}
          type={port.direction === "input" ? "target" : "source"}
          position={port.direction === "input" ? Position.Left : Position.Right}
          className={handleClassName(port)}
        />
      ))}
    </div>
  );
};
