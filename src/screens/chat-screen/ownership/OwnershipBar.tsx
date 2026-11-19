import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components-next';
import i18n from '@/i18n';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { selectUserId } from '@/store/auth/authSelectors';
import { conversationRequestActions } from '@/store/conversation-request/conversationRequestActions';
import type { ConversationRequest } from '@/store/conversation-request/conversationRequestTypes';
import { conversationActions } from '@/store/conversation/conversationActions';
import { useTailwind } from '@/theme/useTailwind';
import { showToast } from '@/utils/toastUtils';

import type { LockedState } from './conversationOwnership';

type OwnershipBarProps = {
  conversationId: number;
  state: LockedState;
  ownerName: string;
  pendingParticipation?: ConversationRequest;
};

/** Takes the place of the reply box while the agent is not allowed to reply. */
export const OwnershipBar = ({
  conversationId,
  state,
  ownerName,
  pendingParticipation,
}: OwnershipBarProps) => {
  const tailwind = useTailwind();
  const dispatch = useAppDispatch();
  const { bottom } = useSafeAreaInsets();
  const userId = useAppSelector(selectUserId);
  const [isBusy, setIsBusy] = useState(false);

  // Runs one request at a time and reports a failure with the given message.
  const run = useCallback(async (action: () => Promise<unknown>, errorKey: string) => {
    setIsBusy(true);
    try {
      await action();
    } catch {
      showToast({ message: i18n.t(errorKey) });
    } finally {
      setIsBusy(false);
    }
  }, []);

  const take = useCallback(
    () =>
      run(async () => {
        if (userId === undefined) {
          return;
        }
        await dispatch(
          conversationActions.assignConversation({ conversationId, assigneeId: userId }),
        ).unwrap();
        // The websocket also reports the change; this keeps the screen right if it is down.
        await dispatch(conversationActions.fetchConversation(conversationId));
      }, 'OWNERSHIP.TAKE_ERROR'),
    [conversationId, dispatch, run, userId],
  );

  const ask = useCallback(
    () =>
      run(
        () => dispatch(conversationRequestActions.askParticipation(conversationId)).unwrap(),
        'OWNERSHIP.ASK_ERROR',
      ),
    [conversationId, dispatch, run],
  );

  const cancel = useCallback(
    () =>
      run(async () => {
        if (pendingParticipation) {
          await dispatch(
            conversationRequestActions.respond({
              requestId: pendingParticipation.id,
              answer: 'cancel',
            }),
          ).unwrap();
        }
      }, 'OWNERSHIP.CANCEL_ERROR'),
    [dispatch, pendingParticipation, run],
  );

  const title =
    state === 'unassigned'
      ? i18n.t('OWNERSHIP.UNASSIGNED_TITLE')
      : i18n.t('OWNERSHIP.OTHER_TITLE', { name: ownerName });
  const hint = pendingParticipation
    ? i18n.t('OWNERSHIP.ASKED', { name: ownerName })
    : i18n.t(state === 'unassigned' ? 'OWNERSHIP.UNASSIGNED_HINT' : 'OWNERSHIP.OTHER_HINT');

  return (
    <View
      style={[
        tailwind.style('gap-3 border-t-[1px] border-blackA-A3 bg-white px-4 pt-3'),
        { paddingBottom: bottom + 12 },
      ]}>
      <View style={tailwind.style('gap-1')}>
        <Text style={tailwind.style('text-base font-inter-medium-24 text-gray-950')}>{title}</Text>
        <Text style={tailwind.style('text-sm text-gray-800')}>{hint}</Text>
      </View>
      {state === 'unassigned' ? (
        <Button
          text={i18n.t('OWNERSHIP.TAKE')}
          handlePress={take}
          isLoading={isBusy}
          disabled={isBusy}
        />
      ) : pendingParticipation ? (
        <Button
          variant="secondary"
          text={i18n.t('OWNERSHIP.CANCEL_REQUEST')}
          handlePress={cancel}
          isLoading={isBusy}
          disabled={isBusy}
        />
      ) : (
        <Button
          text={i18n.t('OWNERSHIP.ASK')}
          handlePress={ask}
          isLoading={isBusy}
          disabled={isBusy}
        />
      )}
    </View>
  );
};
