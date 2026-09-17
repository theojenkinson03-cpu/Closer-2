/**
 * Entry point for `npm test`.
 *
 * Imports register their cases as a side effect; `runAll` executes them in
 * order and exits non-zero on the first failure so CI can gate on it.
 */

import "./scoring.test";
import "./ranks.test";
import "./dates.test";
import "./formatting.test";
import "./share.test";
import "./services.test";
import { runAll } from "./harness";

runAll()
  .then((failures) => {
    process.exit(failures === 0 ? 0 : 1);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
