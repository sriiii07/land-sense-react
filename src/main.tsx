import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import router from "./router";
import { AuthProvider } from "./lib/auth";
import { I18nProvider } from "./lib/i18n";
import { Toaster } from "sonner";
import "./styles.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster richColors position="top-center" />
        </AuthProvider>
      </QueryClientProvider>
    </I18nProvider>
  </StrictMode>
);
