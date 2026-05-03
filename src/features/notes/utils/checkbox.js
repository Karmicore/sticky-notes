export const CHECKBOX_RE = /^([☐☑☒]) /;
export const CHECKBOX_PREFIX = "☐ ";
export const CB_LEN = CHECKBOX_PREFIX.length;
export const CB_NEXT = { "☐": "☒", "☒": "☑", "☑": "☐" };
