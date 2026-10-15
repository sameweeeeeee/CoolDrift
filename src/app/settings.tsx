// Settings screen — language, display, alerts, worker mode, demo and privacy.
// Everything is saved on the phone automatically (see SettingsContext.tsx).

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import AppText from '../components/AppText';
import BigButton from '../components/BigButton';
import { useSettings, useT } from '../context/SettingsContext';
import { LANGUAGES } from '../i18n';
import { ensureNotificationPermission, sendTestReminder } from '../services/notifications';
import { clearReports } from '../services/reports';
import { colors } from '../theme';

const INTERVALS = [15, 20, 30, 45, 60]; // minutes

export default function SettingsScreen() {
  const { t } = useT();
  const { settings, update } = useSettings();
  const [notice, setNotice] = useState<string | null>(null);

  /** Turning on an alert asks for notification permission first. */
  const toggleAlert = async (key: 'highAlerts' | 'workerMode', value: boolean) => {
    update({ [key]: value });
    if (value && !(await ensureNotificationPermission())) setNotice(t('settings.notifDenied'));
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      {notice && (
        <View style={styles.notice}>
          <AppText bold>{notice}</AppText>
        </View>
      )}

      {/* ---------- Language ---------- */}
      <Section title={t('settings.language')}>
        <View style={styles.grid}>
          {LANGUAGES.map((lang) => {
            const active = settings.language === lang.code;
            return (
              <Pressable
                key={lang.code}
                onPress={() => update({ language: lang.code })}
                style={[styles.option, active && styles.optionActive]}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <AppText size="large" bold color={active ? colors.white : colors.primary} center>
                  {lang.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </Section>

      {/* ---------- Display ---------- */}
      <Section title={t('settings.display')}>
        <Toggle label={t('settings.largeText')} value={settings.largeText} onChange={(v) => update({ largeText: v })} />
        <Toggle
          label={t('settings.seniorMode')}
          description={t('settings.seniorDesc')}
          value={settings.seniorMode}
          onChange={(v) => update({ seniorMode: v })}
        />
      </Section>

      {/* ---------- Alerts ---------- */}
      <Section title={t('settings.alerts')}>
        <Toggle
          label={t('settings.highAlert')}
          description={t('settings.highAlertDesc')}
          value={settings.highAlerts}
          onChange={(v) => toggleAlert('highAlerts', v)}
        />
        <Toggle
          label={t('settings.workerMode')}
          description={t('settings.workerDesc')}
          value={settings.workerMode}
          onChange={(v) => toggleAlert('workerMode', v)}
        />
        {settings.workerMode && (
          <>
            <AppText bold>{t('settings.interval')}</AppText>
            <View style={styles.grid}>
              {INTERVALS.map((n) => {
                const active = settings.workerInterval === n;
                return (
                  <Pressable
                    key={n}
                    onPress={() => update({ workerInterval: n })}
                    style={[styles.option, styles.smallOption, active && styles.optionActive]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                  >
                    <AppText bold color={active ? colors.white : colors.primary} center>
                      {t('settings.minutes', { n })}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            <BigButton
              small
              variant="outline"
              icon="notifications"
              label={t('settings.testReminder')}
              onPress={async () => {
                if (!(await sendTestReminder())) setNotice(t('settings.notifDenied'));
              }}
            />
          </>
        )}
      </Section>

      {/* ---------- Demo ---------- */}
      <Section title={t('settings.demo')}>
        <Toggle
          label={t('settings.demoHigh')}
          description={t('settings.demoDesc')}
          value={settings.demoHigh}
          onChange={(v) => update({ demoHigh: v })}
        />
        <BigButton
          small
          variant="outline"
          icon="trash"
          label={t('settings.clearReports')}
          onPress={async () => {
            await clearReports();
            setNotice(t('settings.reportsCleared'));
          }}
        />
      </Section>

      {/* ---------- Privacy ---------- */}
      <Section title={t('settings.privacyTitle')}>
        <AppText>{t('settings.privacy')}</AppText>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText size="large" bold color={colors.primaryDark}>
        {title}
      </AppText>
      {children}
    </View>
  );
}

function Toggle(props: { label: string; description?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable style={styles.toggleRow} onPress={() => props.onChange(!props.value)} accessibilityRole="switch" accessibilityState={{ checked: props.value }}>
      <View style={{ flex: 1 }}>
        <AppText bold>{props.label}</AppText>
        {props.description && (
          <AppText size="small" color={colors.textMuted}>
            {props.description}
          </AppText>
        )}
      </View>
      {/* The whole row is the button; the switch just SHOWS on/off.
          (If both handled taps, one click on a computer would toggle twice.) */}
      <View pointerEvents="none">
        <Switch
          value={props.value}
          trackColor={{ true: colors.primary, false: '#C8D3CC' }}
          thumbColor={colors.white}
          style={{ transform: [{ scale: 1.2 }] }}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 16, paddingBottom: 40, width: '100%', maxWidth: 760, alignSelf: 'center' },
  section: { backgroundColor: colors.white, borderRadius: 16, padding: 16, gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  option: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  smallOption: { flexBasis: '28%' },
  optionActive: { backgroundColor: colors.primary },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  notice: { backgroundColor: colors.white, borderColor: colors.moderate, borderWidth: 2, borderRadius: 12, padding: 12 },
});
