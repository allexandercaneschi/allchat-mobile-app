import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import type { WidgetContent } from './widgetContent';

// Brand colours of the app's dark theme.
const BACKGROUND = '#111113';
const SURFACE = '#1C1C1F';
const ACCENT = '#35A8E0';
const TEXT = '#FFFFFF';
const TEXT_MUTED = '#9A9AA2';

export const NEW_CONVERSATION_URI = 'allchat://new-conversation';

interface UnreadWidgetProps {
  content: WidgetContent;
  appName: string;
}

/**
 * Home-screen widget. It deliberately shows only counts: the widget is visible while the
 * app is locked by biometrics, so no customer name or message text may appear here.
 */
export const UnreadWidget = ({ content, appName }: UnreadWidgetProps) => (
  <FlexWidget
    clickAction="OPEN_APP"
    style={{
      height: 'match_parent',
      width: 'match_parent',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: BACKGROUND,
      borderRadius: 24,
      padding: 14,
    }}>
    <FlexWidget style={{ flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
      <TextWidget
        text={appName}
        style={{ fontSize: 12, color: ACCENT, fontWeight: '700', letterSpacing: 1 }}
      />
      {content.count !== null ? (
        <TextWidget
          text={content.count}
          style={{
            fontSize: 32,
            color: content.highlight ? ACCENT : TEXT,
            fontWeight: '700',
          }}
        />
      ) : null}
      <TextWidget
        text={content.headline}
        maxLines={2}
        style={{ fontSize: 14, color: TEXT, fontWeight: '600' }}
      />
      {content.subtitle ? (
        <TextWidget
          text={content.subtitle}
          maxLines={1}
          style={{ fontSize: 12, color: TEXT_MUTED }}
        />
      ) : null}
    </FlexWidget>
    {content.showNewConversation ? (
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: NEW_CONVERSATION_URI }}
        accessibilityLabel="+"
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: SURFACE,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <TextWidget text="+" style={{ fontSize: 28, color: ACCENT, fontWeight: '700' }} />
      </FlexWidget>
    ) : null}
  </FlexWidget>
);
