import React from 'react';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { Platform } from 'react-native';

import i18n from '@/i18n';

import { UnreadWidget } from './UnreadWidget';
import { loadWidgetData } from './loadUnreadSummary';
import { buildWidgetContent } from './widgetContent';

export const UNREAD_WIDGET_NAME = 'UnreadMessages';

/** Builds the widget with fresh data; shared by the task handler and manual refreshes. */
export const renderUnreadWidget = async () => {
  const { summary } = await loadWidgetData();
  return React.createElement(UnreadWidget, {
    content: buildWidgetContent(summary),
    appName: i18n.t('WIDGET.NAME'),
  });
};

/** Asks Android to redraw every placed widget. Safe to call when none is placed. */
export const refreshUnreadWidget = async (): Promise<void> => {
  if (Platform.OS !== 'android') {
    return;
  }
  try {
    await requestWidgetUpdate({
      widgetName: UNREAD_WIDGET_NAME,
      renderWidget: renderUnreadWidget,
      widgetNotFound: () => {},
    });
  } catch {
    // The widget is a convenience; a failed refresh must never affect the app.
  }
};
