import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ImageValue } from "@ai-image-workflow/shared-types";

export type GeneratedImageFormat = "png" | "webp";

export class GeneratedImageStorage {
  constructor(private readonly directory = join(process.cwd(), "generated")) {}

  getDirectory(): string {
    return this.directory;
  }

  async save(buffer: Buffer, format: GeneratedImageFormat): Promise<ImageValue> {
    if (buffer.length === 0) {
      throw new Error("AI provider returned an empty image response.");
    }

    await mkdir(this.directory, { recursive: true });

    const fileName = `${randomUUID()}.${format}`;
    const filePath = join(this.directory, fileName);

    await writeFile(filePath, buffer);

    return {
      type: "image",
      url: `/generated/${fileName}`,
      mimeType: `image/${format}`,
    };
  }
}
