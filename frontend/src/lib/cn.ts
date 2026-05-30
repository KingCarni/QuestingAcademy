export function cn(...args: (string | undefined | false | null | Record<string, boolean>)[]) {
  const out: string[] = [];
  for (const a of args) {
    if (!a) continue;
    if (typeof a === "string") out.push(a);
    else if (typeof a === "object") {
      for (const k of Object.keys(a)) if (a[k]) out.push(k);
    }
  }
  return out.join(" ");
}
