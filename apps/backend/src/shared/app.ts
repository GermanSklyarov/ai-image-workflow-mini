import Fastify from "fastify";
import { registerPresetsRoutes } from "../modules/presets";
import { registerRunsRoutes } from "../modules/runs";

export const buildApp = () => {
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
  }));

  registerPresetsRoutes(app);
  registerRunsRoutes(app);

  return app;
};
