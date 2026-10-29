"use client";

import { Select } from "@/components/ui";
import { POSITIONS } from "@/lib/labels";

/** Function from the fixed list; an older free text stays selectable until it is changed. */
export function PositionSelect({ value, onChange, ...rest }: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange"> & { value: string; onChange: (v: string) => void }) {
  const list = value && !POSITIONS.includes(value) ? [value, ...POSITIONS] : POSITIONS;
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} {...rest}>
      {!value && <option value="">Funktion wählen</option>}
      {list.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </Select>
  );
}
