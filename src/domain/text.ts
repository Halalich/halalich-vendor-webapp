/** Uppercases the first letter and leaves the rest of the input untouched. */
export function capitalizeFirstLetter(input: string | null | undefined): string {
  if (input == null || input === '') return input ?? '';
  return input.substring(0, 1).toUpperCase() + input.substring(1);
}

export function isPickup(flag: string | boolean | null | undefined): boolean {
  if (typeof flag === 'boolean') return flag;
  return String(flag ?? '').toLowerCase() === 'true';
}
