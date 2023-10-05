
export function hello(): string {
  return "hello world";
}

export function concat3(a: string, b: string, c?: string): string {
  if(c) return `${a} ${b} ${c}`;
  return `${a} ${b}`;
}
