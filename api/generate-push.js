import OpenAI from "openai";

export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const { text, category, tone = "neutral", emoji = false, date, time, link } =
    await req.json();

  const system = [
    "You are a push-notification copy assistant for golf courses and breweries.",
    "Always return EXACTLY 3 distinct options as a JSON array of strings.",
    "Each option should target ≤130 characters.",
    "Use active voice, clear CTA, and tasteful emoji only if emoji=true."
  ].join("\n");

  const base = text || `Category: ${category}. Generate 3 options.`;
  const meta = `Tone:${tone} Emoji:${emoji} Date:${date||"{DATE}"} Time:${time||"{TIME}"} Link:${link||"{LINK}"}`;
  const user = `${base}\n${meta}`;

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
        { role: "user", content: "Return ONLY valid JSON array of 3 strings." }
      ],
      temperature: 0.9
    });

    let raw = completion.choices?.[0]?.message?.content?.trim() || "[]";
    let options;
    try { options = JSON.parse(raw); } catch { options = raw.split(/\n+/).slice(0,3); }

    return new Response(JSON.stringify({ options }), {
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
