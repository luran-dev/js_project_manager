import { spawn } from "node:child_process";

const start = (command, args, env = {}) => spawn(command, args, { env: { ...process.env, ...env }, stdio: "inherit" });
const viteArgs = process.argv.slice(2).filter((arg) => arg !== "--");
const hasArg = (name) => viteArgs.includes(name) || viteArgs.some((arg) => arg.startsWith(`${name}=`));
const defaultViteArgs = [
  ...(hasArg("--host") ? [] : ["--host", "127.0.0.1"]),
  ...(hasArg("--port") ? [] : ["--port", "5174"]),
  ...(hasArg("--strictPort") ? [] : ["--strictPort"]),
];
const vite = start("pnpm", ["exec", "vite", ...defaultViteArgs, ...viteArgs]);

const stop = () => {
  vite.kill("SIGTERM");
};

vite.on("exit", (code) => {
  process.exit(code ?? 0);
});
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
