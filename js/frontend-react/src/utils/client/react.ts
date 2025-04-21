export function classNames(...cs: string[]) {
  return cs.filter(Boolean).join(" ");
}
