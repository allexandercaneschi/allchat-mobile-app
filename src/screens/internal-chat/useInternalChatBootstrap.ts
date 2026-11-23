import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { selectCurrentUserAccountId } from '@/store/auth/authSelectors';
import { internalChatActions } from '@/store/internal-chat/internalChatActions';
import { resetInternalChat } from '@/store/internal-chat/internalChatSlice';

// Loads the conversations when the tabs open (and when the account changes), so the unread badge of
// the tab is right from the start, and again when the app comes back to the foreground: messages
// sent while the websocket was off are not replayed.
export const useInternalChatBootstrap = () => {
  const dispatch = useAppDispatch();
  const accountId = useAppSelector(selectCurrentUserAccountId);
  const isFirstRun = useRef(true);

  useEffect(() => {
    // Nothing of one account may show up in another.
    if (!isFirstRun.current) dispatch(resetInternalChat());
    isFirstRun.current = false;
    dispatch(internalChatActions.fetchChannels());
  }, [accountId, dispatch]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') dispatch(internalChatActions.fetchChannels());
    });
    return () => subscription.remove();
  }, [dispatch]);
};
