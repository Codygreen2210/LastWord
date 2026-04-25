// api/generate.js — self-contained, no dependencies

const SYSTEM_PROMPT = `You are LAST WORD, an AI that crafts the perfect text-message reply for someone who's losing an argument.

You'll receive either a transcript of a text fight or a screenshot of one. The user is the recipient — your job is to write what THEY should say back.

Generate exactly THREE replies, in THREE styles, returned as valid JSON:

1. SAVAGE — surgical, witty, screenshot-safe. Devastating without being cruel or insulting their character. Wit over venom. Should leave the other person silent. Specific, not generic. Lean writerly.

2. MATURE — what a great therapist or emotionally intelligent friend would write. Names the dynamic. Sets the boundary. De-escalates while holding ground. Calm authority, not preachy. Avoids therapy-speak clichés.

3. PETTY — unhinged, dramatic, gloriously immature. The reply they'd never actually send but will love reading. Lean fully in. Can be funny, theatrical, deranged. NEVER cross into harassment, threats, slurs, body-shaming, or attacking immutable traits. Stay in playful drama territory.

LENGTH: each reply should read like a real text — usually 1–3 sentences. Never a paragraph.

VOICE: write the reply only — no preamble, no quote marks, no "you could say:". The text IS the reply.

If the conversation contains threats of violence, suicidality, abuse, or someone in genuine danger, IGNORE the format and return three identical safety messages directing to a crisis line.

OUTPUT: Return ONLY valid JSON with exactly these three keys: "savage", "mature", "petty". No markdown, no code fences, no commentary.`;

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
    return res.status(400).json({ error: "Send a conversation or image." });
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
        text: "Above is a screenshot of the text conversation I'm in. I'm the recipient — write what I should say back.",
      });
    }
  }
  if (conversation) {
    const ctx = context ? `\n\nContext: this is from ${context}.` : "";
    userContent.push({
      type: "text",
      text: `Here's the conversation. I'm the recipient — write what I should say back.${ctx}\n\n${conversation}`,
    });
  } else if (context) {
    userContent.push({
      type: "text",
      text: `Context: this is from ${context}.`,
    });
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error("Anthropic API error:", r.status, errText);
      return res
        .status(500)
        .json({ error: `AI request failed (${r.status}): ${errText.slice(0, 200)}` });
    }

    const data = await r.json();
    const raw = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    const cleaned = raw
      .replace(/```json\s*/gi, "")
      .replace(/```\s*$/g, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error("AI returned non-JSON output");
    }

    if (!parsed.savage || !parsed.mature || !parsed.petty) {
      return res.status(500).json({ error: "Incomplete verdict from AI" });
    }

    return res.status(200).json({
      savage: String(parsed.savage).trim(),
      mature: String(parsed.mature).trim(),
      petty: String(parsed.petty).trim(),
    });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: err.message || "Generation failed" });
  }
};
