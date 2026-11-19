import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAppSelector } from '@/hooks';
import { selectLoggedIn } from '@/store/auth/authSelectors';

import { IOS_DESIGN } from '@/utils';

import { AuthStack } from '../stack';
import ChatScreen from '@/screens/chat-screen/ChatScreen';
import ComposeScreen from '@/screens/chat-screen/ComposeScreen';
import MacrosScreen from '@/screens/chat-screen/MacrosScreen';
import BulkPickerScreen from '@/screens/conversations/BulkPickerScreen';
import ConversationActionsScreen from '@/screens/chat-screen/ConversationActionsScreen';
import ContactDetailsScreen from '@/screens/contact-details/ContactDetailsScreen';
import DashboardScreen from '@/screens/dashboard/DashboardScreen';
import SearchScreen from '@/screens/search/SearchScreen';
import ConversationRequestsScreen from '@/screens/requests/ConversationRequestsScreen';
import ContactFormScreen from '@/screens/contacts/ContactFormScreen';
import NewConversationScreen from '@/screens/new-conversation/NewConversationScreen';
import ResolveAttributesScreen from '@/screens/resolve-attributes/ResolveAttributesScreen';
import type { ResolveAttributesParams } from '@/screens/resolve-attributes/useRequiredAttributes';

import { SideColumnDivider } from './SideColumnDivider';
import { LayoutChangeCover } from './LayoutChangeCover';
import { GlassToastHost } from '@/components-next/toast';
import { Tabs } from './Tabs';

export type TabParamList = {
  Conversations: undefined;
  Contacts: undefined;
  Inbox: undefined;
  Settings: undefined;
  Login: undefined;
  ConfigInstallationURL: undefined;
  ForgotPassword: undefined;
  Search: undefined;
  Notifications: undefined;
};

export type TabBarExcludedScreenParamList = {
  Tab: undefined;
  ChatScreen: {
    conversationId: number;
    primaryActorId?: number;
    primaryActorType?: string;
    messageId?: number;
    instant?: boolean;
  };
  ContactDetails: { conversationId?: number; contactId?: number };
  /** Without `contactId` the form creates a contact; with it, edits that contact. */
  ContactForm: { contactId?: number };
  /** Without `contactId` the screen first asks who the conversation is for. */
  NewConversation: { contactId?: number };
  ConversationRequests: undefined;
  ComposeScreen: { conversationId: number };
  MacrosScreen: { conversationId: number };
  ConversationActionsScreen: { conversationId: number };
  BulkPicker: { kind: 'assign' | 'label' };
  ConversationActions: undefined;
  Dashboard: { url: string };
  Login: undefined;
  SearchScreen: undefined;
  ImageScreen: undefined;
  ConversationDetails: undefined;
  ConversationAction: undefined;
  ResolveAttributes: ResolveAttributesParams;
};
const Stack = createNativeStackNavigator<TabBarExcludedScreenParamList>();

const sidePageOptions = IOS_DESIGN
  ? ({ animation: 'slide_from_right' } as const)
  : ({ presentation: 'modal', animation: 'slide_from_bottom' } as const);

export const AppTabs = () => {
  const isLoggedIn = useAppSelector(selectLoggedIn);

  if (isLoggedIn) {
    return (
      <View style={{ flex: 1 }}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Tab" component={Tabs} />
          <Stack.Screen
            options={({ route }) => ({
              animation: route.params?.instant ? 'none' : 'slide_from_right',
            })}
            name="ChatScreen"
            component={ChatScreen}
          />
          <Stack.Screen
            options={sidePageOptions}
            name="ContactDetails"
            component={ContactDetailsScreen}
          />
          <Stack.Screen
            options={{ animation: 'slide_from_right' }}
            name="ContactForm"
            component={ContactFormScreen}
          />
          <Stack.Screen
            options={{ animation: 'slide_from_right' }}
            name="NewConversation"
            component={NewConversationScreen}
          />
          <Stack.Screen
            options={{ animation: 'slide_from_right' }}
            name="ConversationRequests"
            component={ConversationRequestsScreen}
          />
          <Stack.Screen options={sidePageOptions} name="Dashboard" component={DashboardScreen} />
          <Stack.Screen
            options={{ animation: 'slide_from_right' }}
            name="ComposeScreen"
            component={ComposeScreen}
          />
          <Stack.Screen
            options={{ animation: 'slide_from_right' }}
            name="MacrosScreen"
            component={MacrosScreen}
          />
          <Stack.Screen
            options={{ animation: 'slide_from_right' }}
            name="ConversationActionsScreen"
            component={ConversationActionsScreen}
          />
          <Stack.Screen
            options={{ presentation: 'modal' }}
            name="BulkPicker"
            component={BulkPickerScreen}
          />
          <Stack.Screen
            options={{ presentation: 'modal' }}
            name="ResolveAttributes"
            component={ResolveAttributesScreen}
          />
          <Stack.Screen
            options={{ headerShown: false, animation: 'slide_from_right' }}
            name="SearchScreen"
            component={SearchScreen}
          />
        </Stack.Navigator>
        <SideColumnDivider />
        <LayoutChangeCover />
        <GlassToastHost />
      </View>
    );
  } else {
    return (
      <View style={{ flex: 1 }}>
        <AuthStack />
        <GlassToastHost />
      </View>
    );
  }
};
