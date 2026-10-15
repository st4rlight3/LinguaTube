import React from "react";
import { createRoot } from "react-dom/client";
import { Platform } from "./platform";
import "./style.css";
import "./platform.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Platform />
  </React.StrictMode>,
);
