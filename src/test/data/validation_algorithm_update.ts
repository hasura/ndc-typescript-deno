
// Placeholder index.ts to allow CI to run against functions volume

type Bar = {
  test: string
}

type GenericBar<T> = {
  data: T
}

interface IThing {
  prop: string
}

interface IGenericThing<T> {
  data: T
}

type IntersectionObject = { wow: string } & Bar

type GenericIntersectionObject<T> = { data: T } & Bar

type AliasedString = string;

type GenericScalar<T> = GenericScalar2<T>
type GenericScalar2<T> = T

export function bar(
  string: string, 
  aliasedString: AliasedString,
  genericScalar: GenericScalar<string>,
  array: string[], 
  promise: Promise<string>, 
  anonObj: {a: number, b: string}, 
  aliasedObj: Bar, 
  genericAliasedObj: GenericBar<string>, 
  interfce: IThing, 
  genericInterface: IGenericThing<string>, 
  aliasedIntersectionObj: IntersectionObject, 
  anonIntersectionObj: {num:number} & Bar,
  genericIntersectionObj: GenericIntersectionObject<string>,
  ): string {
  return 'hello';
}
