import type { ImageGenerationProvider } from "./image-generation-provider";

export class MockImageGenerationProvider implements ImageGenerationProvider {
  async generate() {
    return {
      type: "image" as const,
      url: "mock://generated-image",
      mimeType: "image/png",
    };
  }

  async edit() {
    return {
      type: "image" as const,
      url: "mock://edited-image",
      mimeType: "image/png",
    };
  }
}
