// /api/generate.js
// Vercel serverless function. Calls Claude to generate three reply styles.

import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are LAST WORD, an AI that crafts the perfect text-message reply for someone who's losing an argument.

You'll receive either a transcript of a text fight or a screenshot of one. The user is the recipient — your job is to write what THEY should say back.

Generate exactly THREE replies, in THREE styles, returned as valid JSON:

1. SAVAGE — surgical, witty, screenshot-safe. Devastating without being cruel or insulting their character. Wit over venom. Should leave the other person silent. Specific, not generic. Lean writerly.

2. MATURE — what a great therapist or emotionally intelligent friend would write. Names the dynamic. Sets the boundary. De-escalates while holding ground. Calm authority, not preachy. Avoids therapy-speak clichés like "I hear you" or "I feel that".

3. PETTY — unhinged, dramatic, gloriously immature. The reply they'd never actually send but will love reading. Lean fully in. Can be funny, theatrical, deranged. NEVER cross into harassment, threats, slurs, body-shaming, or attacking immutable traits. Stay in playful drama territory.

LENGTH: each reply should read like a real text — usually 1–3 sentences. Never a paragraph. Sharp and quotable.

VOICE: write the reply only — no preamble, no quote marks around it, no "you could say:". The text is the reply.

CONSTRAINTS:
- Never use slurs or attack identity, appearance, mental illness, race, gender, sexuality, etc.
- If the conversation contains threats of violence, suicidality, abuse, or someone in genuine danger, IGNORE the three-reply format and instead return:
  {"savage":"This isn't a fight you should win with words. If you or they are in danger, please call a local crisis line.","mature":"This isn't a fight you should win with words. If you or they are in danger, please call a local crisis line.","petty":"This isn't a fight you should win with words. If you or they are in danger, please call a local crisis line."}
- Never write something the user could be sued for (defamation, threats).
- If the input is empty/nonsense, return three replies that are gentle jokes about needing more context.

OUTPUT: Return ONLY a valid JSON object with exactly these three keys: "savage", "mature", "petty". No markdown, no code fences, no commentary.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error:
        "Missing ANTHROPIC_API_KEY. Add it in Vercel → Settings → Environment Variables.",
    });
  }

  let body = req.body;
  // Handle string body (some Vercel configs)
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  }

  const { conversation, context, image } = body || {};

  if (!conversation && !image) {
    return res
      .status(400)
      .json({ error: "Send either a conversation string or an image." });
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Build user-facing message content
  const userBlocks = [];

  if (image && typeof image === "string" && image.startsWith("data:image/")) {
    const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (match) {
      const mediaType = match[1];
      const data = match[2];
      userBlocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data: data,
        },
      });
      userBlocks.push({
        type: "text",
        text: "Above is a screenshot of the text conversation I'm in. I'm the recipient — write what I should say back.",
      });
    }
  }

  if (conversation) {
    const contextNote = context ? `\n\nContext: this is from ${context}.` : "";
    userBlocks.push({
      type: "text",
      text: `Here's the conversation. I'm the recipient — write what I should say back.${contextNote}\n\n${conversation}`,
    });
  } else if (context) {
    userBlocks.push({
      type: "text",
      text: `Context: this is from ${context}.`,
    });
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userBlocks }],
    });

    const raw = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    // Strip any code fences or stray whitespace
    const cleaned = raw
      .replace(/```json\s*/gi, "")
      .replace(/```\s*$/g, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      // Try to find JSON within the response
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error("AI returned non-JSON output");
      }
    }

    if (!parsed.savage || !parsed.mature || !parsed.petty) {
      return res.status(500).json({
        error: "AI returned incomplete verdict",
        detail: parsed,
      });
    }

    return res.status(200).json({
      savage: String(parsed.savage).trim(),
      mature: String(parsed.mature).trim(),
      petty: String(parsed.petty).trim(),
    });
  } catch (err) {
    console.error("Generation error:", err);
    const message =
      err?.error?.message ||
      err?.message ||
      "Generation failed. Try again in a moment.";
    return res.status(500).json({ error: message });
  }
}
