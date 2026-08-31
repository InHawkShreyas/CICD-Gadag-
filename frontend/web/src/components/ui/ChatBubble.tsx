import { useState } from "react";
import { Check, CheckCheck, Loader2, Pencil, X } from "lucide-react";

export const ChatBubble = ({
  mine, text, time, ticks, label, avatar, editable, onSave, edited, editedTooltip, testId,
}: {
  mine: boolean;
  text: string;
  time: string;
  ticks?: "sent" | "read";
  label?: string;
  avatar?: { initials: string; colorClass: string };
  editable?: boolean;
  onSave?: (newText: string) => void | Promise<void>;
  edited?: boolean;
  editedTooltip?: string;
  testId?: string;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setDraft(text);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setDraft(text);
  };

  const saveEdit = async () => {
    if (!draft.trim() || draft.trim() === text.trim()) { setIsEditing(false); return; }
    setSaving(true);
    try {
      await onSave?.(draft.trim());
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid={testId} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
      {!mine && avatar && (
        <div className={`flex items-center justify-center flex-shrink-0 w-7 h-7 text-[9px] font-bold uppercase rounded-full shadow-sm ${avatar.colorClass}`}>
          {avatar.initials}
        </div>
      )}
      <div className="max-w-[70%] sm:max-w-[50%]">
        {label && (
          <p className={`mb-1 text-[10px] font-semibold ${mine ? "text-right text-primary" : "ml-1 text-gray-400"}`}>
            {label}
          </p>
        )}
        <div
          className={`group relative px-3 py-1.5 text-[13px] leading-snug whitespace-pre-wrap rounded-2xl shadow-sm transition-all ${mine
            ? "bg-primary text-white rounded-br-sm"
            : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm"
            }`}
        >
          {mine && editable && !isEditing && (
            <button
              onClick={startEdit}
              aria-label="Edit message"
              title="Edit message"
              data-testid={testId ? `${testId}-edit` : undefined}
              className="absolute p-1 text-white transition-opacity rounded-full opacity-0 -top-2 -left-2 bg-black/30 group-hover:opacity-100 hover:bg-black/50"
            >
              <Pencil size={11} />
            </button>
          )}

          {isEditing ? (
            <div className="space-y-1.5">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                autoFocus
                data-testid={testId ? `${testId}-edit-input` : undefined}
                className="w-full text-[13px] leading-relaxed bg-white/10 border border-white/30 rounded-lg px-2 py-1.5 text-white placeholder-white/50 focus:outline-none focus:border-white/60 resize-none"
              />
              <div className="flex items-center justify-end gap-1.5">
                <button
                  onClick={cancelEdit}
                  disabled={saving}
                  data-testid={testId ? `${testId}-edit-cancel` : undefined}
                  className="p-1 text-white transition-colors rounded-full hover:bg-black/20 disabled:opacity-50"
                  aria-label="Cancel edit"
                >
                  <X size={13} />
                </button>
                <button
                  onClick={saveEdit}
                  disabled={saving || !draft.trim()}
                  data-testid={testId ? `${testId}-edit-save` : undefined}
                  className="p-1 text-white transition-colors rounded-full hover:bg-black/20 disabled:opacity-50"
                  aria-label="Save edit"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                </button>
              </div>
            </div>
          ) : (
            <>
              {text}
              <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${mine ? "text-white/70" : "text-gray-400"}`}>
                {edited && (
                  <span title={editedTooltip} className="italic cursor-default">
                    edited
                  </span>
                )}
                <span>{time}</span>
                {mine && ticks === "read" && <CheckCheck size={13} className="text-white/80" />}
                {mine && ticks === "sent" && <Check size={13} className="text-white/80" />}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};