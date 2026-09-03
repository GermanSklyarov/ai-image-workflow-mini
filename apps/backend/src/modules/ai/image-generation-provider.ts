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
  generate(input: GenerateImageInput): Promise<ImageValue>;
  edit(input: EditImageInput): Promise<ImageValue>;
}
