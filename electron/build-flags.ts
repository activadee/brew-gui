/** Compile-time `__ENABLE_AUTO_UPDATES__` define logic (see `tsup.config.ts`). */
export function compileTimeAutoUpdatesEnabled(env: {
  ENABLE_AUTO_UPDATES?: string;
}): boolean {
  return env.ENABLE_AUTO_UPDATES !== '0';
}
