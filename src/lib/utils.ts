type ClassValue = string | number | false | null | undefined | ClassValue[];

function collectClasses(value: ClassValue, classes: string[]) {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const item of value) collectClasses(item, classes);
    return;
  }
  classes.push(String(value));
}

export function cn(...inputs: ClassValue[]) {
  const classes: string[] = [];
  for (const input of inputs) collectClasses(input, classes);
  return classes.join(" ");
}
