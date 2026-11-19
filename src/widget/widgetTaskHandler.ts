import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { renderUnreadWidget, UNREAD_WIDGET_NAME } from './refreshUnreadWidget';

/** Entry point Android calls when the widget is added, resized, refreshed or clicked. */
export const widgetTaskHandler = async (props: WidgetTaskHandlerProps) => {
  if (props.widgetInfo.widgetName !== UNREAD_WIDGET_NAME) {
    return;
  }
  if (props.widgetAction === 'WIDGET_DELETED') {
    return;
  }
  props.renderWidget(await renderUnreadWidget());
};
