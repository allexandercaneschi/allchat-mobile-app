import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
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
import { InternalChatService } from '@/services/internal-chat/internalChatService';
import { internalChatActions } from '@/store/internal-chat/internalChatActions';
import { selectInternalChatTeamRooms } from '@/store/internal-chat/internalChatSelectors';
import type { InternalChatUser } from '@/store/internal-chat/internalChatTypes';
import { showToast } from '@/utils/toastUtils';
import { AgentRow } from './components/AgentRow';
import { MAX_MESSAGE_LENGTH } from './components/MessageComposer';
import { PillButton, ScreenHeader } from './components/ScreenHeader';
import { SearchField } from './components/SearchField';
import type { InternalChatRootParamList } from './types';
import { filterAgents } from './utils';

type Props = NativeStackScreenProps<InternalChatRootParamList, 'InternalChatHelpRequest'>;
type Navigation = NativeStackNavigationProp<InternalChatRootParamList>;
type Audience = 'person' | 'team';

// Ask for help: to ONE person or to a team the user belongs to. The server has no "everybody".
const InternalChatHelpRequestScreen = ({ route }: Props) => {
  const tailwind = useTailwind();
  const navigation = useNavigation<Navigation>();
  const dispatch = useAppDispatch();
  const userId = useAppSelector(selectUserId);
  const teamRooms = useAppSelector(selectInternalChatTeamRooms);

  const [audience, setAudience] = useState<Audience>(route.params?.teamId ? 'team' : 'person');
  const [recipientId, setRecipientId] = useState<number | undefined>(route.params?.recipientId);
  const [teamId, setTeamId] = useState<number | undefined>(route.params?.teamId);
  const [content, setContent] = useState('');
  const [query, setQuery] = useState('');
  const [agents, setAgents] = useState<InternalChatUser[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    InternalChatService.getAgents()
      .then(result => !cancelled && setAgents(result))
      .catch(() => !cancelled && setAgents([]))
      .finally(() => !cancelled && setIsLoadingAgents(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleAgents = useMemo(() => filterAgents(agents, userId, query), [agents, userId, query]);
  // Only teams where the user can post (a restricted room blocks help requests too).
  const teams = useMemo(
    () => teamRooms.filter(room => room.canPost).map(room => room.team!),
    [teamRooms],
  );

  const target = audience === 'person' ? recipientId : teamId;
  const canSend = !!target && content.trim().length > 0 && !isSending;

  const send = async () => {
    if (!canSend) return;
    setIsSending(true);
    try {
      const message = await dispatch(
        internalChatActions.sendHelpRequest({
          content: content.trim(),
          ...(audience === 'person' ? { recipientId } : { teamId }),
        }),
      ).unwrap();
      showToast({ message: i18n.t('INTERNAL_CHAT.HELP_REQUEST.SENT') });
      navigation.replace('InternalChatConversation', { channelId: message.channelId });
    } catch {
      showToast({ message: i18n.t('INTERNAL_CHAT.HELP_REQUEST.ACTION_FAILED') });
      setIsSending(false);
    }
  };

  const AudienceTab = ({ value, label }: { value: Audience; label: string }) => (
    <Pressable
      testID={`audience-${value}`}
      accessibilityRole="tab"
      accessibilityState={{ selected: audience === value }}
      onPress={() => setAudience(value)}
      style={tailwind.style(
        'flex-1 py-2 items-center rounded-full',
        audience === value ? 'bg-blue-800' : 'bg-gray-100',
      )}>
      <Text
        style={tailwind.style(
          'text-sm font-inter-medium-24',
          audience === value ? 'text-white' : 'text-gray-950',
        )}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={tailwind.style('flex-1 bg-white')}>
      <ScreenHeader
        title={i18n.t('INTERNAL_CHAT.HELP_REQUEST.NEW_TITLE')}
        onBack={() => navigation.goBack()}
      />
      <KeyboardAvoidingView behavior="padding" style={tailwind.style('flex-1')}>
        <Text style={tailwind.style('px-4 pt-3 pb-2 text-sm font-inter-semibold-20 text-gray-700')}>
          {i18n.t('INTERNAL_CHAT.HELP_REQUEST.WHO')}
        </Text>
        <View style={tailwind.style('flex-row gap-2 px-4 pb-2')}>
          <AudienceTab value="person" label={i18n.t('INTERNAL_CHAT.HELP_REQUEST.PERSON')} />
          <AudienceTab value="team" label={i18n.t('INTERNAL_CHAT.HELP_REQUEST.TEAM')} />
        </View>
        {audience === 'person' ? (
          <>
            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder={i18n.t('INTERNAL_CHAT.NEW_CHAT_SEARCH')}
            />
            {isLoadingAgents ? (
              <ActivityIndicator style={tailwind.style('flex-1')} />
            ) : (
              <FlatList
                style={tailwind.style('flex-1')}
                data={visibleAgents}
                keyExtractor={agent => String(agent.id)}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <AgentRow
                    agent={item}
                    selected={item.id === recipientId}
                    onPress={agent => setRecipientId(agent.id)}
                  />
                )}
                ListEmptyComponent={
                  <Text style={tailwind.style('text-center pt-8 text-base text-gray-700')}>
                    {i18n.t('INTERNAL_CHAT.NO_AGENTS')}
                  </Text>
                }
              />
            )}
          </>
        ) : (
          <FlatList
            style={tailwind.style('flex-1')}
            data={teams}
            keyExtractor={team => String(team.id)}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: item.id === teamId }}
                testID={`team-${item.id}`}
                onPress={() => setTeamId(item.id)}
                style={tailwind.style('px-4 py-3', item.id === teamId && 'bg-gray-50')}>
                <Text style={tailwind.style('text-base font-inter-medium-24 text-gray-950')}>
                  {item.name}
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text
                testID="no-teams"
                style={tailwind.style('text-center pt-8 text-base text-gray-700')}>
                {i18n.t('INTERNAL_CHAT.HELP_REQUEST.NO_TEAMS')}
              </Text>
            }
          />
        )}
        <View style={tailwind.style('px-4 py-3 gap-3 border-t border-gray-200')}>
          <TextInput
            testID="help-content"
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder={i18n.t('INTERNAL_CHAT.HELP_REQUEST.MESSAGE_PLACEHOLDER')}
            placeholderTextColor={tailwind.color('text-gray-600')}
            style={tailwind.style(
              'min-h-[72px] max-h-[140px] px-4 py-3 rounded-2xl bg-gray-100 text-base font-inter-420-20 text-gray-950',
            )}
          />
          <PillButton
            testID="send-help-request"
            tone="primary"
            label={i18n.t('INTERNAL_CHAT.HELP_REQUEST.SEND')}
            disabled={!canSend}
            onPress={send}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default InternalChatHelpRequestScreen;
