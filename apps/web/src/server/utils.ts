let counter = 0;

export function generateId(prefix: string = ""): string {
  counter++;
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return prefix ? `${prefix}_${ts}${rand}${counter}` : `${ts}${rand}${counter}`;
}

export function timestamp(): string {
  return new Date().toISOString();
}


