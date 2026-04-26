const API_URL = 'v1/chat/completions' //ai helped fix the CORS issue for pulling an ai api key (ironic)
const MODEL = 'gpt-4o-mini'

export async function streamCloneResponse({ systemPrompt, messages, onToken, onDone, onError }) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`API ${response.status}: ${err}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          const text = parsed.choices?.[0]?.delta?.content
          if (text) {
            fullText += text
            onToken?.(fullText)
          }
        } catch {}
      }
    }

    onDone?.(fullText)
    return fullText
  } catch (err) {
    onError?.(err)
    return null
  }
}