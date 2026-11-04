export const PLACEHOLDER = "{{UNSUBSCRIBE_URL}}";
export const UNSUB_BASE = "https://nasirr.innergintel.org/pulse/unsubscribe/?token=";
export const LISTS = { pulse: "wants_pulse", tech: "wants_tech", wisdom: "wants_wisdom", ownyourweb: "wants_ownyourweb" } as const;
export type List = keyof typeof LISTS;
// Market Pulse callers that predate the list parameter send nothing, so a missing list means pulse. Any other value must be one of LISTS.
export const DEFAULT_LIST: List = "pulse";
export function readList(v: unknown): List | null {
  if (v === undefined || v === null) return DEFAULT_LIST;
  return typeof v === "string" && Object.hasOwn(LISTS, v) ? (v as List) : null;
}
// pulse keeps the plain issue_id so older Market Pulse logs still dedupe; other lists get their own key space
export function logKey(list: List, issueId: string) { return list === "pulse" ? issueId : `${list}:${issueId}`; }

export function timingSafeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b);
  const len = Math.max(ea.length, eb.length);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < len; i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0 && a.length > 0;
}

export function validateTemplate(html: unknown): string | null {
  if (typeof html !== "string") return "html_template must be a string";
  if (!/^<!doctype/i.test(html.trim())) return "html must start with <!DOCTYPE";
  if (html.length < 3000) return "html under 3000 chars";
  if (!html.includes("INNERG PULSE")) return "missing 'INNERG PULSE'";
  if (!html.includes(PLACEHOLDER)) return `missing ${PLACEHOLDER} placeholder`;
  if (html.split(PLACEHOLDER).join("").includes("{{")) return "template contains placeholders other than " + PLACEHOLDER;
  return null;
}

export function unsubUrl(token: string, list: List = DEFAULT_LIST) { return UNSUB_BASE + encodeURIComponent(token) + "&list=" + list; }

export function personalize(html: string, text: string, token: string, list: List = DEFAULT_LIST): { html: string; text: string } {
  if (!token) throw new Error("missing unsubscribe token");
  const url = unsubUrl(token, list);
  const h = html.split(PLACEHOLDER).join(url);
  const t = text.split(PLACEHOLDER).join(url);
  if (h.includes("{{") || t.includes("{{")) throw new Error("unresolved placeholder after substitution");
  return { html: h, text: t };
}

export function validateBody(b: any): string | null {
  if (!b || typeof b !== "object") return "invalid JSON body";
  for (const k of ["subject", "text", "issue_id"]) if (typeof b[k] !== "string" || !b[k].trim()) return `missing ${k}`;
  if (!/^[A-Za-z0-9._:-]{1,120}$/.test(b.issue_id)) return "invalid issue_id";
  if (!readList(b.list)) return "invalid list (use pulse, tech, wisdom or ownyourweb)";
  if (b.text.split(PLACEHOLDER).join("").includes("{{")) return "text contains unknown placeholder";
  return validateTemplate(b.html_template);
}
