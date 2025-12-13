"use client";

import { FormEvent, useState } from "react";

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setResult("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error ?? "エラーが発生しました");
        return;
      }

      setResult(data.text ?? "");
    } catch (err) {
      console.error(err);
      alert("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">
        SNS / note / ブログ 文章生成ツール（テスト版）
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-semibold">
            お題・条件・キーワード
          </label>
          <textarea
            className="w-full border rounded p-2 min-h-[120px]"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="例）ハンドセラピスサロンのInstagram投稿文を作って。30代女性向け、やさしい口調で、肩こりケアについて。"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="border rounded px-4 py-2 font-semibold disabled:opacity-50"
        >
          {loading ? "生成中..." : "文章を生成する"}
        </button>
      </form>

      {result && (
        <section className="mt-6">
          <h2 className="text-xl font-semibold mb-2">生成結果</h2>
          <div className="whitespace-pre-wrap border rounded p-3 bg-gray-50">
            {result}
          </div>
        </section>
      )}
    </main>
  );
}
