// Pure library logic. Access is still decided by the authenticated server.
export const SHELVES = [
  { id: "student", name: "Student shelf", note: "Grades 3 to 12" },
  { id: "parent", name: "Parent shelf", note: "For parents and guardians" },
  { id: "everyone", name: "Everyone shelf", note: "For the whole family" },
];
export const TYPES = { book: "Book", video: "Video", article: "Article", tool: "Free tool" };
const ROLE_SHELVES = {
  child: ["student", "everyone"],
  parent: ["parent", "everyone"],
  family: ["student", "parent", "everyone"],
};

// role: "child" | "parent" | "family" when the server sends it.
// A paid member with no role yet sees every shelf until roles exist in the backend.
// A free INNERG ID holder sees the Everyone shelf only.
export function shelvesFor({ accessTier, memberRole } = {}) {
  if (!accessTier) return [];
  if (accessTier === "free") return ["everyone"];
  return ROLE_SHELVES[memberRole] ?? ["student", "parent", "everyone"];
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function renderLibrary(items, shelfIds) {
  return SHELVES.filter(s => shelfIds.includes(s.id)).map(s => {
    const cards = items.filter(i => i.shelf === s.id && /^https:\/\//.test(i.url)).map(i =>
      `<article class="lib-item" data-type="${esc(i.type)}"><p class="lib-type">${esc(TYPES[i.type] ?? i.type)}</p><h3>${esc(i.title)}</h3><p class="lib-creator">${esc(i.creator)}</p><p class="lib-why">${esc(i.why)}</p><a class="lib-open" href="${esc(i.url)}" target="_blank" rel="noopener">Open ${esc((TYPES[i.type] ?? "item").toLowerCase())}</a></article>`).join("");
    return `<section class="shelf" data-shelf="${s.id}" aria-labelledby="shelf-${s.id}"><div class="shelf-head"><h2 id="shelf-${s.id}">${esc(s.name)}</h2><p class="eyebrow">${esc(s.note)}</p></div><div class="shelf-items">${cards}</div></section>`;
  }).join("");
}
