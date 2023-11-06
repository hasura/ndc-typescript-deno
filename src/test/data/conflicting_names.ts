
import * as dep from './conflicting_names_dep.ts';

type Foo = {
  x: boolean,
  y: dep.Foo
}

export function foo(): Foo {
  return {
    x: true,
    y: {
      a: 'hello',
      b: 33
    }
  }
}
