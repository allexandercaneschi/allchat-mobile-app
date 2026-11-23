import React, { useCallback, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '@/components-next';
import { FullScreenPage } from '@/navigation/split/FullScreenPage';
import { PageHeader } from '@/navigation/split/PageHeader';
import type { TabBarExcludedScreenParamList } from '@/navigation/tabs/AppTabs';
import i18n from '@/i18n';
import { useAppDispatch } from '@/hooks';
import { conversationRequestActions } from '@/store/conversation-request/conversationRequestActions';
import type {
  ConversationRequest,
  ConversationRequestAnswer,
} from '@/store/conversation-request/conversationRequestTypes';
import { useTailwind } from '@/theme/useTailwind';
import { showToast } from '@/utils/toastUtils';

import { useIncomingRequests } from './useIncomingRequests';

type Props = NativeStackScreenProps<TabBarExcludedScreenParamList, 'ConversationRequests'>;

export const describeRequest = (request: ConversationRequest): string =>
  i18n.t(request.requestType === 'transfer' ? 'REQUESTS.TRANSFER' : 'REQUESTS.PARTICIPATION', {
    name: request.requester.name,
    contact: request.contactName || i18n.t('REQUESTS.NO_CONTACT'),
  });

const ConversationRequestsScreen = ({ navigation }: Props) => {
  const tailwind = useTailwind();
  const dispatch = useAppDispatch();
  const requests = useIncomingRequests();
  // Request being answered right now, so each card blocks only its own buttons.
  const [answering, setAnswering] = useState<number | null>(null);

  const answer = useCallback(
    async (
      request: ConversationRequest,
      choice: Extract<ConversationRequestAnswer, 'accept' | 'decline'>,
    ) => {
      setAnswering(request.id);
      try {
        await dispatch(
          conversationRequestActions.respond({ requestId: request.id, answer: choice }),
        ).unwrap();
        showToast({
          message: i18n.t(choice === 'accept' ? 'REQUESTS.ACCEPTED' : 'REQUESTS.DECLINED'),
        });
      } catch {
        // It may have been cancelled or expired meanwhile: reload so the list tells the truth.
        showToast({ message: i18n.t('REQUESTS.ANSWER_ERROR') });
        dispatch(conversationRequestActions.fetchMine());
      } finally {
        setAnswering(null);
      }
    },
    [dispatch],
  );

  return (
    <FullScreenPage>
      <PageHeader title={i18n.t('REQUESTS.TITLE')} onBack={navigation.goBack} />
      <FlatList
        data={requests}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={tailwind.style('px-4 pt-2 pb-8 gap-3')}
        ListEmptyComponent={
          <Text style={tailwind.style('pt-10 text-center text-base text-gray-800')}>
            {i18n.t('REQUESTS.EMPTY')}
          </Text>
        }
        renderItem={({ item }) => {
          const isBusy = answering === item.id;
          return (
            <View style={tailwind.style('gap-3 rounded-xl bg-blackA-A4 p-4')}>
              <Text style={tailwind.style('text-base leading-[22px] text-gray-950')}>
                {describeRequest(item)}
              </Text>
              <View style={tailwind.style('flex-row gap-3')}>
                <View style={tailwind.style('flex-1')}>
                  <Button
                    variant="secondary"
                    text={i18n.t('REQUESTS.DECLINE')}
                    handlePress={() => answer(item, 'decline')}
                    disabled={isBusy}
                  />
                </View>
                <View style={tailwind.style('flex-1')}>
                  <Button
                    text={i18n.t('REQUESTS.ACCEPT')}
                    handlePress={() => answer(item, 'accept')}
                    isLoading={isBusy}
                    disabled={isBusy}
                  />
                </View>
              </View>
            </View>
          );
        }}
      />
    </FullScreenPage>
  );
};

export default ConversationRequestsScreen;
