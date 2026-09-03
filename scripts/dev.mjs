import { spawn } from "node:child_process";

const commands = [
  ["backend", ["run", "dev", "--workspace", "@ai-image-workflow/backend"]],
  ["frontend", ["run", "dev", "--workspace", "@ai-image-workflow/frontend"]],
];

const children = commands.map(([name, args]) => {
  const child = spawn("npm", args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  child.on("exit", (code, signal) => {
    if (code && code !== 0) {
      console.error(`${name} dev server exited with code ${code}.`);
      process.exitCode = code;
    }

    if (signal) {
      process.exitCode = 1;
    }
  });

  return child;
});

const stop = () => {
  for (const child of children) {
    child.kill("SIGTERM");
  }
};

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
