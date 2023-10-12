
import { Hash, encode } from "https://deno.land/x/checksum@1.2.0/mod.ts";

type Result = {
  num: number,
  str: string,
  bod: string
}

export async function complex(a: number, b: number, c?: string): Promise<Result> {
  const num = a + b;
  const msg = `${c || 'Addition'}: ${num}`;
  const hash = new Hash("md5").digest(encode(msg)).hex();
  const str = `Yo: ${msg} - ${hash}`;
  const res = await fetch('https://httpbin.org/get');
  const bod = await res.text();

  return {
    num,
    str,
    bod
  }
}