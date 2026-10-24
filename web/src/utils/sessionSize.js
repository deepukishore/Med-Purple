export function sessionSize(value) {
  const count = Number(value);
  return [3, 5, 10].includes(count) ? count : 50;
}
