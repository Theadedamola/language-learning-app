'use client';

import React, { useState, useEffect } from 'react';
import { Preferences } from '@/core/types/models';
import { getAvailableSpanishVoices } from '@/voice/webSpeechTransport';
import { X, Key, Sliders, ShieldCheck, Download, Trash2, Check, Volume2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: Preferences;
  onSavePreferences: (prefs: Partial<Preferences>) => void;
  onExportData: () => void;
  onClearData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onSavePreferences,
  onExportData,
  onClearData,
}) => {
  const [provider, setProvider] = useState(preferences.provider);
  const [groqKey, setGroqKey] = useState(preferences.groqKey || '');
  const [geminiKey, setGeminiKey] = useState(preferences.geminiKey || '');
  const [openaiKey, setOpenAIKey] = useState(preferences.openaiKey || '');
  const [deepgramKey, setDeepgramKey] = useState(preferences.deepgramKey || '');
  const [deepgramVoice, setDeepgramVoice] = useState(preferences.deepgramVoice || 'aura-2-diana-es');
  const [interests, setInterests] = useState(preferences.interests || '');
  const [preferredVoice, setPreferredVoice] = useState(preferences.preferredVoice || '');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const available = getAvailableSpanishVoices();
      setVoices(available);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSavePreferences({
      provider,
      groqKey: groqKey.trim(),
      geminiKey: geminiKey.trim(),
      openaiKey: openaiKey.trim(),
      deepgramKey: deepgramKey.trim(),
      deepgramVoice: deepgramVoice.trim(),
      interests: interests.trim(),
      preferredVoice: preferredVoice.trim(),
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 bg-black/25 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-[#FFE3CF] space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#FFE3CF]/50 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#FFF0C7] flex items-center justify-center text-[#FF8A4C]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-[#362A22] font-rounded">Sóró Settings</h3>
              <p className="text-xs text-[#735B4A]">Local settings & provider keys (BYOK)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#FFF8EE] flex items-center justify-center text-[#735B4A] hover:bg-[#FFE3CF] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6 text-left">
          {/* Mode Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#735B4A] uppercase tracking-wider">
              Voice & AI Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setProvider('free')}
                className={`cursor-pointer rounded-2xl p-4 border transition-all ${
                  provider === 'free'
                    ? 'bg-[#FFF0C7]/40 border-[#FF8A4C] ring-2 ring-[#FF8A4C]/20'
                    : 'bg-[#FFF8EE]/50 border-[#FFE3CF] hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#362A22] font-rounded">100% Free / No Cost</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#EAECD6] text-[#5A7A3A]">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-[#735B4A] mt-1">
                  Native browser voice (Web Speech API) + Groq or Gemini Flash (free tier).
                </p>
              </div>

              <div
                onClick={() => setProvider('openai')}
                className={`cursor-pointer rounded-2xl p-4 border transition-all ${
                  provider === 'openai'
                    ? 'bg-[#FFF0C7]/40 border-[#FF8A4C] ring-2 ring-[#FF8A4C]/20'
                    : 'bg-[#FFF8EE]/50 border-[#FFE3CF] hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#362A22] font-rounded">OpenAI Realtime WebRTC</span>
                </div>
                <p className="text-xs text-[#735B4A] mt-1">
                  Low-latency direct WebRTC connection with your own OpenAI API key.
                </p>
              </div>
            </div>
          </div>

          {/* Voice Selection (if using Free / Web Speech API) */}
          {provider === 'free' && voices.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#FFE3CF]/50">
              <label className="text-xs font-bold text-[#735B4A] uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-[#FF8A4C]" />
                System Spanish Voice
              </label>
              <select
                value={preferredVoice}
                onChange={(e) => setPreferredVoice(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FFF8EE]/60 border border-[#FFE3CF] focus:outline-none focus:ring-2 focus:ring-[#FF8A4C]/40 text-[#362A22]"
              >
                <option value="">Automatic (Recommended high-quality voice)</option>
                {voices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* API Keys (Stored locally on your machine) */}
          <div className="space-y-4 pt-2 border-t border-[#FFE3CF]/50">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#735B4A] uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#FF8A4C]" />
                API Keys (Stored in your browser)
              </label>
              <span className="inline-flex items-center gap-1 text-[10px] text-[#5A7A3A]">
                <ShieldCheck className="w-3 h-3" /> 100% Private
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#362A22] block mb-1">
                  Google Gemini API Key <span className="text-gray-400 font-normal">(Free at aistudio.google.com)</span>
                </label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FFF8EE]/60 border border-[#FFE3CF] focus:outline-none focus:ring-2 focus:ring-[#FF8A4C]/40 text-[#362A22]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#362A22] block mb-1">
                  Groq API Key <span className="text-gray-400 font-normal">(Free at console.groq.com)</span>
                </label>
                <input
                  type="password"
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  placeholder="gsk_..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FFF8EE]/60 border border-[#FFE3CF] focus:outline-none focus:ring-2 focus:ring-[#FF8A4C]/40 text-[#362A22]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#362A22] block mb-1">
                  OpenAI API Key <span className="text-gray-400 font-normal">(For WebRTC Realtime mode)</span>
                </label>
                <input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenAIKey(e.target.value)}
                  placeholder="sk-proj-..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FFF8EE]/60 border border-[#FFE3CF] focus:outline-none focus:ring-2 focus:ring-[#FF8A4C]/40 text-[#362A22]"
                />
              </div>

              <div className="pt-2 border-t border-[#FFE3CF]/30">
                <label className="text-xs font-semibold text-[#362A22] block mb-1">
                  Deepgram API Key <span className="text-gray-400 font-normal">(Ultra-realistic human voice &bull; Free \$200 at deepgram.com)</span>
                </label>
                <input
                  type="password"
                  value={deepgramKey}
                  onChange={(e) => setDeepgramKey(e.target.value)}
                  placeholder="Paste your Deepgram key here..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FFF8EE]/60 border border-[#FFE3CF] focus:outline-none focus:ring-2 focus:ring-[#FF8A4C]/40 text-[#362A22]"
                />
              </div>

              {deepgramKey && (
                <div>
                  <label className="text-xs font-semibold text-[#362A22] block mb-1">
                    Deepgram Spanish Voice
                  </label>
                  <select
                    value={deepgramVoice}
                    onChange={(e) => setDeepgramVoice(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FFF8EE]/60 border border-[#FFE3CF] focus:outline-none focus:ring-2 focus:ring-[#FF8A4C]/40 text-[#362A22]"
                  >
                    <option value="aura-2-diana-es">Diana (Warm, Natural Female &bull; Bilingual) [Recommended]</option>
                    <option value="aura-2-carina-es">Carina (Friendly Female &bull; Expressive)</option>
                    <option value="aura-2-selena-es">Selena (Clear Female &bull; Studio)</option>
                    <option value="aura-2-aquila-es">Aquila (Smooth Female)</option>
                    <option value="aura-2-javier-es">Javier (Warm Male &bull; Natural)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* User Interests */}
          <div className="space-y-2 pt-2 border-t border-[#FFE3CF]/50">
            <label className="text-xs font-bold text-[#735B4A] uppercase tracking-wider block">
              Your Interests & Hobbies
            </label>
            <p className="text-xs text-[#735B4A]">
              Sóró will use these topics as context to make conversations more natural.
            </p>
            <input
              type="text"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="Travel, food, indie music, literature, nature..."
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FFF8EE]/60 border border-[#FFE3CF] focus:outline-none focus:ring-2 focus:ring-[#FF8A4C]/40 text-[#362A22]"
            />
          </div>

          {/* Data Management */}
          <div className="space-y-2 pt-2 border-t border-[#FFE3CF]/50">
            <label className="text-xs font-bold text-[#735B4A] uppercase tracking-wider block">
              Data & Backup
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onExportData}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-[#FFF8EE] border border-[#FFE3CF] text-[#735B4A] hover:bg-white"
              >
                <Download className="w-3.5 h-3.5 text-[#FF8A4C]" />
                Export JSON
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to delete all history and learned vocabulary?')) {
                    onClearData();
                  }
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Data
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-[#FFE3CF]/60 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-[#735B4A] hover:bg-black/5"
            >
              Close
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold rounded-xl bg-[#362A22] text-[#FFF8EE] hover:bg-[#FF8A4C] transition-all shadow-sm"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  Saved!
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
