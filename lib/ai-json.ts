type Block = { type: string; text?: string };

// Joins all text blocks; content[0] may be a thinking block.
export function getText(message: { content: Block[] }): string {
  return message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
}

export function extractJson(raw: string): string {
  const unfenced = raw.replace(/```(?:json)?/gi, "").trim();
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  return start !== -1 && end > start ? unfenced.slice(start, end + 1) : unfenced;
}

// Throws a descriptive error when the response has no usable text.
export function requireText(message: { content: Block[]; stop_reason: string | null }): string {
  if (message.stop_reason === "refusal") throw new Error("response refused (stop_reason=refusal)");
  const text = getText(message);
  if (!text.trim()) {
    const blocks = message.content.map((b) => b.type).join(",") || "none";
    throw new Error(`empty response (stop_reason=${message.stop_reason}, blocks=${blocks})`);
  }
  return text;
}
