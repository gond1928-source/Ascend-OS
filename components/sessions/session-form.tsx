"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LanguageSelector } from "./language-selector";
import { SessionDraft } from "@/types/session";

// Manual session logging — posts to /api/sessions. Wired to Prisma once
// the database layer lands; for now the POST handler just echoes the draft.
export function SessionForm({ onSubmit }: { onSubmit: (draft: SessionDraft) => void }) {
  const [language, setLanguage] = useState("Python");
  const [kind, setKind] = useState<"coding" | "watching">("coding");
  const [minutes, setMinutes] = useState(30);

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ language, kind, durationMinutes: minutes });
      }}
    >
      <LanguageSelector value={language} onChange={setLanguage} />
      <div className="flex gap-2">
        <Button type="button" variant={kind === "coding" ? "primary" : "outline"} onClick={() => setKind("coding")} className="flex-1">
          Coding
        </Button>
        <Button type="button" variant={kind === "watching" ? "primary" : "outline"} onClick={() => setKind("watching")} className="flex-1">
          Watching
        </Button>
      </div>
      <Input type="number" min={1} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} placeholder="Minutes" />
      <Button type="submit" className="w-full">Log session</Button>
    </form>
  );
}
