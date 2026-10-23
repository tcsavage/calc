import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { UpdatePrompt } from "./app/UpdatePrompt";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App updatePrompt={<UpdatePrompt />} />
    </StrictMode>,
  );
}
