/**
 * A test harness in sixty lines.
 *
 * The logic worth testing in CLOSER is pure TypeScript with no React, no native
 * modules and no network, so it needs a runner, an assertion or two, and
 * nothing else. `tsx tests/run.ts` executes the lot in about a second with no
 * build step and no framework to keep current.
 */

export interface TestCase {
  readonly name: string;
  readonly fn: () => void | Promise<void>;
}

const cases: TestCase[] = [];
let currentSuite = "";

export function suite(name: string, register: () => void): void {
  currentSuite = name;
  register();
  currentSuite = "";
}

export function test(name: string, fn: () => void | Promise<void>): void {
  cases.push({ name: currentSuite ? `${currentSuite} > ${name}` : name, fn });
}

export class AssertionError extends Error {}

function fail(message: string): never {
  throw new AssertionError(message);
}

export function assert(condition: unknown, message = "expected value to be truthy"): void {
  if (!condition) fail(message);
}

export function equal<T>(actual: T, expected: T, message?: string): void {
  if (!Object.is(actual, expected)) {
    fail(message ?? `expected ${String(expected)}, received ${String(actual)}`);
  }
}

export function notEqual<T>(actual: T, expected: T, message?: string): void {
  if (Object.is(actual, expected)) {
    fail(message ?? `expected something other than ${String(expected)}`);
  }
}

export function deepEqual(actual: unknown, expected: unknown, message?: string): void {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) fail(message ?? `expected ${b}, received ${a}`);
}

export function close(actual: number, expected: number, tolerance = 1e-9, message?: string): void {
  if (Math.abs(actual - expected) > tolerance) {
    fail(message ?? `expected ${expected} +/- ${tolerance}, received ${actual}`);
  }
}

export function isTrue(value: boolean, message?: string): void {
  equal(value, true, message ?? "expected true");
}

export function isFalse(value: boolean, message?: string): void {
  equal(value, false, message ?? "expected false");
}

export async function throwsAsync(
  fn: () => Promise<unknown>,
  predicate?: (error: unknown) => boolean,
  message = "expected the call to reject",
): Promise<void> {
  try {
    await fn();
  } catch (error) {
    if (predicate && !predicate(error)) fail(`${message}: rejected with an unexpected error`);
    return;
  }
  fail(message);
}

export async function runAll(): Promise<number> {
  const failures: { name: string; error: unknown }[] = [];
  const started = Date.now();

  for (const testCase of cases) {
    try {
      await testCase.fn();
      process.stdout.write(".");
    } catch (error) {
      failures.push({ name: testCase.name, error });
      process.stdout.write("x");
    }
  }

  const elapsed = Date.now() - started;
  process.stdout.write("\n\n");

  for (const failure of failures) {
    const detail = failure.error instanceof Error ? failure.error.message : String(failure.error);
    console.error(`FAIL  ${failure.name}\n      ${detail}`);
    if (failure.error instanceof Error && !(failure.error instanceof AssertionError)) {
      console.error(failure.error.stack?.split("\n").slice(1, 4).join("\n") ?? "");
    }
  }

  const passed = cases.length - failures.length;
  console.log(
    `${failures.length === 0 ? "PASS" : "FAIL"}  ${passed}/${cases.length} tests in ${elapsed}ms`,
  );
  return failures.length;
}
