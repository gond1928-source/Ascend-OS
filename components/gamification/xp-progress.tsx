import { Progress } from "@/components/ui/progress";

export function XPProgress({ pct }: { pct: number }) {
  return <Progress value={pct} colorClassName="bg-accent-violet" />;
}
