"use client";

import { FormEvent, useState, ChangeEvent } from "react";

type FieldType = "single" | "multi" | "text";

type FieldDefinition = {
  id: string;
  label: string;
  type: FieldType;
  options: string[];
};

type FieldValueMap = {
  [fieldId: string]: string | string[];
};

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [values, setValues] = useState<FieldValueMap>({});

  const canAddField = fields.length < 5;

  const handleAddField = () => {
    if (!canAddField) return;
    const index = fields.length + 1;
    const newField: FieldDefinition = {
      id: crypto.randomUUID(),
      label: `条件${index}`,
      type: "text",
      options: [],
    };
    setFields((prev) => [...prev, newField]);
  };

  const handleRemoveField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    setValues((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleUpdateField = (id: string, partial: Partial<FieldDefinition>) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...partial } : f))
    );

    // 種類変更時は値も整理
    if (partial.type) {
      setValues((prev) => {
        const current = prev[id];
        if (partial.type === "multi") {
          // 単一→複数の場合は配列化
          if (typeof current === "string" && current) {
            return { ...prev, [id]: [current] };
          }
        } else {
          // 複数→単一／テキストの場合は文字列化
          if (Array.isArray(current)) {
            return { ...prev, [id]: current[0] ?? "" };
          }
        }
        return prev;
      });
    }
  };

  const handleChangeValue = (id: string, value: string | string[]) => {
    setValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    // 追加条件をテキストに整形
    const conditionLines = fields.map((field) => {
      const v = values[field.id];
      if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) {
        return `${field.label}: （未入力）`;
      }

      if (field.type === "multi") {
        const list = Array.isArray(v) ? v.join("、") : String(v);
        return `${field.label}: ${list}`;
      }

      // single / text は文字列として扱う
      return `${field.label}: ${String(v)}`;
    });

    const fullPrompt =
      prompt +
      (conditionLines.length
        ? "\n\n【追加条件】\n" + conditionLines.join("\n")
        : "");

    setLoading(true);
    setResult("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt }),
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
    <main className="min-h-screen max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">
        SNS / note / ブログ 文章生成ツール（テスト版）
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* メインお題 */}
        <section className="space-y-2">
          <label className="block font-semibold">
            お題・条件・キーワード（自由入力）
          </label>
          <textarea
            className="w-full border rounded p-3 min-h-[120px]"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="例）ハンドセラピスサロンのInstagram投稿文を作成。30代女性向け、優しい口調で、肩こりケアについて。"
          />
        </section>

        {/* 追加条件フィールド */}
        <section className="space-y-3 border rounded-lg p-4 bg-slate-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">追加条件（最大5項目）</h2>
              <p className="text-sm text-slate-500">
                単一選択・複数選択・テキストから選んで条件を追加できます。
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddField}
              disabled={!canAddField}
              className="px-3 py-2 text-sm border rounded disabled:opacity-50"
            >
              項目を追加
            </button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <ConditionFieldEditor
                key={field.id}
                index={index}
                field={field}
                value={values[field.id]}
                onChangeField={handleUpdateField}
                onChangeValue={handleChangeValue}
                onRemove={handleRemoveField}
              />
            ))}

            {fields.length === 0 && (
              <p className="text-sm text-slate-500">
                「項目を追加」ボタンから条件を追加できます。
              </p>
            )}
          </div>
        </section>

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

/**
 * 1つ分の条件フィールド行
 */
type ConditionFieldEditorProps = {
  index: number;
  field: FieldDefinition;
  value: string | string[] | undefined;
  onChangeField: (id: string, partial: Partial<FieldDefinition>) => void;
  onChangeValue: (id: string, value: string | string[]) => void;
  onRemove: (id: string) => void;
};

