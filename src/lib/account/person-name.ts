export class PersonName {
  constructor(private readonly value: string) {}

  initials(): string {
    const parts = this.value.trim().split(/\s+/).filter((part) => part.length > 0);
    const letters = parts.slice(0, 2).map((part) => part[0] ?? '');
    const mark = letters.join('').toLocaleUpperCase('es');
    return mark || '?';
  }
}
