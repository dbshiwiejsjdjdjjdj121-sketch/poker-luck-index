export function validEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && /^[^\s<>"@]+@[^\s<>"@]+\.[^\s<>"@]+$/.test(value);
}
export function publicEmailError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/^Please wait \d+s before requesting another code\.$/.test(message) || message === "Too many incorrect codes. Request a new one and try again.") return { error: message, status: 429 };
  if (["Request a fresh verification code before continuing.","This verification code has expired. Request a fresh one.","That code is incorrect. Try again."].includes(message)) return { error: message, status: 400 };
  return { error: "Email sign-in is temporarily unavailable. Please try again shortly.", status: 503 };
}
