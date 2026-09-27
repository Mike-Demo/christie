/**
 * Input validation shared by the editor and the MCP tool, so both reject the
 * same things with the same error codes.
 */

import { SUPPORTED_LANGUAGE, grammarFailure, type GrammarFailure } from "./contract";

export interface ValidationInput {
  text: unknown;
  language?: unknown;
  maxChars: number;
}

/** Returns a failure to hand straight back to the caller, or null when valid. */
export function validateCheckRequest(input: ValidationInput): GrammarFailure | null {
  const { text, language, maxChars } = input;

  if (typeof text !== "string") {
    return grammarFailure("invalid_input", "`text` must be a string.");
  }

  if (text.trim().length === 0) {
    return grammarFailure("invalid_input", "`text` must not be empty.");
  }

  if (text.length > maxChars) {
    return grammarFailure(
      "too_large",
      `\`text\` is ${text.length} characters; the limit is ${maxChars}.`,
    );
  }

  if (language !== undefined && language !== null) {
    if (typeof language !== "string" || language.toLowerCase().split("-")[0] !== SUPPORTED_LANGUAGE) {
      return grammarFailure(
        "unsupported_language",
        `Only "${SUPPORTED_LANGUAGE}" (English) is supported. Received "${String(language)}".`,
      );
    }
  }

  return null;
}
