
type MyObject = {
  string: string,
  nullableString: string | null,
  optionalString?: string
  undefinedString: string | undefined
  nullOrUndefinedString: string | undefined | null
}

export function test(
  myObject: MyObject,
  nullableParam: string | null,
  undefinedParam: string | undefined,
  nullOrUndefinedParam: string | undefined | null,
  unionWithNull: string | number | null,
  optionalParam?: string
): string | null {
  return "test"
}
