import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { applyTheme, readTheme } from "./theme";
import "./styles.css";
import "./workspace.css";

applyTheme(readTheme(), window.matchMedia("(prefers-color-scheme: dark)").matches);

if (import.meta.env.DEV && import.meta.env["VITE_DISABLE_REACT_DEVTOOLS"] !== "1") {
  void import("react-grab");
  void import("react-scan").then(({ scan }) => scan({ enabled: true, showToolbar: false }));
}

const root = document.getElementById("root");

if (root === null) {
  throw new Error("Root element not found");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
