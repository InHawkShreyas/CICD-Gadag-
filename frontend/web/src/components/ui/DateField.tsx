import { useState, useEffect, useRef } from "react";
import { Calendar } from "lucide-react";

type DateFieldProps = {
  label: string;
  value: string;      // ISO yyyy-mm-dd, same contract as a native <input type="date">
  onChange: (v: string) => void;
  testId?: string;
};

/**
 * A dd/mm/yyyy date field that stays dd/mm/yyyy everywhere, on every
 * machine — unlike a native <input type="date">, whose displayed text is
 * rendered by the browser/OS locale and can silently show as mm/dd/yyyy or
 * dd-mm-yyyy depending on the viewer's system settings.
 *
 * - Typing is validated digit-by-digit: an impossible day/month digit (e.g.
 *   typing "4" as the first day digit, or "3" as the first month digit) is
 *   rejected immediately rather than only being caught once all 8 digits
 *   are in.
 * - A calendar icon still opens the native picker (via `.showPicker()`) for
 *   anyone who prefers clicking a date over typing one.
 * - `value`/`onChange` keep the same ISO yyyy-mm-dd contract as a regular
 *   <input type="date">, so this drops in anywhere one was used.
 */
export default function DateField({ label, value, onChange, testId }: DateFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(value ? formatDDMMYYYY(value) : "");

  // Keep the typed text in sync whenever value changes from outside typing
  // (native picker, form reset, editing an existing record).
  useEffect(() => {
    setText(value ? formatDDMMYYYY(value) : "");
  }, [value]);

  const openPicker = () => {
    const el = inputRef.current;
    if (!el) return;
    if (typeof (el as any).showPicker === "function") {
      (el as any).showPicker();
    } else {
      el.focus();
    }
  };

  const handleTextChange = (raw: string) => {
    const typedDigits = raw.replace(/\D/g, "").slice(0, 8);

    // Validate digit-by-digit as they're typed, so an impossible digit is
    // rejected on the keystroke it appears, not after the fact.
    let digits = "";
    for (const digit of typedDigits) {
      const next = digits + digit;
      if (isPlausiblePrefix(next)) {
        digits = next;
      }
      // else: drop this digit, keep what we had (e.g. typing "4" as the
      // first day digit is simply ignored — there's no valid day starting with 4).
    }

    let formatted = digits;
    if (digits.length > 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    } else if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    setText(formatted);

    if (digits.length === 8) {
      const day = Number(digits.slice(0, 2));
      const month = Number(digits.slice(2, 4));
      const year = Number(digits.slice(4));
      const isRealCalendarDate =
        month >= 1 && month <= 12 && day >= 1 && day <= new Date(year, month, 0).getDate();
      if (isRealCalendarDate) {
        onChange(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
      }
      // A structurally valid but impossible date (e.g. 31/02/2026) is left
      // as-is in the text field without pushing it to onChange, so the
      // person can see and correct exactly what they typed.
    }
  };

  return (
    <label className="block text-sm">
      <span className="font-medium text-gray-700">{label}</span>
      <div className="relative mt-1">
        <input
          type="text"
          inputMode="numeric"
          value={text}
          placeholder="dd/mm/yyyy"
          onChange={(e) => handleTextChange(e.target.value)}
          className="w-full py-2 pl-3 text-sm bg-white border border-gray-200 rounded-lg pr-9 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="button"
          onClick={openPicker}
          tabIndex={-1}
          aria-label="Open calendar"
          className="absolute text-gray-400 -translate-y-1/2 right-2 top-1/2 hover:text-gray-600"
        >
          <Calendar size={15} />
        </button>
        <input
          ref={inputRef}
          type="date"
          data-testid={testId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
    </label>
  );
}

/**
 * Whether a partial digit string (1-8 digits, ddmmyyyy order) is still a
 * possible prefix of a real date. Only checks what's structurally knowable
 * from the digits typed so far — day/month range bounds — not the full
 * calendar validity (e.g. Feb 30), which is checked once all 8 digits exist.
 */
function isPlausiblePrefix(digits: string): boolean {
  const d1 = digits[0];
  const d2 = digits[1];
  const m1 = digits[2];
  const m2 = digits[3];

  // Day: first digit 0-3; if first digit is 3, second digit must be 0 or 1;
  // "00" is never a valid day.
  if (d1 && !/[0-3]/.test(d1)) return false;
  if (d1 === "3" && d2 && !/[01]/.test(d2)) return false;
  if (d1 === "0" && d2 === "0") return false;

  // Month: first digit 0-1; if first digit is 1, second digit must be 0-2;
  // "00" is never a valid month.
  if (m1 && !/[01]/.test(m1)) return false;
  if (m1 === "1" && m2 && !/[0-2]/.test(m2)) return false;
  if (m1 === "0" && m2 === "0") return false;

  return true;
}

function formatDDMMYYYY(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}