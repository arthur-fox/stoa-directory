/** Ensure a URL has a protocol so browsers don't treat it as a relative path. */
export function safeUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}
