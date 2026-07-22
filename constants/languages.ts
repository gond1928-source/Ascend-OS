export interface LanguageMeta {
  name: string;
  color: string;
}

// GitHub-style language colors, used consistently across every chart
export const LANGUAGES: LanguageMeta[] = [
  { name: "Python", color: "#3ddc97" },
  { name: "JavaScript", color: "#f5d33d" },
  { name: "TypeScript", color: "#4dc8f5" },
  { name: "Rust", color: "#f25f7a" },
  { name: "Go", color: "#5ad4e6" },
  { name: "C++", color: "#a78bfa" },
  { name: "C#", color: "#9b7ede" },
  { name: "Java", color: "#f5a623" },
  { name: "React", color: "#61dafb" },
  { name: "Vue", color: "#42b883" },
  { name: "Svelte", color: "#ff6b47" },
  { name: "Kotlin", color: "#c97ef0" },
  { name: "Swift", color: "#f0805a" },
  { name: "Dart", color: "#3fc5ad" },
  { name: "Ruby", color: "#e0584f" },
  { name: "PHP", color: "#8a8fd6" },
  { name: "HTML", color: "#e2733c" },
  { name: "CSS", color: "#5b8def" },
  { name: "SQL", color: "#5dc9a8" },
  { name: "Other", color: "#838383" },
];

export function languageColor(name: string): string {
  return LANGUAGES.find((l) => l.name === name)?.color ?? "#7c6cf6";
}
