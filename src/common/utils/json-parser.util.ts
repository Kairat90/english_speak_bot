/**
 * Извлекает JSON из ответа Gemini, даже если он обёрнут в markdown-блок.
 */
export function parseGeminiJson<T>(raw: string): T {
  const trimmed = raw.trim();

  const jsonBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonString = jsonBlockMatch ? jsonBlockMatch[1].trim() : trimmed;

  try {
    return JSON.parse(jsonString) as T;
  } catch {
    const objectMatch = jsonString.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]) as T;
    }
    throw new Error(`Failed to parse Gemini JSON response: ${raw.slice(0, 200)}`);
  }
}
