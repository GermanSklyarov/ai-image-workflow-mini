import type { PortDefinition, PortValue } from "./ports";

export type WorkflowNodeType =
  | "prompt"
  | "imageInput"
  | "generateImage"
  | "editImage"
  | "result";

export type ExecutableNodeType = "generateImage" | "editImage";
export type SourceNodeType = "prompt" | "imageInput";

export interface BaseWorkflowNode<TType extends WorkflowNodeType, TData> {
  id: string;
  type: TType;
  name: string;
  position?: {
    x: number;
    y: number;
  };
  ports: PortDefinition[];
  data: TData;
}

export interface PromptNodeData {
  prompt: string;
}

export interface ImageInputNodeData {
  imageUrl: string;
  mimeType?: string;
}

export interface GenerateImageNodeData {
  presetId?: string;
  promptOverride?: string;
}

export interface EditImageNodeData {
  presetId?: string;
  instruction?: string;
}

export interface ResultNodeData {
  label?: string;
}

export type PromptNode = BaseWorkflowNode<"prompt", PromptNodeData>;
export type ImageInputNode = BaseWorkflowNode<"imageInput", ImageInputNodeData>;
export type GenerateImageNode = BaseWorkflowNode<
  "generateImage",
  GenerateImageNodeData
>;
export type EditImageNode = BaseWorkflowNode<"editImage", EditImageNodeData>;
export type ResultNode = BaseWorkflowNode<"result", ResultNodeData>;

export type WorkflowNode =
  | PromptNode
  | ImageInputNode
  | GenerateImageNode
  | EditImageNode
  | ResultNode;

export type NodeOutputMap = Record<string, PortValue>;

export const EXECUTABLE_NODE_TYPES: readonly ExecutableNodeType[] = [
  "generateImage",
  "editImage",
];

export const SOURCE_NODE_TYPES: readonly SourceNodeType[] = [
  "prompt",
  "imageInput",
];

export const isExecutableNode = (
  node: WorkflowNode,
): node is GenerateImageNode | EditImageNode =>
  EXECUTABLE_NODE_TYPES.includes(node.type as ExecutableNodeType);

export const isSourceNode = (
  node: WorkflowNode,
): node is PromptNode | ImageInputNode =>
  SOURCE_NODE_TYPES.includes(node.type as SourceNodeType);
