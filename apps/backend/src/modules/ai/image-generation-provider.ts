import type { ImageValue } from "@ai-image-workflow/shared-types";

export interface GenerateImageInput {
  prompt: string;
  negativePrompt?: string;
  references?: string[];
}

export interface EditImageInput {
  image: ImageValue;
  instruction: string;
  negativePrompt?: string;
  references?: string[];
}

export interface ImageGenerationProvider {
  generate(input: GenerateImageInput): Promise<ImageValue>;
  edit(input: EditImageInput): Promise<ImageValue>;
}
