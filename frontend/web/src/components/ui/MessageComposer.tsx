import { Loader2, Send } from "lucide-react";

export const MessageComposer = ({
  value,
  onChange,
  onSend,
  sending,
  placeholder,
  inputTestId,
  sendTestId,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
  placeholder: string;
  inputTestId?: string;
  sendTestId?: string;
}) => (
  <div className="flex items-end gap-2">
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onSend();
        }
      }}
      placeholder={placeholder}
      rows={2}
      data-testid={inputTestId}
      className="flex-1 resize-none px-3.5 py-2.5 text-sm rounded-2xl border border-gray-200 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
    />
    <button
      onClick={onSend}
      disabled={sending || !value.trim()}
      data-testid={sendTestId}
      className="inline-flex items-center justify-center flex-shrink-0 w-10 h-10 text-white transition-colors rounded-full shadow-sm bg-primary hover:bg-primary/90 disabled:opacity-50"
    >
      {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
    </button>
  </div>
);
