import type { ChangeEvent } from "react";
import type { WorkflowCanvasNode } from "../../entities/workflow";
import { NODE_LABEL } from "../../entities/workflow-node";

interface NodePropertiesPanelProps {
  node: WorkflowCanvasNode | null;
  onChange: (nodeId: string, patch: Record<string, string>) => void;
}

export const NodePropertiesPanel = ({
  node,
  onChange,
}: NodePropertiesPanelProps) => {
  if (!node) {
    return (
      <aside className="panel">
        <h2>Node</h2>
        <p className="muted">Select a node to edit its configuration.</p>
      </aside>
    );
  }

  const workflowNode = node.data.workflowNode;
  const update = (patch: Record<string, string>) => onChange(workflowNode.id, patch);
  const updateName = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(workflowNode.id, { name: event.target.value });
  };

  return (
    <aside className="panel">
      <h2>{NODE_LABEL[workflowNode.type]}</h2>
      <label>
        Name
        <input value={workflowNode.name} onChange={updateName} />
      </label>

      {workflowNode.type === "prompt" && (
        <label>
          Prompt
          <textarea
            value={workflowNode.data.prompt}
            onChange={(event) => update({ prompt: event.target.value })}
          />
        </label>
      )}

      {workflowNode.type === "imageInput" && (
        <label>
          Image URL
          <input
            value={workflowNode.data.imageUrl}
            onChange={(event) => update({ imageUrl: event.target.value })}
          />
        </label>
      )}

      {workflowNode.type === "generateImage" && (
        <label>
          Prompt override
          <textarea
            value={workflowNode.data.promptOverride ?? ""}
            onChange={(event) => update({ promptOverride: event.target.value })}
          />
        </label>
      )}

      {workflowNode.type === "editImage" && (
        <label>
          Instruction
          <textarea
            value={workflowNode.data.instruction ?? ""}
            onChange={(event) => update({ instruction: event.target.value })}
          />
        </label>
      )}

      {workflowNode.type === "result" && (
        <label>
          Label
          <input
            value={workflowNode.data.label ?? ""}
            onChange={(event) => update({ label: event.target.value })}
          />
        </label>
      )}
    </aside>
  );
};
