import type { ImageValue } from "@ai-image-workflow/shared-types";
import type {
  EditImageInput,
  GenerateImageInput,
  ImageGenerationProvider,
} from "./image-generation-provider";
import {
  GeneratedImageStorage,
  type GeneratedImageFormat,
} from "./generated-image-storage";
import { withTimeout } from "./with-timeout";

const STABILITY_CORE_URL =
  "https://api.stability.ai/v2beta/stable-image/generate/core";
const STABILITY_TIMEOUT_MS = 30_000;
const OUTPUT_FORMAT: GeneratedImageFormat = "webp";

interface StabilityErrorBody {
  name?: string;
  message?: string;
  errors?: string[];
  id?: string;
}

export class StabilityImageGenerationProvider implements ImageGenerationProvider {
  constructor(
    private readonly apiKey: string | undefined,
    private readonly storage = new GeneratedImageStorage(),
  ) {}

  async generate(input: GenerateImageInput): Promise<ImageValue> {
    if (!this.apiKey) {
      throw new Error("STABILITY_API_KEY is missing on the backend.");
    }

    if (!input.prompt.trim()) {
      throw new Error("Stability generation requires a non-empty prompt.");
    }

    const formData = new FormData();
    formData.append("prompt", input.prompt);
    formData.append("output_format", OUTPUT_FORMAT);

    if (input.negativePrompt) {
      formData.append("negative_prompt", input.negativePrompt);
    }

    const response = await withTimeout(
      fetch(STABILITY_CORE_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "image/*",
        },
        body: formData,
      }),
      STABILITY_TIMEOUT_MS,
      "Stability Image Core request",
    );

    await this.assertSuccessfulResponse(response);

    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.startsWith("image/")) {
      throw new Error(
        `Stability returned malformed response content type "${contentType || "unknown"}".`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return this.storage.save(Buffer.from(arrayBuffer), OUTPUT_FORMAT);
  }

  async edit(input: EditImageInput): Promise<ImageValue> {
    const image: ImageValue = {
      type: "image",
      url: input.image.url,
    };

    if (input.image.mimeType) {
      image.mimeType = input.image.mimeType;
    }

    return image;
  }

  private async assertSuccessfulResponse(response: Response): Promise<void> {
    if (response.ok) {
      return;
    }

    const body = await this.readErrorBody(response);
    const details = body.errors?.length
      ? body.errors.join("; ")
      : body.message ?? response.statusText;

    if (response.status === 401) {
      throw new Error("Stability API rejected the request credentials.");
    }

    if (response.status === 403) {
      throw new Error(`Stability content moderation rejected the request: ${details}`);
    }

    if (response.status === 429) {
      throw new Error(`Stability rate limit exceeded: ${details}`);
    }

    if (response.status >= 400 && response.status < 500) {
      throw new Error(`Stability request was rejected (${response.status}): ${details}`);
    }

    throw new Error(`Stability API failed (${response.status}): ${details}`);
  }

  private async readErrorBody(response: Response): Promise<StabilityErrorBody> {
    const text = await response.text().catch(() => "");

    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text) as StabilityErrorBody;
    } catch {
      return {
        message: text.slice(0, 300),
      };
    }
  }
}
