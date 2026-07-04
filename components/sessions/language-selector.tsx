"use client";
import { LANGUAGES } from "@/constants/languages";

export function LanguageSelector({ value, onChange }: { value: string; onChange: (lang: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-base-600 bg-base-800 px-3 py-2 text-sm text-ink-50"
    >
      {LANGUAGES.map((l) => (
        <option key={l.name} value={l.name}>{l.name}</option>
      ))}
    </select>
  );
}
