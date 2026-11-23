import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTailwind } from '@/theme/useTailwind';
import i18n from '@/i18n';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { selectUserId } from '@/store/auth/authSelectors';
import { InternalChatService } from '@/services/internal-chat/internalChatService';
import { internalChatActions } from '@/store/internal-chat/internalChatActions';
import type { InternalChatUser } from '@/store/internal-chat/internalChatTypes';
import { showToast } from '@/utils/toastUtils';
import { AgentRow } from './components/AgentRow';
import { PillButton, ScreenHeader } from './components/ScreenHeader';
import { SearchField } from './components/SearchField';
import type { InternalChatRootParamList } from './types';
import { filterAgents } from './utils';

type Navigation = NativeStackNavigationProp<InternalChatRootParamList>;

// Pick a colleague to open (or create) the direct conversation.
const InternalChatNewChatScreen = () => {
  const tailwind = useTailwind();
  const navigation = useNavigation<Navigation>();
  const dispatch = useAppDispatch();
  const userId = useAppSelector(selectUserId);
  const [agents, setAgents] = useState<InternalChatUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [isOpening, setIsOpening] = useState(false);

  useEffect(() => {
    let cancelled = false;
    InternalChatService.getAgents()
      .then(result => !cancelled && setAgents(result))
      .catch(() => !cancelled && setAgents([]))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleAgents = useMemo(() => filterAgents(agents, userId, query), [agents, userId, query]);

  const openChat = useCallback(
    async (agent: InternalChatUser) => {
      if (isOpening) return;
      setIsOpening(true);
      try {
        const channel = await dispatch(internalChatActions.openDirectChannel(agent.id)).unwrap();
        navigation.replace('InternalChatConversation', { channelId: channel.id });
      } catch {
        showToast({ message: i18n.t('ERRORS.COMMON_ERROR') });
        setIsOpening(false);
      }
    },
    [dispatch, isOpening, navigation],
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={tailwind.style('flex-1 bg-white')}>
      <ScreenHeader
        title={i18n.t('INTERNAL_CHAT.NEW_CHAT')}
        onBack={() => navigation.goBack()}
        right={
          <PillButton
            testID="ask-help-button"
            label={i18n.t('INTERNAL_CHAT.CONVERSATION.ASK_HELP')}
            onPress={() => navigation.navigate('InternalChatHelpRequest')}
          />
        }
      />
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder={i18n.t('INTERNAL_CHAT.NEW_CHAT_SEARCH')}
      />
      {isLoading ? (
        <View style={tailwind.style('flex-1 items-center justify-center')}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={visibleAgents}
          keyExtractor={agent => String(agent.id)}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <AgentRow agent={item} onPress={openChat} />}
          ListEmptyComponent={
            <Text
              testID="no-agents"
              style={tailwind.style('text-center pt-16 text-base font-inter-420-20 text-gray-700')}>
              {i18n.t('INTERNAL_CHAT.NO_AGENTS')}
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default InternalChatNewChatScreen;
