import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '@/components-next';
import { Icon } from '@/components-next/common';
import { FullScreenPage } from '@/navigation/split/FullScreenPage';
import { PageHeader } from '@/navigation/split/PageHeader';
import type { TabBarExcludedScreenParamList } from '@/navigation/tabs/AppTabs';
import i18n from '@/i18n';
import { useAppSelector } from '@/hooks';
import { selectUserId } from '@/store/auth/authSelectors';
import { ConversationService } from '@/store/conversation/conversationService';
import { SearchIcon } from '@/svg-icons';
import { useTailwind } from '@/theme/useTailwind';
import type { Contact } from '@/types';
import { showToast } from '@/utils/toastUtils';

import { ContactRow } from '../contacts/components/ContactRow';
import { useContactList } from '../contacts/useContactList';
import { useNewConversationTarget } from './useNewConversationTarget';

type NewConversationScreenProps = NativeStackScreenProps<
  TabBarExcludedScreenParamList,
  'NewConversation'
>;

const ContactPicker = ({ onPick }: { onPick: (contact: Contact) => void }) => {
  const tailwind = useTailwind();
  const [query, setQuery] = useState('');
  const { contacts, isLoading, isLoadingMore, hasError, loadMore, refresh } = useContactList(query);

  return (
    <View style={tailwind.style('flex-1')}>
      <View
        style={tailwind.style(
          'mx-4 mb-2 h-10 flex-row items-center gap-2 rounded-xl px-3 bg-blackA-A4',
        )}>
        <Icon size={20} icon={<SearchIcon stroke={tailwind.color('text-gray-800')} />} />
        <TextInput
          autoFocus
          accessibilityLabel={i18n.t('CONTACTS.SEARCH')}
          value={query}
          onChangeText={setQuery}
          placeholder={i18n.t('CONTACTS.SEARCH')}
          placeholderTextColor={tailwind.color('text-gray-900')}
          autoCapitalize="none"
          autoCorrect={false}
          style={tailwind.style('flex-1 text-base text-gray-950 py-0')}
        />
      </View>
      <FlatList
        data={contacts}
        keyExtractor={item => String(item.id)}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => <ContactRow contact={item} onPress={onPick} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator
              style={tailwind.style('mt-10')}
              color={tailwind.color('text-gray-950')}
            />
          ) : (
            <Pressable
              onPress={hasError ? refresh : undefined}
              style={tailwind.style('px-8 pt-10')}>
              <Text style={tailwind.style('text-center text-base text-gray-950')}>
                {i18n.t(hasError ? 'CONTACTS.LOAD_ERROR' : 'CONTACTS.EMPTY')}
              </Text>
            </Pressable>
          )
        }
        ListFooterComponent={
          isLoadingMore ? (
            <ActivityIndicator
              style={tailwind.style('py-4')}
              color={tailwind.color('text-gray-950')}
            />
          ) : null
        }
      />
    </View>
  );
};

