import type { Preset } from "@ai-image-workflow/shared-types";

const presets = new Map<string, Preset>([
  [
    "preset-demo",
    {
      id: "preset-demo",
      name: "Premium 3D",
      mainPrompt: "premium minimal 3D visual",
      negativePrompt: "clutter, noisy background",
      references: ["/references/ref-1.png", "/references/ref-2.png"],
    },
  ],
]);

export class PresetStore {
  getById(id: string): Preset | undefined {
    return presets.get(id);
  }

  list(): Preset[] {
    return [...presets.values()];
  }
}
