// app/api/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";

// 環境変数からモックフラグを読む
const USE_MOCK =
  process.env.USE_MOCK_GENERATE === "true";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = (await req.json()) as { prompt?: string };

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    // ★ここでダミーモードをチェック
    if (USE_MOCK) {
      return NextResponse.json({
        text: `（開発用ダミー応答です）\n\nお題: ${prompt}\n\nここに本来はAIの文章が入ります。`,
      });
    }

    // ここから下が「本物のAPI呼び出し」
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "developer",
          content:
            "You are an assistant that writes Japanese text for SNS posts, note articles, and blog posts.",
        },
        { role: "user", content: prompt },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "";
    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("OpenAI error:", error);

    const message =
      error?.error?.message ??
      error?.message ??
      "Server error";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
