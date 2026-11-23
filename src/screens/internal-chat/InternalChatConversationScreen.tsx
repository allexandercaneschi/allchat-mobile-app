import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { useTailwind } from '@/theme/useTailwind';
import i18n from '@/i18n';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { selectUserId } from '@/store/auth/authSelectors';
import { internalChatActions } from '@/store/internal-chat/internalChatActions';
import { setViewingChannel } from '@/store/internal-chat/internalChatSlice';
import {
  selectInternalChatChannel,
  selectInternalChatHasMore,
  selectInternalChatIsLoadingMessages,
  selectInternalChatMessages,
  selectNudgeAvailableAt,
} from '@/store/internal-chat/internalChatSelectors';
import type { InternalChatMessage } from '@/store/internal-chat/internalChatTypes';
import { showToast } from '@/utils/toastUtils';
import { MessageBubble } from './components/MessageBubble';
import { MessageComposer } from './components/MessageComposer';
import { PillButton, ScreenHeader } from './components/ScreenHeader';
import type { InternalChatRootParamList } from './types';
import {
  getChannelSubtitle,
  getChannelTitle,
  getNudgeSecondsLeft,
  getPostingBlockedReason,
} from './utils';

type Props = NativeStackScreenProps<InternalChatRootParamList, 'InternalChatConversation'>;
type Navigation = NativeStackNavigationProp<InternalChatRootParamList>;

