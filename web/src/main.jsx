import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import AppRoutes from "./routes/AppRoutes";
import ErrorBoundary from "./components/ErrorBoundary";
import { applyTheme } from "./theme";
import "./theme/global.css";
applyTheme();
createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  </ErrorBoundary>,
);
