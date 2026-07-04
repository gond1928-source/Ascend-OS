export interface TimerState {
  isRunning: boolean;
  elapsedSeconds: number;
  language: string;
  kind: "coding" | "watching";
}
