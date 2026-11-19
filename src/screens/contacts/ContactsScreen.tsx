import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components-next/common';
import { PaneHeader } from '@/navigation/split/PaneHeader';
import type { TabBarExcludedScreenParamList } from '@/navigation/tabs/AppTabs';
import i18n from '@/i18n';
import { ChatIcon, PlusIcon, SearchIcon } from '@/svg-icons';
import { useTailwind } from '@/theme/useTailwind';
import type { Contact } from '@/types';
import { useTabBarHeight } from '@/utils';

import { ContactRow } from './components/ContactRow';
import { useContactList } from './useContactList';

type Navigation = NativeStackNavigationProp<TabBarExcludedScreenParamList>;

const ContactsScreen = () => {
  const tailwind = useTailwind();
  const navigation = useNavigation<Navigation>();
  const tabBarHeight = useTabBarHeight();
  const [query, setQuery] = useState('');
  const { contacts, isLoading, isLoadingMore, hasError, loadMore, refresh } = useContactList(query);

  // Coming back from the form: show the contact that was just created or changed.
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      refresh();
    }, [refresh]),
  );

  const openContact = useCallback(
    (contact: Contact) => navigation.navigate('ContactForm', { contactId: contact.id }),
    [navigation],
  );
  const openNewContact = useCallback(() => navigation.navigate('ContactForm', {}), [navigation]);
  const startConversation = useCallback(
    (contact: Contact) => navigation.navigate('NewConversation', { contactId: contact.id }),
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: Contact }) => (
      <ContactRow
        contact={item}
        onPress={openContact}
        action={
          <Pressable
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={i18n.t('CONTACTS.CHAT')}
            onPress={() => startConversation(item)}
            style={tailwind.style('h-10 w-10 items-center justify-center')}>
            <Icon size={24} icon={<ChatIcon stroke={tailwind.color('text-blue-800')} />} />
          </Pressable>
        }
      />
    ),
    [openContact, startConversation, tailwind],
  );

  const emptyState = isLoading ? (
    <ActivityIndicator style={tailwind.style('mt-10')} color={tailwind.color('text-gray-950')} />
  ) : hasError ? (
    <View style={tailwind.style('items-center px-8 pt-10 gap-3')}>
      <Text style={tailwind.style('text-center text-base text-gray-950')}>
        {i18n.t('CONTACTS.LOAD_ERROR')}
      </Text>
      <Pressable onPress={refresh} accessibilityRole="button">
        <Text style={tailwind.style('text-base font-inter-medium-24 text-blue-800')}>
          {i18n.t('CONTACTS.RETRY')}
        </Text>
      </Pressable>
    </View>
  ) : (
    <View style={tailwind.style('items-center px-8 pt-10 gap-1')}>
      <Text style={tailwind.style('text-center text-base text-gray-950')}>
        {i18n.t('CONTACTS.EMPTY')}
      </Text>
      {query.trim() ? null : (
        <Text style={tailwind.style('text-center text-sm text-gray-800')}>
          {i18n.t('CONTACTS.EMPTY_HINT')}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={tailwind.style('flex-1 bg-white')}>
      <PaneHeader
        title={i18n.t('CONTACTS.TITLE')}
        right={
          <Pressable
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={i18n.t('CONTACTS.NEW')}
            onPress={openNewContact}
            style={tailwind.style('h-9 w-9 items-center justify-center')}>
            <Icon size={24} icon={<PlusIcon stroke={tailwind.color('text-gray-950')} />} />
          </Pressable>
        }
      />
      <View
        style={tailwind.style(
          'mx-4 mb-2 h-10 flex-row items-center gap-2 rounded-xl px-3 bg-blackA-A4',
        )}>
        <Icon size={20} icon={<SearchIcon stroke={tailwind.color('text-gray-800')} />} />
        <TextInput
          accessibilityLabel={i18n.t('CONTACTS.SEARCH')}
          value={query}
          onChangeText={setQuery}
          placeholder={i18n.t('CONTACTS.SEARCH')}
          placeholderTextColor={tailwind.color('text-gray-900')}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={tailwind.style('flex-1 text-base text-gray-950 py-0')}
        />
      </View>
      <FlatList
        data={contacts}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
        ListEmptyComponent={emptyState}
        ListFooterComponent={
          isLoadingMore ? (
            <ActivityIndicator
              style={tailwind.style('py-4')}
              color={tailwind.color('text-gray-950')}
            />
          ) : null
        }
        contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
      />
    </SafeAreaView>
  );
};

export default ContactsScreen;
