import type { Preset, WorkflowNodeType } from "@ai-image-workflow/shared-types";
import { NODE_LABEL } from "../../entities/workflow-node";

const ADDABLE_NODE_TYPES: WorkflowNodeType[] = [
  "prompt",
  "imageInput",
  "generateImage",
  "editImage",
  "result",
];

interface ToolbarProps {
  presets: Preset[];
  selectedPresetId: string;
  selectedNodeId: string | null;
  canRun: boolean;
  isPolling: boolean;
  onAddNode: (type: WorkflowNodeType) => void;
  onDeleteSelected: () => void;
  onRun: () => void;
  onPresetChange: (presetId: string) => void;
}

export const Toolbar = ({
  presets,
  selectedPresetId,
  selectedNodeId,
  canRun,
  isPolling,
  onAddNode,
  onDeleteSelected,
  onRun,
  onPresetChange,
}: ToolbarProps) => (
  <header className="toolbar">
    <div className="toolbar__group">
      {ADDABLE_NODE_TYPES.map((type) => (
        <button key={type} type="button" onClick={() => onAddNode(type)}>
          + {NODE_LABEL[type]}
        </button>
      ))}
    </div>

    <div className="toolbar__group">
      <select
        aria-label="Preset"
        value={selectedPresetId}
        onChange={(event) => onPresetChange(event.target.value)}
      >
        <option value="">No preset</option>
        {presets.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.name}
          </option>
        ))}
      </select>
      <button type="button" disabled={!selectedNodeId} onClick={onDeleteSelected}>
        Delete
      </button>
      <button type="button" disabled={!canRun || isPolling} onClick={onRun}>
        {isPolling ? "Running..." : "Run"}
      </button>
    </div>
  </header>
);
