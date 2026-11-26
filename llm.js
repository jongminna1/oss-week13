// The only file that talks to the LLM provider.
// The provider, the model and the key come from .env:
//   process.env.LLM_BASE_URL, process.env.LLM_MODEL, process.env.LLM_API_KEY

const SYSTEM = `해요체로 답하세요. 답은 한 문단에 세 문장 이내로 작성하세요.
목록, 제목, 굵은 글씨 같은 마크다운을 쓰지 마세요.`;

const SYSTEM_JSON = `후기를 분석하고 sentiment, score, summary 세 키를 가진 JSON 객체로만 답하세요.
sentiment는 positive, negative, neutral 중 하나이고 score는 1부터 5까지의 정수예요.
summary에는 후기를 한 문장으로 요약하세요.`;

async function complete(messages, options = {}) {
  const response = await fetch(`${process.env.LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.LLM_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: process.env.LLM_MODEL, messages, ...options }),
  });
  if (!response.ok) throw new Error(`LLM: HTTP ${response.status}`);
  const data = await response.json();
  return data.choices[0].message.content.trim();
}

export async function ask(question) {
  return complete([
    { role: "system", content: SYSTEM },
    { role: "user", content: question },
  ]);
}

// chat([{ role: "user", content: "..." }, { role: "assistant", content: "..." }, ...])
//   ->  the model's next answer, as a string
export async function chat(history) {
  return complete([{ role: "system", content: SYSTEM }, ...history]);
}

// analyze("a review")  ->  an object, not a sentence:
//   { sentiment: "positive" | "negative" | "neutral", score: 1..5, summary: "one short sentence" }
export async function analyze(text) {
  const messages = [
    { role: "system", content: SYSTEM_JSON },
    { role: "user", content: text },
  ];
  const content = await complete(messages, { response_format: { type: "json_object" } });
  const { sentiment, score, summary } = JSON.parse(content) ?? {};
  if (!["positive", "negative", "neutral"].includes(sentiment) ||
      !Number.isInteger(score) || score < 1 || score > 5 ||
      typeof summary !== "string") {
    throw new Error("LLM: the answer has the wrong shape");
  }
  return { sentiment, score, summary };
}
