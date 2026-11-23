import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import App from './App';
import { widgetTaskHandler } from './src/widget/widgetTaskHandler';

// Android runs this task when the home-screen widget is added, resized, refreshed or tapped,
// possibly without ever opening the UI.
registerWidgetTaskHandler(widgetTaskHandler);
registerRootComponent(App);
