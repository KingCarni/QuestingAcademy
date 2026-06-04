import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors({ origin: ["http://localhost:3000", "http://localhost:3001"] }));
app.use(express.json({ limit: "15mb" }));

const escapeSvgText = (value = "") =>
  String(value)
    .slice(0, 120)
    .replace(/[<>&"]/g, "");

const makeSeed = (value = "") =>
  Math.abs(
    Array.from(String(value)).reduce(
      (acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0,
      0
    )
  );

const makeMockImageDataUrl = ({ promptUsed, prompt, contentType }) => {
  const safePrompt = escapeSvgText(prompt);
  const label = escapeSvgText(contentType || "Studio Art").slice(0, 32);
  const seed = makeSeed(promptUsed);

  const hueA = seed % 360;
  const hueB = (hueA + 48) % 360;
  const hueC = (hueA + 112) % 360;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="768" height="768" viewBox="0 0 768 768">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="hsl(${hueA}, 78%, 92%)"/>
      <stop offset="100%" stop-color="hsl(${hueB}, 84%, 88%)"/>
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#5b4a99" flood-opacity="0.25"/>
    </filter>
  </defs>

  <rect width="768" height="768" rx="56" fill="url(#bg)"/>
  <circle cx="604" cy="148" r="92" fill="white" opacity="0.28"/>
  <circle cx="132" cy="628" r="118" fill="white" opacity="0.22"/>

  <g filter="url(#softShadow)">
    <path d="M384 160 C500 160 596 250 596 366 C596 514 488 604 384 604 C280 604 172 514 172 366 C172 250 268 160 384 160Z"
          fill="hsl(${hueC}, 72%, 68%)"/>
    <circle cx="326" cy="332" r="26" fill="#fff"/>
    <circle cx="442" cy="332" r="26" fill="#fff"/>
    <path d="M314 420 Q384 484 454 420" fill="none" stroke="#fff" stroke-width="24" stroke-linecap="round"/>
    <path d="M252 226 Q310 118 382 186 Q454 118 516 226" fill="none" stroke="white" stroke-width="20" stroke-linecap="round" opacity="0.65"/>
  </g>

  <rect x="116" y="626" width="536" height="76" rx="28" fill="white" opacity="0.72"/>
  <text x="384" y="657" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="800" fill="#3f3f46">${label}</text>
  <text x="384" y="685" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" fill="#6b7280">${safePrompt}</text>
  <text x="384" y="728" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#9ca3af">DEV MOCK ART · not final generated art</text>
</svg>`.trim();

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
};

app.post("/api/studio/generate-image", async (req, res) => {
  try {
    const imageMode = process.env.STUDIO_IMAGE_MODE || "gemini";
    const {
      prompt,
      contentType,
      stylePreset,
      linkedEntityId,
      palette,
      visualReferences,
    } = req.body || {};

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ ok: false, error: "Prompt is required" });
    }

    const promptUsed = [
      "Create child-friendly Questing Academy game art.",
      "Cute chibi fantasy RPG style, soft shapes, cozy lighting, bright readable silhouette.",
      "No scary horror, no photoreal children, no unsafe content.",
      contentType ? `Content type: ${contentType}` : "",
      stylePreset ? `Style preset: ${stylePreset}` : "",
      linkedEntityId ? `Linked entity: ${linkedEntityId}` : "",
      palette?.from || palette?.to
        ? `Palette direction: ${palette?.from || "default"} to ${
            palette?.to || "default"
          }`
        : "",
      Array.isArray(visualReferences) && visualReferences.length
        ? `Visual references provided as metadata: ${visualReferences
            .map((r) => `${r.kind || "ref"}: ${r.label || "unnamed"}`)
            .join(" | ")}`
        : "",
      `Prompt: ${prompt}`,
    ]
      .filter(Boolean)
      .join("\n");

    if (imageMode === "mock") {
      return res.json({
        ok: true,
        imageDataUrl: makeMockImageDataUrl({ promptUsed, prompt, contentType }),
        provider: "mock",
        model: "local-dev-svg",
        promptUsed,
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

    if (!apiKey) {
      return res.status(503).json({
        ok: false,
        error:
          "Missing GEMINI_API_KEY. Add it to backend/.env to enable real image generation.",
      });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: promptUsed }] }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: data?.error?.message || "Gemini image generation failed",
        provider: "gemini",
        model,
      });
    }

    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p) => p.inlineData?.data || p.inline_data?.data);

    const inline = imagePart?.inlineData || imagePart?.inline_data;

    if (!inline?.data) {
      return res.status(502).json({
        ok: false,
        error: "No image data returned from Gemini",
        provider: "gemini",
        model,
        rawText: parts
          .map((p) => p.text)
          .filter(Boolean)
          .join("\n"),
      });
    }

    const mimeType = inline.mimeType || inline.mime_type || "image/png";

    return res.json({
      ok: true,
      imageDataUrl: `data:${mimeType};base64,${inline.data}`,
      provider: "gemini",
      model,
      promptUsed,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Unknown server error",
    });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "questing-academy-backend" });
});

app.get("/api/studio/image", async (req, res) => {
  const prompt = String(req.query.prompt || "Questing Academy image");
  const seed = String(req.query.seed || "local");
  const label = escapeSvgText(prompt).slice(0, 80);

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="768" height="768" viewBox="0 0 768 768">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#EAF7FF"/>
      <stop offset="100%" stop-color="#FFF8DD"/>
    </linearGradient>
  </defs>
  <rect width="768" height="768" rx="48" fill="url(#bg)"/>
  <circle cx="384" cy="320" r="120" fill="#9D8DF1" opacity="0.9"/>
  <circle cx="342" cy="292" r="18" fill="#fff"/>
  <circle cx="426" cy="292" r="18" fill="#fff"/>
  <path d="M330 370 Q384 420 438 370" fill="none" stroke="#fff" stroke-width="18" stroke-linecap="round"/>
  <text x="384" y="535" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#3f3f46">Questing Academy</text>
  <text x="384" y="586" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#6b7280">${label}</text>
  <text x="384" y="630" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#9ca3af">local fallback · ${seed}</text>
</svg>`.trim();

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.status(200).send(svg);
});

app.listen(PORT, () => {
  console.log(`Questing Academy backend running on http://localhost:${PORT}`);
});