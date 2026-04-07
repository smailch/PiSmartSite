import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET() {
  try {
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
    
    console.log("🔍 Clé API détectée:", apiKey ? "✅ OUI" : "❌ NON");
    console.log("🔍 Longueur de la clé:", apiKey?.length);
    console.log("🔍 Premiers caractères:", apiKey?.substring(0, 10) + "...");

    if (!apiKey) {
      return Response.json({ 
        error: "❌ REACT_APP_GEMINI_API_KEY not found in .env.local",
        debug: "Check if .env.local exists and has the key"
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const response = await model.generateContent("Hello");
      return Response.json({ success: "✅ Connection OK", response });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const code =
        err && typeof err === "object" && "code" in err
          ? (err as { code?: unknown }).code
          : undefined;
      return Response.json({
        error: msg,
        code,
        details: String(err),
      });
    }
  } catch (error: unknown) {
    return Response.json({
      error: error instanceof Error ? error.message : String(error),
      stack: String(error),
    });
  }
}