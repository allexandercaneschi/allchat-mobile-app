import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useTailwind } from '@/theme/useTailwind';
import i18n from '@/i18n';
import { SendIcon } from '@/svg-icons';

// Same limit as `InternalChat::MAX_MESSAGE_LENGTH` on the server.
export const MAX_MESSAGE_LENGTH = 5000;

type MessageComposerProps = {
  // When set, the field is disabled and this text explains why (posting policy of the room).
  blockedReason?: string | null;
  // Only direct conversations can have urgent messages.
  allowUrgent?: boolean;
  // Resolves true when the message was sent (the draft is cleared), false to keep the draft.
  onSend: (content: string, urgent: boolean) => Promise<boolean>;
};

export const MessageComposer = ({ blockedReason, allowUrgent, onSend }: MessageComposerProps) => {
  const tailwind = useTailwind();
  const [text, setText] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  if (blockedReason) {
    return (
      <View
        testID="composer-blocked"
        style={tailwind.style('px-4 py-3 border-t border-gray-200 bg-gray-50')}>
        <Text style={tailwind.style('text-sm font-inter-420-20 text-gray-700 text-center')}>
          {blockedReason}
        </Text>
      </View>
    );
  }

  const content = text.trim();
  const canSend = content.length > 0 && !isSending;

  const send = async () => {
    if (!canSend) return;
    setIsSending(true);
    const sent = await onSend(content, allowUrgent === true && urgent);
    setIsSending(false);
    if (sent) {
      setText('');
      setUrgent(false);
    }
  };

  return (
    <View style={tailwind.style('px-3 pt-2 pb-2 border-t border-gray-200 bg-white gap-2')}>
      {allowUrgent && (
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: urgent }}
          testID="urgent-toggle"
          onPress={() => setUrgent(value => !value)}
          style={tailwind.style(
            'self-start px-3 py-1 rounded-full border',
            urgent ? 'bg-ruby-700 border-ruby-700' : 'bg-white border-gray-300',
          )}>
          <Text
            style={tailwind.style(
              'text-xs font-inter-medium-24',
              urgent ? 'text-white' : 'text-gray-700',
            )}>
            {urgent
              ? i18n.t('INTERNAL_CHAT.CONVERSATION.URGENT_ON')
              : i18n.t('INTERNAL_CHAT.CONVERSATION.URGENT')}
          </Text>
        </Pressable>
      )}
      <View style={tailwind.style('flex-row items-end gap-2')}>
        <TextInput
          testID="composer-input"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder={i18n.t('INTERNAL_CHAT.CONVERSATION.MESSAGE_PLACEHOLDER')}
          placeholderTextColor={tailwind.color('text-gray-600')}
          style={tailwind.style(
            'flex-1 max-h-[120px] min-h-[40px] px-4 py-2 rounded-2xl bg-gray-100 text-base font-inter-420-20 text-gray-950',
          )}
        />
        <Pressable
          testID="composer-send"
          accessibilityRole="button"
          accessibilityLabel={i18n.t('INTERNAL_CHAT.CONVERSATION.SEND')}
          accessibilityState={{ disabled: !canSend }}
          disabled={!canSend}
          onPress={send}
          style={tailwind.style(
            'h-[40px] w-[40px] rounded-full items-center justify-center p-3',
            canSend ? 'bg-blue-800' : 'bg-gray-400',
          )}>
          <SendIcon />
        </Pressable>
      </View>
    </View>
  );
};
