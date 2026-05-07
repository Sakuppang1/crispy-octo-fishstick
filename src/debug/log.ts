const ENDPOINT = 'http://127.0.0.1:7497/ingest/5924cb9e-4f65-47ae-81c4-ee7243688626'
const SESSION_ID = 'ac71d8'

export function agentLog(location: string, message: string, data: Record<string, unknown>, runId: string, hypothesisId: string) {
  fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': SESSION_ID },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      location,
      message,
      data,
      timestamp: Date.now(),
      runId,
      hypothesisId,
    }),
  }).catch(() => {})
}