function ConditionFieldEditor(props: ConditionFieldEditorProps) {
  const { index, field, value, onChangeField, onChangeValue, onRemove } = props;

  const handleTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as FieldType;
    onChangeField(field.id, { type });
  };

  const handleLabelChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChangeField(field.id, { label: e.target.value });
  };

  const handleOptionChange = (idx: number, v: string) => {
    const next = [...field.options];
    next[idx] = v;
    onChangeField(field.id, { options: next });
  };

  const handleAddOption = () => {
    const next = [...field.options, `選択肢${field.options.length + 1}`];
    onChangeField(field.id, { options: next });
  };

  const handleRemoveOption = (idx: number) => {
    const next = field.options.filter((_, i) => i !== idx);
    onChangeField(field.id, { options: next });
  };

  // 単一・複数選択用の現在値
  const singleValue =
    typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "";
  const multiValues = Array.isArray(value) ? value : [];

  // pillボタンの共通クラス
  const pillBase =
    "px-3 py-1.5 rounded-full text-sm border transition-colors active:scale-[0.98]";
  const pillSelected = "bg-slate-900 text-white border-slate-900";
  const pillUnselected = "bg-white text-slate-700 border-slate-300";

  return (
    <div className="rounded-xl border bg-white p-3 space-y-3 shadow-sm">
      {/* 行のヘッダー：項目名＋タイプ＋削除 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">#{index + 1}</span>
        <input
          type="text"
          className="flex-1 min-w-[140px] border rounded px-2 py-1 text-sm"
          value={field.label}
          onChange={handleLabelChange}
          placeholder="項目名（例：ターゲット、媒体、トーン など）"
        />
        <select
          value={field.type}
          onChange={handleTypeChange}
          className="border rounded px-2 py-1 text-xs bg-white"
        >
          <option value="text">テキスト</option>
          <option value="single">単一選択</option>
          <option value="multi">複数選択</option>
        </select>
        <button
          type="button"
          onClick={() => onRemove(field.id)}
          className="text-[11px] text-red-500 px-2 py-1"
        >
          削除
        </button>
      </div>

      {/* 種類ごとの入力UI */}
      {field.type === "text" && (
        <div className="space-y-1">
          <span className="text-xs text-slate-500">入力</span>
          <input
            type="text"
            className="w-full border rounded px-2 py-2 text-sm"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChangeValue(field.id, e.target.value)}
            placeholder="例：30代女性 / Instagram / 優しい・親しみやすい など"
          />
        </div>
      )}

      {(field.type === "single" || field.type === "multi") && (
        <div className="space-y-2">
          {/* 選択肢編集（作成者向け） */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">選択肢（編集）</span>
              <button
                type="button"
                onClick={handleAddOption}
                className="text-[11px] text-blue-600 px-1 py-0.5"
              >
                ＋ 選択肢追加
              </button>
            </div>
            <div className="space-y-1">
              {field.options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    className="flex-1 border rounded px-2 py-1 text-xs"
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    className="text-[10px] text-red-500 px-1 py-0.5"
                  >
                    削除
                  </button>
                </div>
              ))}
              {field.options.length === 0 && (
                <p className="text-xs text-slate-400">
                  「＋ 選択肢追加」から候補を作成してください。
                </p>
              )}
            </div>
          </div>

          {/* 利用者がタップするUI（モバイル向け） */}
          <div className="space-y-1">
            <span className="text-xs text-slate-500">回答（タップして選択）</span>
            <div className="flex flex-wrap gap-2">
              {field.options.map((opt) => {
                if (field.type === "single") {
                  const selected = singleValue === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      className={`${pillBase} ${
                        selected ? pillSelected : pillUnselected
                      }`}
                      onClick={() => onChangeValue(field.id, opt)}
                    >
                      {opt}
                    </button>
                  );
                }

                // multi の場合
                const selected = multiValues.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    className={`${pillBase} ${
                      selected ? pillSelected : pillUnselected
                    }`}
                    onClick={() => {
                      if (selected) {
                        onChangeValue(
                          field.id,
                          multiValues.filter((v) => v !== opt)
                        );
                      } else {
                        onChangeValue(field.id, [...multiValues, opt]);
                      }
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
