import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTailwind } from '@/theme/useTailwind';
import i18n from '@/i18n';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { useTabBarHeight } from '@/utils';
import { selectUserId } from '@/store/auth/authSelectors';
import { InternalChatService } from '@/services/internal-chat/internalChatService';
import { internalChatActions } from '@/store/internal-chat/internalChatActions';
import {
  selectInternalChatChannelList,
  selectInternalChatHasLoadedChannels,
  selectInternalChatIsLoadingChannels,
  selectInternalChatIsUnavailable,
} from '@/store/internal-chat/internalChatSelectors';
import type {
  InternalChatChannel,
  InternalChatMessage,
} from '@/store/internal-chat/internalChatTypes';
import { ChannelListItem } from './components/ChannelListItem';
import { PillButton, ScreenHeader } from './components/ScreenHeader';
import { SearchField } from './components/SearchField';
import type { InternalChatRootParamList } from './types';
import { filterChannels, formatChannelTime, getChannelTitle, MIN_SEARCH_LENGTH } from './utils';

type Navigation = NativeStackNavigationProp<InternalChatRootParamList>;

const SEARCH_DEBOUNCE_MS = 400;

type ListRow =
  | { type: 'channel'; key: string; channel: InternalChatChannel }
  | { type: 'section'; key: string; title: string }
  | { type: 'message'; key: string; message: InternalChatMessage };

const InternalChatListScreen = () => {
  const tailwind = useTailwind();
  const navigation = useNavigation<Navigation>();
  const dispatch = useAppDispatch();
  const tabBarHeight = useTabBarHeight();
  const userId = useAppSelector(selectUserId);
  const channels = useAppSelector(selectInternalChatChannelList);
  const hasLoaded = useAppSelector(selectInternalChatHasLoadedChannels);
  const isLoading = useAppSelector(selectInternalChatIsLoadingChannels);
  const isUnavailable = useAppSelector(selectInternalChatIsUnavailable);

  const [query, setQuery] = useState('');
  const [messageResults, setMessageResults] = useState<InternalChatMessage[]>([]);

  useEffect(() => {
    dispatch(internalChatActions.fetchChannels());
  }, [dispatch]);

  // Search in the text of the messages (server side) after the user stops typing.
  useEffect(() => {
    const term = query.trim();
    if (term.length < MIN_SEARCH_LENGTH) {
      setMessageResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const page = await InternalChatService.search({ query: term });
        if (!cancelled) setMessageResults(page.payload);
      } catch {
        if (!cancelled) setMessageResults([]);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const openChannel = useCallback(
    (channelId: number) => navigation.navigate('InternalChatConversation', { channelId }),
    [navigation],
  );

  const channelsById = useMemo(
    () => Object.fromEntries(channels.map(channel => [channel.id, channel])),
    [channels],
  );

  const rows = useMemo<ListRow[]>(() => {
    const matching = filterChannels(channels, query).map<ListRow>(channel => ({
      type: 'channel',
      key: `channel-${channel.id}`,
      channel,
    }));
    if (!messageResults.length) return matching;
    return [
      ...matching,
      { type: 'section', key: 'section-messages', title: i18n.t('INTERNAL_CHAT.MESSAGES_RESULTS') },
      ...messageResults.map<ListRow>(message => ({
        type: 'message',
        key: `message-${message.id}`,
        message,
      })),
    ];
  }, [channels, messageResults, query]);

  const renderRow = useCallback(
    ({ item }: { item: ListRow }) => {
      if (item.type === 'channel') {
        return (
          <ChannelListItem
            channel={item.channel}
            userId={userId}
            onPress={channel => openChannel(channel.id)}
          />
        );
      }
      if (item.type === 'section') {
        return (
          <Text
            style={tailwind.style('px-4 pt-4 pb-1 text-sm font-inter-semibold-20 text-gray-700')}>
            {item.title}
          </Text>
        );
      }
      const channel = channelsById[item.message.channelId];
      return (
        <Pressable
          accessibilityRole="button"
          testID={`search-result-${item.message.id}`}
          onPress={() => openChannel(item.message.channelId)}
          style={({ pressed }) => tailwind.style('px-4 py-3 gap-0.5', pressed && 'bg-gray-50')}>
          <View style={tailwind.style('flex-row justify-between gap-2')}>
            <Text
              numberOfLines={1}
              style={tailwind.style('flex-1 text-sm font-inter-medium-24 text-gray-950')}>
              {channel ? getChannelTitle(channel) : item.message.sender?.name}
            </Text>
            <Text style={tailwind.style('text-xs font-inter-420-20 text-gray-700')}>
              {formatChannelTime(item.message.createdAt)}
            </Text>
          </View>
          <Text numberOfLines={2} style={tailwind.style('text-sm font-inter-420-20 text-gray-700')}>
            {item.message.sender?.name}: {item.message.content}
          </Text>
        </Pressable>
      );
    },
    [channelsById, openChannel, tailwind, userId],
  );

  const showEmpty = hasLoaded && rows.length === 0;
  const emptyText = isUnavailable
    ? i18n.t('INTERNAL_CHAT.UNAVAILABLE')
    : query.trim()
      ? i18n.t('INTERNAL_CHAT.EMPTY_SEARCH')
      : i18n.t('INTERNAL_CHAT.EMPTY_LIST');

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={tailwind.style('flex-1 bg-white')}>
      <ScreenHeader
        title={i18n.t('INTERNAL_CHAT.TITLE')}
        right={
          <PillButton
            testID="new-chat-button"
            tone="primary"
            label={i18n.t('INTERNAL_CHAT.NEW_CHAT')}
            onPress={() => navigation.navigate('InternalChatNewChat')}
          />
        }
      />
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder={i18n.t('INTERNAL_CHAT.SEARCH_PLACEHOLDER')}
      />
      {!hasLoaded && isLoading ? (
        <View style={tailwind.style('flex-1 items-center justify-center')}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={row => row.key}
          renderItem={renderRow}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
          refreshControl={
            <RefreshControl
              refreshing={isLoading && hasLoaded}
              onRefresh={() => dispatch(internalChatActions.fetchChannels())}
            />
          }
          ListEmptyComponent={
            showEmpty ? (
              <View testID="empty-state" style={tailwind.style('items-center px-8 pt-16 gap-1')}>
                <Text style={tailwind.style('text-base font-inter-medium-24 text-gray-950')}>
                  {emptyText}
                </Text>
                {!query.trim() && !isUnavailable && (
                  <Text
                    style={tailwind.style('text-sm font-inter-420-20 text-gray-700 text-center')}>
                    {i18n.t('INTERNAL_CHAT.EMPTY_LIST_HINT')}
                  </Text>
                )}
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
};

export default InternalChatListScreen;
