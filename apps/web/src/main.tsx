import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary.js";
import { ChatProvider } from "./store/chat.context.js";
import { Chat } from "./components/Chat.js";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("No #root element found");

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-0 sm:p-6">
        <ChatProvider>
          <Chat />
        </ChatProvider>
      </div>
    </ErrorBoundary>
  </StrictMode>,
);
