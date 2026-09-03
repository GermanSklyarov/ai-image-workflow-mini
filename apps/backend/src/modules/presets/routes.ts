import type { FastifyInstance } from "fastify";
import { PresetStore } from "./preset-store";

export interface PresetsRoutesOptions {
  presetStore?: PresetStore;
}

export const registerPresetsRoutes = (
  app: FastifyInstance,
  options: PresetsRoutesOptions = {},
) => {
  const presetStore = options.presetStore ?? new PresetStore();

  app.get("/presets", async () => presetStore.list());
};
