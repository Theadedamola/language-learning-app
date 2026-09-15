'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/ui/Header';
import { TalkView } from '@/components/talk/TalkView';
import { ThemesView } from '@/components/themes/ThemesView';
import { WordsView } from '@/components/words/WordsView';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { ConversationTheme, spanishModule } from '@/core/teaching/spanish';
import { Preferences, SessionRecord } from '@/core/types/models';
import { LearnerState } from '@/core/types/vocabulary';
import { PreferenceStore } from '@/storage/preferenceStore';
import { StorageService } from '@/storage/db';
import { SpacedRepetition } from '@/core/learning/spacedRepetition';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'talk' | 'themes' | 'words'>('talk');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(PreferenceStore.get());
  const [selectedTheme, setSelectedTheme] = useState<ConversationTheme | null>(spanishModule.themes[0]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [learner, setLearner] = useState<LearnerState>({
    challenge: 0,
    observationCount: 0,
    nextGoal: 'Empieza saludando amablemente para comenzar tu práctica en español.',
    capabilities: [],
    words: [],
  });

  // Recompute learner state whenever sessions change
  useEffect(() => {
    const projected = SpacedRepetition.project(sessions, 'es');
    setLearner(projected);
  }, [sessions]);

  // Load preferences and initial sessions on mount
  useEffect(() => {
    const prefs = PreferenceStore.get();
    setPreferences(prefs);

    StorageService.getAllSessions('es').then((loaded) => {
      setSessions(loaded);
    });
  }, []);

  // When a session is saved or updated
  const handleSessionUpdated = useCallback((updated: SessionRecord) => {
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === updated.id);
      return idx >= 0 ? prev.map((s, i) => (i === idx ? updated : s)) : [...prev, updated];
    });
  }, []);

  const handleSavePreferences = (newPrefs: Partial<Preferences>) => {
    const updated = PreferenceStore.set(newPrefs);
    setPreferences(updated);
  };

  const handleSelectTheme = (theme: ConversationTheme) => {
    setSelectedTheme(theme);
    setActiveTab('talk');
  };

  const handleExportData = () => {
    const backup = {
      app: 'Sóró',
      version: 1,
      exportedAt: new Date().toISOString(),
      preferences,
      sessions,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soro_spanish_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearData = async () => {
    await StorageService.clearAllSessions();
    setSessions([]);
    setIsSettingsOpen(false);
  };

  const hasApiKey = Boolean(
    preferences.groqKey || preferences.geminiKey || preferences.openaiKey
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF8EE]">
      {/* Top Brand & Navigation Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        wordCount={learner.words.length}
        hasApiKey={hasApiKey}
      />

      {/* Main Content Areas */}
      <main className="flex-1">
        {activeTab === 'talk' && (
          <TalkView
            theme={selectedTheme}
            preferences={preferences}
            learner={learner}
            onSessionUpdated={handleSessionUpdated}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}

        {activeTab === 'themes' && (
          <ThemesView
            selectedTheme={selectedTheme}
            onSelectTheme={handleSelectTheme}
          />
        )}

        {activeTab === 'words' && (
          <WordsView learner={learner} />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        preferences={preferences}
        onSavePreferences={handleSavePreferences}
        onExportData={handleExportData}
        onClearData={handleClearData}
      />
    </div>
  );
}
