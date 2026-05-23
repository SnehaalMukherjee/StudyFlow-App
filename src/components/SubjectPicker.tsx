import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSubjectNames } from "@/hooks/use-subjects";

const CUSTOM = "__custom__";

interface SubjectPickerProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function SubjectPicker({
  id = "subject",
  label = "Subject",
  value,
  onChange,
  disabled,
  placeholder = "Choose or type a subject",
}: SubjectPickerProps) {
  const { names, loading } = useSubjectNames();
  const inList = names.includes(value);
  const [mode, setMode] = useState<"list" | "custom">(
    value && !inList && value !== "General study" ? "custom" : "list",
  );

  useEffect(() => {
    if (value && names.length > 0 && !names.includes(value) && value !== "General study") {
      setMode("custom");
    }
  }, [value, names]);

  const selectValue = mode === "custom" ? CUSTOM : value || names[0] || CUSTOM;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {loading ? (
        <Input disabled placeholder="Loading subjects…" />
      ) : names.length === 0 ? (
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
      ) : (
        <>
          <Select
            value={selectValue}
            onValueChange={(v) => {
              if (v === CUSTOM) {
                setMode("custom");
                if (inList) onChange("");
              } else {
                setMode("list");
                onChange(v);
              }
            }}
            disabled={disabled}
          >
            <SelectTrigger id={id}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {names.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
              <SelectItem value={CUSTOM}>Other (type custom)…</SelectItem>
            </SelectContent>
          </Select>
          {mode === "custom" && (
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Enter subject name"
              disabled={disabled}
            />
          )}
        </>
      )}
      {names.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Subjects from your <span className="text-primary">Subjects</span> page, or enter a custom name.
        </p>
      )}
    </div>
  );
}
