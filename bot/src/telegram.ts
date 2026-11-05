export class TelegramError extends Error { constructor(public status: number, public description: string) { super(`${status} ${description}`); } get blocked() { return this.status === 403; } }
export interface Button { text: string; callback_data: string }
export type Keyboard = Button[][];

export function telegramClient(token: string, f: typeof fetch = fetch) {
  const call = async (method: string, payload: Record<string, unknown>) => {
    const res = await f(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
    if (!res.ok || json.ok === false) throw new TelegramError(res.status, json.description ?? 'error');
    return json;
  };
  return {
    send: (chatId: number, html: string, keyboard?: Keyboard) => call('sendMessage', { chat_id: chatId, text: html, parse_mode: 'HTML', link_preview_options: { is_disabled: true }, ...(keyboard?.length ? { reply_markup: { inline_keyboard: keyboard } } : {}) }),
    edit: (chatId: number, messageId: number, html: string, keyboard?: Keyboard) => call('editMessageText', { chat_id: chatId, message_id: messageId, text: html, parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard ?? [] } }),
    answer: (callbackId: string, text?: string) => call('answerCallbackQuery', { callback_query_id: callbackId, ...(text ? { text } : {}) })
  };
}
export type Telegram = ReturnType<typeof telegramClient>;
