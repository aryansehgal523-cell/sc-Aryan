import { ChatHeader } from "./ChatHeader.js";
import { MessageList } from "./MessageList.js";
import { ChatInput } from "./ChatInput.js";
import { useChatStore } from "../store/chat.context.js";

export function Chat() {
  const { state, sendMessage, clearError } = useChatStore();

  return (
    <div className="flex flex-col w-full h-screen sm:h-[90vh] sm:max-w-lg sm:rounded-2xl overflow-hidden shadow-2xl bg-white">
      <ChatHeader />
      <MessageList
        messages={state.messages}
        isTyping={state.status === "sending"}
        isLoading={state.status === "loading"}
      />
      <ChatInput
        onSend={sendMessage}
        disabled={state.status === "sending" || state.status === "loading"}
        errorMessage={state.errorMessage}
        onClearError={clearError}
        autoFocus
      />
    </div>
  );
}
