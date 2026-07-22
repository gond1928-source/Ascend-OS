import { ActivityCategory } from "@/lib/tracker/types";

/**
 * types/detected-app.ts — a record of "the tracker genuinely observed and
 * classified this app", independent of Session/DistractionRecord.
 *
 * Why this exists (App Rules panel redesign): the App Rules panel needs to
 * show real, tracker-observed apps grouped by category — not a static
 * guessed list. But Session records don't store an app name (see
 * types/app-rule.ts's data-model-gap comment) and only "other"-category
 * activity becomes a DistractionRecord (session-builder.ts folds
 * "learning"/"entertainment" into a kind-only "watching" Session with no
 * per-app breakdown, and "coding" Sessions have no app name at all). None
 * of that is enough, on its own, to answer "which apps has this person's
 * coding/learning activity genuinely come from" — so this is a small,
 * dedicated, append-only detection registry: NOT duration/minutes data
 * (that's still the deferred gap), just "this app, this category, first/
 * last time the tracker classified it as such". Written by
 * lib/tracker/native-tracker.ts (see lib/detected-apps.ts), read by the
 * App Rules panel via hooks/useDetectedApps.ts.
 */
export interface DetectedApp {
  /** Matches the SAME key everything else in the tracker pipeline uses:
   * ClassifiedSnapshot.siteLabel when present, else appName — see
   * lib/app-rules.ts's normalizeAppKey / segmenter.ts's primaryKeyOf. */
  appName: string;
  /** Never "idle" — idle is not a real app-usage signal and is never
   * recorded here (see lib/detected-apps.ts's recordDetection). */
  category: Exclude<ActivityCategory, "idle">;
  firstDetectedAt: string;
  lastDetectedAt: string;
}
