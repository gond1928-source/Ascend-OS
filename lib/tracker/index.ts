export type {
  WindowSnapshot,
  ClassifiedSnapshot,
  ActivitySegment,
  ActivityCategory,
  TrackerConfig,
  Platform,
  SegmentMetadata,
} from "./types";
export { DEFAULT_TRACKER_CONFIG } from "./types";
export { classifySnapshot, isCodingApp, isBrowserApp } from "./classifier";
export { buildSegments } from "./segmenter";
export { segmentsToSessions } from "./session-builder";
export type { BuildResult } from "./session-builder";
export { NativeTracker, getTracker } from "./native-tracker";
export type { TrackerStatus, TrackerState } from "./native-tracker";
