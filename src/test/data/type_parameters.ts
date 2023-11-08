

// This tests that type parameters for object don't short circuit with a scalar

type Foo = {
  a: number,
  b: string
}

type Bar<X> = {
  x: number,
  y: X
}

// Foo and Bar should both have `object_types` defined.
export function bar(): Bar<Foo> {
  return {
    x: 1,
    y: {
      a: 2,
      b: 'hello'
    }
  }
}