// Seconds left of the nudge cooldown, updated every second while it runs.
const useNudgeSecondsLeft = (availableAt: number) => {
  const [secondsLeft, setSecondsLeft] = useState(() => getNudgeSecondsLeft(availableAt));
  useEffect(() => {
    setSecondsLeft(getNudgeSecondsLeft(availableAt));
    if (getNudgeSecondsLeft(availableAt) === 0) return;
    const timer = setInterval(() => {
      const left = getNudgeSecondsLeft(availableAt);
      setSecondsLeft(left);
      if (left === 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [availableAt]);
  return secondsLeft;
};

const InternalChatConversationScreen = ({ route }: Props) => {
  const { channelId } = route.params;
  const tailwind = useTailwind();
  const navigation = useNavigation<Navigation>();
  const dispatch = useAppDispatch();
  const userId = useAppSelector(selectUserId);
  const channel = useAppSelector(state => selectInternalChatChannel(state, channelId));
  const messages = useAppSelector(state => selectInternalChatMessages(state, channelId));
  const hasMore = useAppSelector(state => selectInternalChatHasMore(state, channelId));
  const isLoadingMessages = useAppSelector(state =>
    selectInternalChatIsLoadingMessages(state, channelId),
  );
  const nudgeAvailableAt = useAppSelector(state => selectNudgeAvailableAt(state, channelId));
  const nudgeSecondsLeft = useNudgeSecondsLeft(nudgeAvailableAt);
  const [busyMessageId, setBusyMessageId] = useState<number | null>(null);
  const [isSendingNudge, setIsSendingNudge] = useState(false);

  // The channel may be missing when the screen opens from a push notification: load the list.
  const [triedLoadingChannels, setTriedLoadingChannels] = useState(!!channel);
  useEffect(() => {
    if (channel || triedLoadingChannels) return;
    dispatch(internalChatActions.fetchChannels()).finally(() => setTriedLoadingChannels(true));
  }, [channel, dispatch, triedLoadingChannels]);

  // While this screen is open its messages are read as they arrive.
  useEffect(() => {
    const refresh = () => {
      dispatch(internalChatActions.fetchMessages({ channelId }));
      dispatch(internalChatActions.markRead(channelId));
    };
    dispatch(setViewingChannel(channelId));
    refresh();
    // Back from the background: messages may have come while the websocket was off.
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        dispatch(setViewingChannel(channelId));
        refresh();
      }
    });
    return () => {
      subscription.remove();
      dispatch(setViewingChannel(null));
    };
  }, [channelId, dispatch]);

  // Inverted list: newest first.
  const data = useMemo(() => [...messages].reverse(), [messages]);

  const loadOlder = useCallback(() => {
    if (!hasMore || isLoadingMessages || !messages.length) return;
    dispatch(internalChatActions.fetchMessages({ channelId, beforeId: messages[0].id }));
  }, [channelId, dispatch, hasMore, isLoadingMessages, messages]);

  const handleSend = useCallback(
    async (content: string, urgent: boolean) => {
      try {
        await dispatch(internalChatActions.sendMessage({ channelId, content, urgent })).unwrap();
        return true;
      } catch {
        showToast({ message: i18n.t('INTERNAL_CHAT.CONVERSATION.SEND_FAILED') });
        return false;
      }
    },
    [channelId, dispatch],
  );

  const handleNudge = useCallback(async () => {
    setIsSendingNudge(true);
    const result = await dispatch(internalChatActions.sendNudge(channelId));
    setIsSendingNudge(false);
    // 429: the slice stored the `retry_after` of the server, the button shows the countdown.
    if (internalChatActions.sendNudge.rejected.match(result) && !result.payload?.retryAfter) {
      showToast({ message: i18n.t('ERRORS.COMMON_ERROR') });
    }
  }, [channelId, dispatch]);

  const handleClaim = useCallback(
    async (message: InternalChatMessage) => {
      setBusyMessageId(message.id);
      const result = await dispatch(
        internalChatActions.claimHelpRequest({
          channelId: message.channelId,
          messageId: message.id,
        }),
      );
      setBusyMessageId(null);
      if (internalChatActions.claimHelpRequest.fulfilled.match(result)) {
        // Whoever takes the request talks to who asked in their direct conversation.
        dispatch(internalChatActions.fetchChannels());
        navigation.push('InternalChatConversation', { channelId: result.payload.channelId });
        return;
      }
      if (result.payload?.alreadyClaimed) {
        showToast({ message: i18n.t('INTERNAL_CHAT.HELP_REQUEST.ALREADY_CLAIMED') });
        // Somebody was faster: show who took it.
        dispatch(internalChatActions.fetchMessages({ channelId }));
      } else {
        showToast({ message: i18n.t('INTERNAL_CHAT.HELP_REQUEST.ACTION_FAILED') });
      }
    },
    [channelId, dispatch, navigation],
  );

  const handleResolve = useCallback(
    async (message: InternalChatMessage) => {
      setBusyMessageId(message.id);
      const result = await dispatch(
        internalChatActions.resolveHelpRequest({
          channelId: message.channelId,
          messageId: message.id,
        }),
      );
      setBusyMessageId(null);
      if (internalChatActions.resolveHelpRequest.rejected.match(result)) {
        showToast({ message: i18n.t('INTERNAL_CHAT.HELP_REQUEST.ACTION_FAILED') });
      }
    },
    [dispatch],
  );

  if (!channel) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={tailwind.style('flex-1 bg-white')}>
        <ScreenHeader title={i18n.t('INTERNAL_CHAT.TITLE')} onBack={() => navigation.goBack()} />
        <View style={tailwind.style('flex-1 items-center justify-center px-8')}>
          {triedLoadingChannels ? (
            <Text
              testID="channel-not-found"
              style={tailwind.style('text-base font-inter-420-20 text-gray-700 text-center')}>
              {i18n.t('INTERNAL_CHAT.CONVERSATION.LOAD_FAILED')}
            </Text>
          ) : (
            <ActivityIndicator />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const isDirect = channel.kind === 'direct';
  const canAskHelp = channel.kind !== 'company_room' && channel.canPost;
  const nudgeLabel =
    nudgeSecondsLeft > 0
      ? i18n.t('INTERNAL_CHAT.CONVERSATION.NUDGE_WAIT', { seconds: nudgeSecondsLeft })
      : i18n.t('INTERNAL_CHAT.CONVERSATION.CALL_ATTENTION');

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={tailwind.style('flex-1 bg-white')}>
      <ScreenHeader
        title={getChannelTitle(channel)}
        subtitle={getChannelSubtitle(channel)}
        onBack={() => navigation.goBack()}
      />
      {(isDirect || canAskHelp) && (
        <View style={tailwind.style('flex-row gap-2 px-4 py-2 border-b border-gray-200')}>
          {isDirect && (
            <PillButton
              testID="nudge-button"
              tone="danger"
              label={nudgeLabel}
              disabled={nudgeSecondsLeft > 0 || isSendingNudge}
              onPress={handleNudge}
            />
          )}
          {canAskHelp && (
            <PillButton
              testID="ask-help-button"
              label={i18n.t('INTERNAL_CHAT.CONVERSATION.ASK_HELP')}
              onPress={() =>
                navigation.navigate(
                  'InternalChatHelpRequest',
                  isDirect && channel.user
                    ? { recipientId: channel.user.id }
                    : { teamId: channel.team?.id },
                )
              }
            />
          )}
        </View>
      )}
      <KeyboardAvoidingView behavior="padding" style={tailwind.style('flex-1')}>
        <FlatList
          inverted
          data={data}
          keyExtractor={message => String(message.id)}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              channel={channel}
              userId={userId}
              isBusy={busyMessageId === item.id}
              onClaim={handleClaim}
              onResolve={handleResolve}
            />
          )}
          onEndReached={loadOlder}
          onEndReachedThreshold={0.4}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={tailwind.style('py-2')}
          ListFooterComponent={
            isLoadingMessages ? <ActivityIndicator style={tailwind.style('py-4')} /> : null
          }
          ListEmptyComponent={
            !isLoadingMessages ? (
              <Text
                testID="no-messages"
                style={[
                  tailwind.style('text-center pt-16 text-base font-inter-420-20 text-gray-700'),
                  // The list is inverted, so its empty state has to be flipped back.
                  { transform: [{ scaleY: -1 }] },
                ]}>
                {i18n.t('INTERNAL_CHAT.NO_MESSAGES')}
              </Text>
            ) : null
          }
        />
        <MessageComposer
          blockedReason={getPostingBlockedReason(channel)}
          allowUrgent={isDirect}
          onSend={handleSend}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default InternalChatConversationScreen;
