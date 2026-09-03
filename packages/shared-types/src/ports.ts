export type PortDataType = "text" | "image";
export type PortDirection = "input" | "output";

export interface PortDefinition {
  id: string;
  nodeId: string;
  name: string;
  direction: PortDirection;
  dataType: PortDataType;
  required?: boolean;
}

export interface TextValue {
  type: "text";
  value: string;
}

export interface ImageValue {
  type: "image";
  url: string;
  mimeType?: string;
  width?: number;
  height?: number;
}

export type PortValue = TextValue | ImageValue;

export const isCompatiblePortType = (
  source: PortDefinition,
  target: PortDefinition,
): boolean =>
  source.direction === "output" &&
  target.direction === "input" &&
  source.dataType === target.dataType;
