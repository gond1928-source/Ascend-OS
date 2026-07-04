// Thin re-export wrapper — getStreak lives in analytics-engine.ts since it
// is computed from the same session list as every other analytic. Kept as
// its own module so gamification code (achievement-engine.ts) depends on
// "the streak system" rather than reaching into analytics internals.
export { getStreak } from "@/lib/analytics-engine";
