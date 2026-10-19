import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import path from "node:path";
import { fileURLToPath } from "node:url";
dotenv.config();
const app = express();
const port = process.env.PORT || 3000;
const dir = path.dirname(fileURLToPath(import.meta.url));
if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY is missing. Set it in your host's environment variables or local .env.");
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(dir, "public")));
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.post("/api/chat", async (req, res) => {
  try {
    const { message, image } = req.body ?? {};
    if (typeof message !== "string" || (!message.trim() && !image))
      return res.status(400).json({ error: "پیام یا تصویر ارسال نشده است." });
    if (message.length > 20000)
      return res.status(413).json({ error: "متن پیام بیش از حد طولانی است." });
    const parts = [];
    if (message.trim()) parts.push({ text: message.trim() });
    if (image) {
      if (typeof image.data !== "string" ||
          !["image/jpeg","image/png","image/webp"].includes(image.mimeType) ||
          image.data.length > 8000000)
        return res.status(400).json({ error: "فرمت یا حجم تصویر مجاز نیست." });
      parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
    }
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts }],
      config: { systemInstruction: "تو بهلول GPT هستی؛ دستیار فارسی‌زبان، مفید و مؤدب. پیش‌فرض فارسی پاسخ بده." }
    });
    res.json({ reply: result.text || "پاسخی دریافت نشد." });
  } catch (e) {
    console.error("Gemini error:", e.message);
    res.status(500).json({ error: "ارتباط با هوش مصنوعی برقرار نشد. کلید API و دسترسی مدل را بررسی کن." });
  }
});
app.listen(port, () => console.log(`Behlol GPT listening on port ${port}`));
