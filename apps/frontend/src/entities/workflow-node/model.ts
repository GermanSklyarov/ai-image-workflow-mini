import type {
  PortDataType,
  PortDefinition,
  WorkflowNode,
  WorkflowNodeType,
} from "@ai-image-workflow/shared-types";

export const NODE_LABEL: Record<WorkflowNodeType, string> = {
  prompt: "Prompt",
  imageInput: "Image Input",
  generateImage: "Generate Image",
  editImage: "Edit Image",
  result: "Result",
};

const inputPort = (
  nodeId: string,
  id: string,
  dataType: PortDataType,
): PortDefinition => ({
  id,
  nodeId,
  name: dataType,
  direction: "input",
  dataType,
  required: true,
});

const outputPort = (
  nodeId: string,
  id: string,
  dataType: PortDataType,
): PortDefinition => ({
  id,
  nodeId,
  name: dataType,
  direction: "output",
  dataType,
});

export const createWorkflowNode = (
  type: WorkflowNodeType,
  id: string,
  position = { x: 0, y: 0 },
): WorkflowNode => {
  switch (type) {
    case "prompt":
      return {
        id,
        type,
        name: NODE_LABEL[type],
        position,
        ports: [outputPort(id, "text", "text")],
        data: { prompt: "A premium minimal 3D product visual" },
      };
    case "imageInput":
      return {
        id,
        type,
        name: NODE_LABEL[type],
        position,
        ports: [outputPort(id, "image", "image")],
        data: { imageUrl: "https://placehold.co/512x512/png" },
      };
    case "generateImage":
      return {
        id,
        type,
        name: NODE_LABEL[type],
        position,
        ports: [inputPort(id, "prompt", "text"), outputPort(id, "image", "image")],
        data: {},
      };
    case "editImage":
      return {
        id,
        type,
        name: NODE_LABEL[type],
        position,
        ports: [
          inputPort(id, "imageInput", "image"),
          outputPort(id, "image", "image"),
        ],
        data: { instruction: "Improve lighting and composition" },
      };
    case "result":
      return {
        id,
        type,
        name: NODE_LABEL[type],
        position,
        ports: [inputPort(id, "input", "image"), outputPort(id, "value", "image")],
        data: {},
      };
  }
};
