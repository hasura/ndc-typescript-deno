

// Named types should prevent infinite recursion in schema inference

type Foo = {
  a: number,
  b: Array<Foo>
}

export function bar(): Foo {
  return {
      a: 1,
      b: [{
        a: 2,
        b: []
      }]
  }
}
