// Modelos disponíveis por provider (compartilhável client/server)
export const PROVIDER_MODELS: Record<string, { label: string; models: { value: string; label: string }[] }> = {
  groq: {
    label: 'Groq (Gratuito)',
    models: [
      { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (recomendado)' },
      { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (rápido)' },
      { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
      { value: 'gemma2-9b-it', label: 'Gemma 2 9B' },
    ],
  },
  gemini: {
    label: 'Google Gemini (Gratuito)',
    models: [
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (recomendado)' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    ],
  },
  openai: {
    label: 'OpenAI (Pago)',
    models: [
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (barato)' },
      { value: 'gpt-4o', label: 'GPT-4o (avançado)' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    ],
  },
}
