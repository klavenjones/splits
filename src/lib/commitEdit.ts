/**
 * Whether a field's typed text still has to be reported: it differs from the saved
 * value and from what was last reported (blur, keyboard return and unmount can all
 * fire for the same edit).
 */
export const shouldCommit = (text: string, value: string, lastCommitted: string | null) =>
  text !== value && text !== lastCommitted;
