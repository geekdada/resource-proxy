export const assertNever = (value: never): never => {
  throw new Error(`Unexpected value: ${value}`)
}
