import type { ImageValue, Preset } from "@ai-image-workflow/shared-types";
import type { GenerateImageInput } from "./image-generation-provider";

export const buildGenerationRequest = (
  userPrompt: string,
  preset?: Preset,
): GenerateImageInput => {
  const promptParts = [preset?.mainPrompt, userPrompt].filter(Boolean);
  const request: GenerateImageInput = {
    prompt: promptParts.join("\n\n"),
  };

  if (preset?.negativePrompt) {
    request.negativePrompt = preset.negativePrompt;
  }

  if (preset?.references.length) {
    request.referenceImages = preset.references.map(
      (url): ImageValue => ({
        type: "image",
        url,
      }),
    );
  }

  return request;
};
