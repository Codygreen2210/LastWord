// api/generate.js — v4 (Haiku 4.5, surfaced errors)

const SYSTEM_PROMPT = `You are LAST WORD, an AI that crafts the perfect text-message reply for someone losing an argument.

You'll receive a transcript or screenshot of a text fight. The user is the recipient — your job is to write what THEY should say back.

Generate exactly THREE replies in THREE styles:

1. SAVAGE — surgical, witty, screenshot-safe. Devastating without being cruel. Wit over venom. Specific, not generic.
2. MATURE — what an emotionally intelligent friend would write. Names the dynamic. Sets the boundary. Calm authority.
3. PETTY — unhinged, dramatic, theatrically immature. The reply they'd never send but love reading. NEVER use slurs, threats, harassment, body-shaming, or attacks on identity.

LENGTH: each reply 1–3 sentences max. Read like a real text.
VOICE: write the reply only — no preamble, no quote marks, no "you could say:". The text IS the reply.

If input contains threats of violence, suicidality, abuse, or someone in genuine danger, return three identical messages directing to a crisis line.

If the input is empty, nonsense, or too short to understand the conflict, still produce three replies — make them gentle jokes about needing more context.

CRITICAL: Return ONLY valid JSON with exactly these three keys: "savage", "mature", "petty". No markdown, no code fences, no commentary. Start your response with { and end with }.`;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "Missing ANTHROPIC_API_KEY env var in Vercel" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  }

  const { conversation, context, image } = body || {};
  if (!conversation && !image) {
    return res.status(400).json({ error: "Paste a text fight or upload a screenshot." });
  }

  const userContent = [];
  if (image && typeof image === "string" && image.startsWith("data:image/")) {
    const m = image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (m) {
      userContent.push({
        type: "image",
        source: { type: "base64", media_type: m[1], data: m[2] },
      });
      userContent.push({
        type: "text",
        text: "Above is a screenshot of the text conversation I'm in. I'm the recipient — write what I should say back. Return JSON only.",
      });
    }
  }
  if (conversation) {
    const ctx = context ? `\n\nContext: this is from ${context}.` : "";
    userContent.push({
      type: "text",
      text: `Here's the conversation. I'm the recipient — write what I should say back. Return JSON only with keys "savage", "mature", "petty".${ctx}\n\n${conversation}`,
    });
  } else if (context) {
    userContent.push({
      type: "text",
      text: `Context: this is from ${context}. Return JSON only.`,
    });
  }

  // Try multiple model names in order — first available wins
  const MODELS_TO_TRY = [
    "claude-haiku-4-5-20251001",
    "claude-haiku-4-5",
    "claude-3-5-sonnet-20241022",
  ];

  let lastError = null;
  let response = null;

  for (const model of MODELS_TO_TRY) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 800,
          system: SYSTEM_PROMPT,
          messages: [
            { role: "user", content: userContent },
            { role: "assistant", content: "{" },
          ],
        }),
      });

      if (r.ok) {
        response = await r.json();
        console.log(`Success with model: ${model}`);
        break;
      }

      const errText = await r.text();
      console.error(`Model ${model} returned ${r.status}:`, errText);
      lastError = { status: r.status, detail: errText, model };

      // If it's an auth error, don't try more models
      if (r.status === 401 || r.status === 403) {
        return res.status(500).json({
          error: `Auth failed (${r.status}). Check your ANTHROPIC_API_KEY in Vercel: ${errText.slice(0, 200)}`,
        });
      }
    } catch (fetchErr) {
      lastError = { detail: fetchErr.message, model };
      console.error(`Fetch error for ${model}:`, fetchErr);
    }
  }

  if (!response) {
    return res.status(500).json({
      error: `All models failed. Last error: ${lastError?.detail?.slice(0, 300) || "unknown"}`,
    });
  }

  try {
    const raw = (response.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    let candidate = "{" + raw;
    candidate = candidate.replace(/```json\s*/gi, "").replace(/```\s*$/g, "").trim();

    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      candidate = candidate.slice(firstBrace, lastBrace + 1);
    }

    let parsed;
    try {
      parsed = JSON.parse(candidate);
    } catch (e) {
      console.error("Parse failed. Raw:", raw);
      return res.status(500).json({
        error: `AI didn't return valid JSON. Got: "${raw.slice(0, 200)}"`,
      });
    }

    if (!parsed.savage || !parsed.mature || !parsed.petty) {
      return res.status(500).json({
        error: `Incomplete verdict. Got keys: ${Object.keys(parsed).join(", ")}`,
      });
    }

    return res.status(200).json({
      savage: String(parsed.savage).trim(),
      mature: String(parsed.mature).trim(),
      petty: String(parsed.petty).trim(),
    });
  } catch (err) {
    console.error("Processing error:", err);
    return res.status(500).json({ error: err.message || "Generation failed" });
  }
};
