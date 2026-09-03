import Fastify from "fastify";
import {
  GeneratedImageStorage,
  StabilityImageGenerationProvider,
} from "../modules/ai";
import { registerGeneratedRoutes } from "../modules/generated";
import { registerPresetsRoutes } from "../modules/presets";
import { registerRunsRoutes } from "../modules/runs";
import { PresetStore } from "../modules/presets";
import { RunStore, WorkflowExecutor } from "../modules/runs";
import { loadEnvFiles, readBackendEnv } from "./env";

export const buildApp = () => {
  loadEnvFiles();
  const env = readBackendEnv();
  const storage = new GeneratedImageStorage();
  const presetStore = new PresetStore();
  const provider = new StabilityImageGenerationProvider(env.stabilityApiKey, storage);
  const executor = new WorkflowExecutor(new RunStore(), provider, presetStore);
  const app = Fastify({
    logger: true,
  });

  app.addHook("onRequest", async (request, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    reply.header("Access-Control-Allow-Headers", "Content-Type");
    reply.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

    if (request.method === "OPTIONS") {
      return reply.code(204).send();
    }

    return undefined;
  });

  app.get("/health", async () => ({
    ok: true,
    imageProvider: "stability",
    stabilityConfigured: Boolean(env.stabilityApiKey),
  }));

  registerGeneratedRoutes(app, { storage });
  registerPresetsRoutes(app, { presetStore });
  registerRunsRoutes(app, { executor });

  return app;
};
