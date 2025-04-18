export function validate<T>(value: unknown, schema: object): value is T {
  // This needs to be moved to JavaScript (using AJV) _AND_
  // removed in favor of using SQLite for the game identity database.
  return true;
}
