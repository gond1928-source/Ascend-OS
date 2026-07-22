/**
 * constants/reflection-prompts.ts — today's reflection prompt(s).
 *
 * A plain array so this can grow into a genuinely rotating/multi-prompt
 * "small set" later (per the phase brief) without any shape change
 * elsewhere — hooks/useReflection.ts already treats "today's prompts" as
 * "every prompt in this list not yet answered for today's date". Ships
 * with exactly one.
 */

export interface ReflectionPrompt {
  id: string;
  question: string;
}

export const REFLECTION_PROMPTS: ReflectionPrompt[] = [
  { id: "tried_something_new", question: "Did you try something new today?" },
];
