import { Vibration } from 'react-native';
import { showToast } from '@/utils/toastUtils';

const ATTENTION_VIBRATION_PATTERN = [0, 400, 200, 400];
const REMEMBERED_MESSAGES = 50;

// The same message can reach the app twice, by the websocket and by the push (FCM) when it is open.
const alertedMessageIds: number[] = [];

// Vibrates and shows a toast for a message that must call attention (nudge, urgent or mention).
// Returns false when this message was already alerted.
export const alertAttention = (messageId: number, text: string): boolean => {
  if (alertedMessageIds.includes(messageId)) return false;
  alertedMessageIds.push(messageId);
  if (alertedMessageIds.length > REMEMBERED_MESSAGES) alertedMessageIds.shift();
  Vibration.vibrate(ATTENTION_VIBRATION_PATTERN);
  showToast({ message: text });
  return true;
};

export const resetAttentionMemory = () => {
  alertedMessageIds.length = 0;
};
