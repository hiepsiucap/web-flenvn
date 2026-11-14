const STORAGE_KEY = "flen:home-chat-prompt";

export function readHomeChatPrompt(): string | null {
  try {
    const text = sessionStorage.getItem(STORAGE_KEY)?.trim();
    return text && text.length <= 5000 ? text : null;
  } catch {
    return null;
  }
}

export function storeHomeChatPrompt(text: string) {
  sessionStorage.setItem(STORAGE_KEY, text.trim());
}

export function clearHomeChatPrompt() {
  sessionStorage.removeItem(STORAGE_KEY);
}
