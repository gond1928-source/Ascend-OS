export const CHART_GRID_COLOR = "#1b2230";
export const CHART_AXIS_COLOR = "#717a92";
/**
 * Semantic status colors — pinned globally, NOT theme-reactive.
 *
 * These represent activity/monitoring meaning (coding, learning, warnings,
 * errors) and must stay recognizable across every theme (Dark, Glass, and
 * any future theme). They are the single source of truth for this
 * meaning — chart components, session cards, and monitoring badges all
 * import from here rather than re-declaring their own hex values, so
 * there is exactly one place to fix if a meaning ever needs to change.
 *
 * Do NOT wire these to CSS theme variables (--accent-*) — that's what
 * caused WATCHING_COLOR to drift to violet instead of blue previously.
 */
export const CODING_COLOR   = "#3ddc97"; // green — coding, typing detected, success
export const LEARNING_COLOR = "#4dc8f5"; // blue — learning / watching
export const WARNING_COLOR  = "#f5b94d"; // amber — caution
export const ERROR_COLOR    = "#f25f7a"; // rose — errors, streak broken

/** @deprecated use LEARNING_COLOR — kept so existing imports don't break */
export const WATCHING_COLOR = LEARNING_COLOR;
