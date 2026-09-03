import Fastify from "fastify";
import { registerRunsRoutes } from "../modules/runs";

export const buildApp = () => {
  const app = Fastify({
    logger: true,
  });

  app.get("/health", async () => ({
    ok: true,
  }));

  registerRunsRoutes(app);

  return app;
};
