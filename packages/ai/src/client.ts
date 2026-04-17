const OPENAI_BASE_URL = "https://api.openai.com/v1";

export function getOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  return key;
}

export async function openaiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${OPENAI_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getOpenAIKey()}`,
      ...(init.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    if (
      response.status === 429 ||
      detail.includes("quota") ||
      detail.includes("billing")
    ) {
      throw new Error(
        "El servicio de IA no esta disponible en este momento. Contacta al administrador para verificar la cuota de OpenAI.",
      );
    }
    if (response.status === 401) {
      throw new Error(
        "La clave de API de OpenAI es invalida o ha expirado.",
      );
    }
    throw new Error(`OpenAI ${response.status}: ${detail}`);
  }

  return response.json() as Promise<T>;
}

export async function openaiFetchWithTimeout<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs: number = 15_000,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await openaiFetch<T>(path, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
