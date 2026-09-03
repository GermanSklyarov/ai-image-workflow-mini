import { buildApp } from "./shared/app";

const app = buildApp();
const port = Number(process.env.PORT ?? 3001);

await app.listen({ host: "0.0.0.0", port });
