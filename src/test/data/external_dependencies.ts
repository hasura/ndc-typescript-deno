
import * as base64 from "https://denopkg.com/chiefbiiko/base64@v0.2.1/mod.ts";
import * as emojify from "npm:node-emoji@2.1";

export function test_deps(s: string): string {
  const b64 = base64.fromUint8Array(new TextEncoder().encode(s));
  const emo = emojify.emojify(":t-rex: :heart: NPM");
  return `${b64} ${emo}`;
}