// Ask screen — a simple chat. Answers come from rules in src/services/chatbot.ts
// using the live heat data. Big "quick question" buttons help users who don't want to type.
// Tap any bot message to hear it read aloud.

import React, { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../../components/AppText';
import { useHeat } from '../../context/HeatContext';
import { useSettings, useT } from '../../context/SettingsContext';
import { answer } from '../../services/chatbot';
import { speak } from '../../services/speech';
import { colors, fontSize } from '../../theme';
import { useIsDesktop } from '../../utils/useIsDesktop';
import TabBarSafeArea from '../../components/ui/TabBarSafeArea';

type Message = { id: string; from: 'user' | 'bot'; text: string };

export default function ChatScreen() {
  const { t, language } = useT();
  const { settings, textScale } = useSettings();
  const heat = useHeat();
  const isDesktop = useIsDesktop(); // computer: show all quick questions, no side-scrolling
  const listRef = useRef<FlatList<Message>>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  const ask = (question: string) => {
    const q = question.trim();
    if (!q) return;
    const reply = answer(q, heat);
    setMessages((m) => [
      ...m,
      { id: `${Date.now()}-u`, from: 'user', text: q },
      { id: `${Date.now()}-b`, from: 'bot', text: reply },
    ]);
    setInput('');
    if (settings.seniorMode) speak(reply, language); // seniors hear every answer
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const quick = ['safe', 'nearest', 'temp', 'tips'].map((k) => t(`chat.q.${k}`));

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.messages}
        ListHeaderComponent={<Bubble from="bot" text={t('chat.welcome')} onPress={() => speak(t('chat.welcome'), language)} />}
        renderItem={({ item }) => (
          <Bubble from={item.from} text={item.text} onPress={item.from === 'bot' ? () => speak(item.text, language) : undefined} />
        )}
      />

      {/* Quick question buttons */}
      <ScrollView
        horizontal={!isDesktop}
        style={styles.quickBar}
        contentContainerStyle={[styles.quickList, isDesktop && styles.quickWrap]}
        showsHorizontalScrollIndicator={false}
      >
        {quick.map((q) => (
          <Pressable key={q} onPress={() => ask(q)} style={styles.quick} accessibilityRole="button">
            <AppText bold color={colors.primary}>
              {q}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>

      {/* Typing box */}
      <TabBarSafeArea style={[styles.inputRow, styles.centred]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={t('chat.placeholder')}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { fontSize: fontSize.body * textScale }]}
          onSubmitEditing={() => ask(input)}
          returnKeyType="send"
          accessibilityLabel={t('chat.placeholder')}
        />
        <Pressable onPress={() => ask(input)} style={styles.send} accessibilityRole="button" accessibilityLabel={t('chat.send')}>
          <Ionicons name="send" size={26} color={colors.white} />
        </Pressable>
      </TabBarSafeArea>
    </KeyboardAvoidingView>
  );
}

function Bubble({ from, text, onPress }: { from: 'user' | 'bot'; text: string; onPress?: () => void }) {
  const isBot = from === 'bot';
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.bubble, isBot ? styles.bot : styles.user]}>
      <AppText color={isBot ? colors.text : colors.white}>{text}</AppText>
      {isBot && (
        <View style={{ alignSelf: 'flex-end' }}>
          <Ionicons name="volume-medium" size={20} color={colors.primary} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // On big computer screens, keep the chat in a readable column in the middle.
  messages: { padding: 14, gap: 10, width: '100%', maxWidth: 900, alignSelf: 'center' },
  centred: { width: '100%', maxWidth: 900, alignSelf: 'center' },
  bubble: { maxWidth: '88%', borderRadius: 16, padding: 12, gap: 4 },
  bot: { alignSelf: 'flex-start', backgroundColor: colors.white, borderWidth: 2, borderColor: colors.border },
  user: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  quickBar: { flexGrow: 0, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white },
  quickList: { gap: 8, padding: 10 },
  quickWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  quick: { borderWidth: 2, borderColor: colors.primary, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.primaryLight },
  inputRow: { flexDirection: 'row', gap: 8, padding: 10, backgroundColor: colors.white },
  input: { flex: 1, minHeight: 52, borderWidth: 2, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, color: colors.text },
  send: { width: 56, height: 52, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
