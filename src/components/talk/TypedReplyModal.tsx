'use client';

import React, { useState } from 'react';
import { X, Send, MessageSquare } from 'lucide-react';

interface TypedReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (text: string) => Promise<void>;
}

export const TypedReplyModal: React.FC<TypedReplyModalProps> = ({ isOpen, onClose, onSend }) => {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    try {
      await onSend(trimmed);
      setText('');
      onClose();
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-[#FFE3CF] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#FFF0C7] flex items-center justify-center text-[#FF8A4C]">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-lg text-[#362A22] font-rounded">Type a Reply</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#FFF8EE] flex items-center justify-center text-[#735B4A] hover:bg-[#FFE3CF]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your message in Spanish (or English to ask for help)..."
            rows={4}
            className="w-full p-3.5 text-sm rounded-xl bg-[#FFF8EE]/60 border border-[#FFE3CF] focus:outline-none focus:ring-2 focus:ring-[#FF8A4C]/40 text-[#362A22] resize-none"
            autoFocus
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-[#735B4A] hover:bg-black/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!text.trim() || isSending}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#362A22] text-[#FFF8EE] hover:bg-[#FF8A4C] disabled:opacity-50 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              {isSending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
