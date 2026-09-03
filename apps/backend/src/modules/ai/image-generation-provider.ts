import type { ImageValue } from "@ai-image-workflow/shared-types";

export interface GenerateImageInput {
  prompt: string;
  negativePrompt?: string;
  referenceImages?: ImageValue[];
}

export interface EditImageInput {
  image: ImageValue;
  instruction: string;
  negativePrompt?: string;
  referenceImages?: ImageValue[];
}

export interface ImageGenerationProvider {
  generateImage(input: GenerateImageInput): Promise<ImageValue>;
  editImage(input: EditImageInput): Promise<ImageValue>;
}
