# VeerNXT AI Inference API - Usage Guide

This document explains how to call the internal AI Inference proxy endpoint located at `/api/v1/chat/completions` within the VeerNXT Web backend.

## 1. Authentication

The endpoint is protected by an internal API key to prevent unauthorized usage. You must pass this key in the `Authorization` header as a Bearer token.

**Header Format:**
```http
Authorization: Bearer developergupta_GWWN4LCOUOAKz16hF439MUGnf1PPKonBnpARki6xHPDbEnNjR
```
*(Ensure the key matches the `INTERNAL_API_KEY` defined in the `.env` file).*

---

## 2. Example: Calling via cURL

You can test the endpoint from your terminal using cURL.

```bash
curl -X POST https://veernxt.in/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer developergupta_GWWN4LCOUOAKz16hF439MUGnf1PPKonBnpARki6xHPDbEnNjR" \
  -d '{
    "model": "nvidia/nemotron-3.5-lightning-30b-a3b",
    "temperature": 0.3,
    "max_tokens": 512,
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful AI assistant for VeerNXT."
      },
      {
        "role": "user",
        "content": "What services does VeerNXT provide?"
      }
    ]
  }'
```

---

## 3. Example: Calling from Frontend / Node.js (Fetch)

If you are calling this from another backend service or frontend component, use the standard `fetch` API.

```javascript
async function fetchAIResponse(userMessage, context) {
  const url = '/api/v1/chat/completions'; // Relative URL if calling from the same domain
  
  const payload = {
    model: 'nvidia/nemotron-3.5-lightning-30b-a3b',
    temperature: 0.3,
    max_tokens: 512,
    messages: [
      {
        role: 'system',
        content: 'You are the VeerNXT AI assistant. Answer only using the provided context.'
      },
      {
        role: 'system',
        content: `RELEVANT VEERNXT KNOWLEDGE:\n${context}`
      },
      {
        role: 'user',
        content: userMessage
      }
    ]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer developergupta_GWWN4LCOUOAKz16hF439MUGnf1PPKonBnpARki6xHPDbEnNjR`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`AI API Error: ${errorData.error.message}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
    
  } catch (error) {
    console.error("Failed to fetch AI response:", error);
    return null;
  }
}
```

---

## 4. Demo Response Structure

If the request is successful, the proxy will return a standard OpenAI-compatible JSON response.

**Response (200 OK):**
```json
{
  "id": "chatcmpl-9b8c7d6e5f4g3h2i1j",
  "object": "chat.completion",
  "created": 1724933931,
  "model": "nvidia/nemotron-3.5-lightning-30b-a3b",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "VeerNXT provides comprehensive services including candidate profiling, employer matching, and AI-driven skill recommendations designed to streamline the hiring and onboarding process."
      },
      "logprobs": null,
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 45,
    "completion_tokens": 28,
    "total_tokens": 73
  },
  "system_fingerprint": "fp_2a3b4c5d6e"
}
```

### Error Response Example

If something goes wrong (e.g. rate limit, bad payload, or upstream provider failure), the API guarantees a consistent JSON error format so internal stack traces are never leaked.

**Response (401 Unauthorized / 400 Bad Request / 502 Bad Gateway):**
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Streaming is not supported at this time."
  }
}
```
