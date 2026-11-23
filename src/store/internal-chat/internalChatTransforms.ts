import camelcaseKeys from 'camelcase-keys';
import type { InternalChatChannel, InternalChatMessage } from './internalChatTypes';

/* eslint-disable @typescript-eslint/no-explicit-any */

export const transformInternalChatMessage = (message: any): InternalChatMessage =>
  camelcaseKeys(message, { deep: true }) as unknown as InternalChatMessage;

export const transformInternalChatChannel = (channel: any): InternalChatChannel =>
  camelcaseKeys(channel, { deep: true }) as unknown as InternalChatChannel;
