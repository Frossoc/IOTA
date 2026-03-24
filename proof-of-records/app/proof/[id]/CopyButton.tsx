"use client";

type CopyButtonProps = {
  value: string;
  label: string;
};

export default function CopyButton({ value, label }: CopyButtonProps) {
  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // no-op for unsupported clipboard contexts
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      style={{
        borderRadius: 8,
        border: "1px solid #4b5563",
        background: "#e5e7eb",
        color: "#000000",
        padding: "4px 8px",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
      }}
      aria-label={`Copy ${label}`}
    >
      Copy
    </button>
  );
}
