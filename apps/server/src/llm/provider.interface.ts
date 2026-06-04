export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LLMProvider {
  generateReply(history: LLMMessage[], userMessage: string): Promise<string>;
}