const NewConversationScreen = ({ navigation, route }: NewConversationScreenProps) => {
  const tailwind = useTailwind();
  const userId = useAppSelector(selectUserId);
  const [contactId, setContactId] = useState<number | null>(route.params?.contactId ?? null);
  const [chosenInboxId, setChosenInboxId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const target = useNewConversationTarget(contactId);

  const changeContact = useCallback(() => {
    setContactId(null);
    setChosenInboxId(null);
  }, []);

  // A single inbox needs no choice.
  const inboxes = target.status === 'ready' ? target.inboxes : [];
  const selected =
    inboxes.find(({ inbox }) => inbox.id === chosenInboxId) ??
    (inboxes.length === 1 ? inboxes[0] : undefined);
  const canSend = !!selected && !!message.trim() && userId !== undefined && !isSending;

  const send = useCallback(async () => {
    if (!selected || contactId === null || userId === undefined || !message.trim() || isSending) {
      return;
    }
    setIsSending(true);
    try {
      const conversationId = await ConversationService.createConversation({
        contactId,
        inboxId: selected.inbox.id,
        sourceId: selected.sourceId,
        message: message.trim(),
        assigneeId: userId,
      });
      navigation.replace('ChatScreen', { conversationId });
    } catch {
      showToast({ message: i18n.t('NEW_CONVERSATION.SEND_ERROR') });
      setIsSending(false);
    }
  }, [contactId, isSending, message, navigation, selected, userId]);

  const renderBody = () => {
    if (contactId === null) {
      return <ContactPicker onPick={contact => setContactId(contact.id)} />;
    }
    if (target.status === 'idle' || target.status === 'loading') {
      return (
        <View style={tailwind.style('flex-1 items-center justify-center')}>
          <ActivityIndicator color={tailwind.color('text-gray-950')} />
        </View>
      );
    }
    if (target.status === 'error') {
      return (
        <View style={tailwind.style('px-8 pt-10 gap-3')}>
          <Text style={tailwind.style('text-center text-base text-gray-950')}>
            {i18n.t('NEW_CONVERSATION.INBOXES_ERROR')}
          </Text>
          <Button variant="secondary" text={i18n.t('CONTACTS.RETRY')} handlePress={changeContact} />
        </View>
      );
    }

    return (
      <KeyboardAvoidingView style={tailwind.style('flex-1')} behavior={undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={tailwind.style('pb-8 gap-5')}>
          <View style={tailwind.style('flex-row items-center')}>
            <View style={tailwind.style('flex-1')}>
              <ContactRow contact={target.contact} onPress={changeContact} />
            </View>
            <Pressable
              onPress={changeContact}
              accessibilityRole="button"
              hitSlop={8}
              style={tailwind.style('pr-4')}>
              <Text style={tailwind.style('text-base font-inter-medium-24 text-blue-800')}>
                {i18n.t('NEW_CONVERSATION.CHANGE_CONTACT')}
              </Text>
            </Pressable>
          </View>

          {inboxes.length === 0 ? (
            <Text style={tailwind.style('px-4 text-base text-gray-800')}>
              {i18n.t('NEW_CONVERSATION.NO_INBOX')}
            </Text>
          ) : (
            <View style={tailwind.style('px-4 gap-2')}>
              <Text style={tailwind.style('font-inter-420-20 text-gray-950')}>
                {i18n.t('NEW_CONVERSATION.INBOX')}
              </Text>
              {inboxes.map(({ inbox }) => {
                const isSelected = selected?.inbox.id === inbox.id;
                return (
                  <Pressable
                    key={inbox.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => setChosenInboxId(inbox.id)}
                    style={tailwind.style(
                      'flex-row items-center gap-3 rounded-xl border px-3 py-3',
                      isSelected ? 'border-blue-800 bg-blackA-A4' : 'border-blackA-A4',
                    )}>
                    <View
                      style={tailwind.style(
                        'h-5 w-5 items-center justify-center rounded-full border',
                        isSelected ? 'border-blue-800' : 'border-gray-700',
                      )}>
                      {isSelected ? (
                        <View style={tailwind.style('h-2.5 w-2.5 rounded-full bg-blue-800')} />
                      ) : null}
                    </View>
                    <Text style={tailwind.style('flex-1 text-base text-gray-950')}>
                      {inbox.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {inboxes.length > 0 ? (
            <View style={tailwind.style('px-4 gap-2')}>
              <Text style={tailwind.style('font-inter-420-20 text-gray-950')}>
                {i18n.t('NEW_CONVERSATION.MESSAGE')}
              </Text>
              <TextInput
                multiline
                textAlignVertical="top"
                accessibilityLabel={i18n.t('NEW_CONVERSATION.MESSAGE')}
                value={message}
                onChangeText={setMessage}
                placeholder={i18n.t('NEW_CONVERSATION.MESSAGE_PLACEHOLDER')}
                placeholderTextColor={tailwind.color('text-gray-900')}
                style={tailwind.style(
                  'min-h-[96px] rounded-xl px-3 py-2 text-base leading-[20px] text-gray-950 bg-blackA-A4',
                )}
              />
              <Button
                text={i18n.t('NEW_CONVERSATION.SEND')}
                handlePress={send}
                disabled={!canSend}
                isLoading={isSending}
              />
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  return (
    <FullScreenPage>
      <PageHeader title={i18n.t('NEW_CONVERSATION.TITLE')} onBack={navigation.goBack} />
      {renderBody()}
    </FullScreenPage>
  );
};

export default NewConversationScreen;
