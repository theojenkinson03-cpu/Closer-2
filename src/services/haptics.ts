/**
 * Haptics.
 *
 * The slider is a precision instrument, and precision instruments click. A tick
 * on every step change is what makes a drag feel like it is moving over a
 * detented dial rather than sliding on glass.
 *
 * Loaded lazily and behind try/catch: haptics are a nice-to-have that must
 * never be the reason a screen fails to render, and they do not exist on web.
 */

interface HapticsModule {
  selectionAsync(): Promise<void>;
  impactAsync(style?: unknown): Promise<void>;
  notificationAsync(type?: unknown): Promise<void>;
  ImpactFeedbackStyle?: Record<string, unknown>;
  NotificationFeedbackType?: Record<string, unknown>;
}

let cached: HapticsModule | null | undefined;

function load(): HapticsModule | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cached = require("expo-haptics") as HapticsModule;
  } catch {
    cached = null;
  }
  return cached;
}

/** One detent of the slider. */
export function selection(): void {
  try {
    void load()?.selectionAsync();
  } catch {
    // Silent by design.
  }
}

/** Locking an answer. */
export function impact(): void {
  const mod = load();
  try {
    void mod?.impactAsync(mod.ImpactFeedbackStyle?.Medium);
  } catch {
    // Silent by design.
  }
}

/** A promotion, or a bullseye. */
export function celebrate(): void {
  const mod = load();
  try {
    void mod?.notificationAsync(mod.NotificationFeedbackType?.Success);
  } catch {
    // Silent by design.
  }
}
