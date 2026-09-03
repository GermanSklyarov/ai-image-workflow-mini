import type { ImageGenerationProvider } from "./image-generation-provider";

export class MockImageGenerationProvider implements ImageGenerationProvider {
  async generateImage() {
    return {
      type: "image" as const,
      url: "mock://generated-image",
      mimeType: "image/png",
    };
  }

  async editImage() {
    return {
      type: "image" as const,
      url: "mock://edited-image",
      mimeType: "image/png",
    };
  }
}
