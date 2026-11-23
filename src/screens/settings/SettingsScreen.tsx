import { useTailwind } from '@/theme/useTailwind';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  StatusBar,
  Text,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated from 'react-native-reanimated';
// import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackActions, useNavigation } from '@react-navigation/native';

import { useSelector } from 'react-redux';
import * as Application from 'expo-application';
import { Account, AvailabilityStatus } from '@/types';
import { switchAccount } from '@/utils/accountUtils';

import i18n from 'i18n';

import {
  BottomSheetHeader,
  Button,
  LanguageList,
  AvailabilityStatusList,
  NotificationPreferences,
  SwitchAccount,
  SettingsList,
} from '@/components-next';
import { Sheet } from '@/components-next/common/sheet/Sheet';
import { UserAvatar } from './components/UserAvatar';

import { LANGUAGES } from '@/constants';
import { useRefsContext } from '@/context';
import { LockIcon, NotificationIcon, SwitchIcon, TranslateIcon } from '@/svg-icons';
import { GenericListType } from '@/types';

import { useHaptic, useIsSplitLayout, useSideTabBarLayout, useTabBarHeight } from '@/utils';
import { HeaderSpacer, ScrollEdgeHeader, useScrollEdge } from '@/components-next/side-toolbar';
import { SettingsHeader } from './SettingsHeader';
import { DebugActions } from './components/DebugActions';
import {
  selectCurrentUserAvailability,
  selectUser,
  selectAccounts,
} from '@/store/auth/authSelectors';
import { authActions } from '@/store/auth/authActions';
import { selectBiometricLockEnabled, selectLocale } from '@/store/settings/settingsSelectors';
import { settingsActions } from '@/store/settings/settingsActions';
import { setBiometricLock, setLocale } from '@/store/settings/settingsSlice';
import { useLogout } from '@/hooks/useLogout';
import { authenticateUser, isDeviceSecured } from '@/security/biometricAuth';

import { getUserPermissions } from '@/utils/permissionUtils';
import { CONVERSATION_PERMISSIONS } from '@/constants/permissions';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { showToast } from '@/utils/toastUtils';
import { PaneHeader } from '@/navigation/split/PaneHeader';

const appName = Application.applicationName;
const appVersion = Application.nativeApplicationVersion;

const buildNumber = Application.nativeBuildVersion;
const appVersionDetails = buildNumber ? `${appVersion} (${buildNumber})` : appVersion;

type SettingsPane = 'availability' | 'notifications' | 'language' | 'account';

const SettingsScreen = () => {
  const tailwind = useTailwind();
  const navigation = useNavigation();
  const isSplit = useIsSplitLayout();
  const { width } = useWindowDimensions();
  const [pane, setPane] = useState<SettingsPane>('availability');
  const openPane = (next: SettingsPane, openSheetInstead: () => void) => () => {
    if (isSplit) {
      hapticSelection?.();
      setPane(next);
    } else {
      openSheetInstead();
    }
  };
  const dispatch = useAppDispatch();
  const tabBarHeight = useTabBarHeight();
  const sideTabBar = useSideTabBarLayout();
  const hasOverlayHeader = sideTabBar !== null;
  const scrollEdge = useScrollEdge();
  const [headerHeight, setHeaderHeight] = useState(0);
  const pageBackground = 'bg-white';
  const savedAvailabilityStatus =
    (useSelector(selectCurrentUserAvailability) as AvailabilityStatus) || 'offline';
  const [pendingAvailability, setPendingAvailability] = useState<AvailabilityStatus | null>(null);
  const availabilityStatus = pendingAvailability ?? savedAvailabilityStatus;

  // const { bottom } = useSafeAreaInsets();

  const user = useSelector(selectUser);
  const { name, email, avatar_url: avatarUrl, account_id: activeAccountId } = user || {};

  // Refetch when the active account changes; notification settings are account-scoped.
  useEffect(() => {
    dispatch(settingsActions.getNotificationSettings());
  }, [dispatch, activeAccountId]);

  const userPermissions = getUserPermissions(user, activeAccountId);

  const hasConversationPermission = CONVERSATION_PERMISSIONS.some(permission =>
    userPermissions.includes(permission),
  );

  const accounts = useSelector(selectAccounts) || [];

  const activeAccountName = accounts.length
    ? accounts.find((account: Account) => account.id === activeAccountId)?.name || ''
    : '';

  const enableAccountSwitch = accounts.length > 1;

  const activeLocale = useSelector(selectLocale);
  const {
    userAvailabilityStatusSheetRef,
    languagesModalSheetRef,
    notificationPreferencesSheetRef,
    switchAccountSheetRef,
    debugActionsSheetRef,
  } = useRefsContext();

  const hapticSelection = useHaptic();

  const openSheet = () => {
    hapticSelection?.();
    userAvailabilityStatusSheetRef.current?.present();
  };

  const changeAvailabilityStatus = (updatedStatus: string) => {
    const payload = { profile: { availability: updatedStatus, account_id: activeAccountId } };
    setPendingAvailability(updatedStatus as AvailabilityStatus);
    // TODO: Fix this later
    // @ts-expect-error TODO: Fix typing for dispatch
    dispatch(authActions.updateAvailability(payload))
      .unwrap()
      .catch(() => showToast({ message: i18n.t('SETTINGS.AVAILABILITY_ERROR') }))
      .finally(() => setPendingAvailability(null));
  };

  const onChangeLanguage = (locale: string) => {
    dispatch(setLocale(locale));
  };

  const changeAccount = (accountId: number) => {
    switchAccount(dispatch, accountId);
    navigation.dispatch(StackActions.replace('Tab'));
  };

  useEffect(() => {
    userAvailabilityStatusSheetRef.current?.dismiss();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availabilityStatus]);

  useEffect(() => {
    languagesModalSheetRef.current?.dismiss();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLocale]);

  // const openSystemSettings = () => {
  //   if (Platform.OS === 'ios') {
  //     Linking.openURL('app-settings:');
  //   } else {
  //     Linking.openSettings();
  //   }
  // };

  const onClickLogout = useLogout();

  const biometricLockEnabled = useAppSelector(selectBiometricLockEnabled);

  const toggleBiometricLock = useCallback(async () => {
    if (biometricLockEnabled) {
      dispatch(setBiometricLock(false));
      return;
    }
    if (!(await isDeviceSecured())) {
      Alert.alert(i18n.t('APP_LOCK.SETTING'), i18n.t('APP_LOCK.NOT_AVAILABLE'));
      return;
    }
    // Proving it works before turning it on avoids locking the user out.
    if (await authenticateUser(i18n.t('APP_LOCK.ENABLE_PROMPT'))) {
      dispatch(setBiometricLock(true));
    }
  }, [biometricLockEnabled, dispatch]);

  const availabilityList: GenericListType[] = [
    {
      hasChevron: true,
      title: i18n.t('SETTINGS.STATUS'),
      icon: <SwitchIcon />,
      subtitle: i18n.t(`AVAILABILITY.${availabilityStatus.toUpperCase()}`),
      subtitleType: 'light',
      isSelected: isSplit && pane === 'availability',
      onPressListItem: openPane('availability', openSheet),
    },
  ];

  const preferencesList: GenericListType[] = [
    {
      hasChevron: false,
      title: i18n.t('APP_LOCK.SETTING'),
      icon: <LockIcon />,
      subtitle: i18n.t(biometricLockEnabled ? 'APP_LOCK.SETTING_ON' : 'APP_LOCK.SETTING_OFF'),
      subtitleType: 'light',
      onPressListItem: toggleBiometricLock,
    },
    {
      hasChevron: true,
      title: i18n.t('SETTINGS.NOTIFICATIONS'),
      icon: <NotificationIcon />,
      subtitle: '',
      subtitleType: 'light',
      disabled: !hasConversationPermission,
      isSelected: isSplit && pane === 'notifications',
      onPressListItem: openPane('notifications', () =>
        notificationPreferencesSheetRef.current?.present(),
      ),
      // onPressListItem: openSystemSettings,
    },
    {
      hasChevron: true,
      title: i18n.t('SETTINGS.CHANGE_LANGUAGE'),
      icon: <TranslateIcon />,
      subtitle: LANGUAGES[activeLocale as keyof typeof LANGUAGES],
      subtitleType: 'light',
      isSelected: isSplit && pane === 'language',
      onPressListItem: openPane('language', () => languagesModalSheetRef.current?.present()),
    },
    {
      hasChevron: enableAccountSwitch,
      title: i18n.t('SETTINGS.SWITCH_ACCOUNT'),
      icon: <SwitchIcon />,
      subtitle: activeAccountName,
      subtitleType: 'light',
      isSelected: isSplit && pane === 'account',
      onPressListItem: () => {
        if (enableAccountSwitch) {
          openPane('account', () => switchAccountSheetRef.current?.present())();
        }
      },
    },
  ];

  const listContent = (
    <SafeAreaView
      edges={
        hasOverlayHeader
          ? isSplit
            ? ['left', 'bottom']
            : ['left', 'right', 'bottom']
          : isSplit
            ? ['top', 'left', 'bottom']
            : undefined
      }
      style={tailwind.style('flex-1 font-inter-normal-20', pageBackground)}>
      <StatusBar
        translucent
        backgroundColor={tailwind.color('bg-white')}
        barStyle={tailwind.isDark ? 'light-content' : 'dark-content'}
      />
      {hasOverlayHeader ? null : <SettingsHeader />}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={hasOverlayHeader ? scrollEdge.onScroll : undefined}
        scrollEventThrottle={16}
        scrollIndicatorInsets={hasOverlayHeader ? { top: headerHeight } : undefined}
        contentContainerStyle={tailwind.style(`pb-[${tabBarHeight - 1}px]`)}>
        {hasOverlayHeader ? <HeaderSpacer height={headerHeight} /> : null}
        <Animated.View style={tailwind.style('flex justify-center items-center pt-4 gap-4')}>
          <UserAvatar
            src={avatarUrl}
            name={name}
            status={availabilityStatus}
            parentsBackground={pageBackground}
          />
          <Animated.View style={tailwind.style('flex flex-col items-center gap-1')}>
            <Animated.Text style={tailwind.style('text-[22px] font-inter-580-24 text-gray-950')}>
              {name}
            </Animated.Text>
            <Animated.Text
              style={tailwind.style(
                'text-[15px] font-inter-420-20 leading-[17.25px] text-gray-900',
              )}>
              {email}
            </Animated.Text>
          </Animated.View>
        </Animated.View>
        <Animated.View style={tailwind.style('pt-6')}>
          <SettingsList sectionTitle={i18n.t('SETTINGS.AVAILABILITY')} list={availabilityList} />
        </Animated.View>
        <Animated.View style={tailwind.style('pt-6')}>
          <SettingsList sectionTitle={i18n.t('SETTINGS.PREFERENCES')} list={preferencesList} />
        </Animated.View>
        <Animated.View style={tailwind.style('pt-6 mx-4')}>
          <Button
            variant="secondary"
            text={i18n.t('SETTINGS.LOGOUT')}
            isDestructive
            handlePress={onClickLogout}
          />
        </Animated.View>
        <Pressable
          style={tailwind.style('p-4 items-center')}
          onLongPress={() => debugActionsSheetRef.current?.present()}>
          <Text style={tailwind.style('text-sm text-gray-700 ')}>
            {`${appName} ${appVersionDetails}`}
          </Text>
        </Pressable>
      </Animated.ScrollView>
      {hasOverlayHeader ? (
        <ScrollEdgeHeader
          scrollY={scrollEdge.scrollY}
          onHeightChange={setHeaderHeight}
          insetSides={!isSplit}
          background={pageBackground}>
          <SettingsHeader />
        </ScrollEdgeHeader>
      ) : null}
      <Sheet ref={userAvailabilityStatusSheetRef} height={190}>
        <BottomSheetHeader headerText={i18n.t('SETTINGS.SET_AVAILABILITY')} />
        <AvailabilityStatusList
          changeAvailabilityStatus={changeAvailabilityStatus}
          availabilityStatus={availabilityStatus}
        />
      </Sheet>
      <Sheet ref={languagesModalSheetRef} detents={[0.7]} scrollable>
        <ScrollView showsVerticalScrollIndicator={false}>
          <BottomSheetHeader headerText={i18n.t('SETTINGS.SET_LANGUAGE')} />
          <LanguageList onChangeLanguage={onChangeLanguage} currentLanguage={activeLocale} />
        </ScrollView>
      </Sheet>
      <Sheet ref={notificationPreferencesSheetRef} detents={[0.7]} scrollable>
        <ScrollView showsVerticalScrollIndicator={false}>
          <BottomSheetHeader headerText={i18n.t('SETTINGS.NOTIFICATION_PREFERENCES')} />
          <NotificationPreferences />
        </ScrollView>
      </Sheet>
      <Sheet ref={switchAccountSheetRef} detents={[0.5]}>
        <BottomSheetHeader headerText={i18n.t('SETTINGS.SWITCH_ACCOUNT')} />
        <SwitchAccount
          currentAccountId={activeAccountId}
          changeAccount={changeAccount}
          accounts={accounts}
        />
      </Sheet>
      <Sheet ref={debugActionsSheetRef} detents={[0.36]}>
        <BottomSheetHeader headerText={i18n.t('SETTINGS.DEBUG_ACTIONS')} />
        <DebugActions />
      </Sheet>
    </SafeAreaView>
  );

  const titleFor = (p: SettingsPane) =>
    ({
      availability: i18n.t('SETTINGS.SET_AVAILABILITY'),
      notifications: i18n.t('SETTINGS.NOTIFICATION_PREFERENCES'),
      language: i18n.t('SETTINGS.SET_LANGUAGE'),
      account: i18n.t('SETTINGS.SWITCH_ACCOUNT'),
    })[p];

  const renderPaneCard = (p: SettingsPane) => (
    <View style={tailwind.style('rounded-[13px] bg-white overflow-hidden')}>
      {p === 'availability' ? (
        <AvailabilityStatusList
          changeAvailabilityStatus={changeAvailabilityStatus}
          availabilityStatus={availabilityStatus}
        />
      ) : null}
      {p === 'notifications' ? <NotificationPreferences /> : null}
      {p === 'language' ? (
        <LanguageList onChangeLanguage={onChangeLanguage} currentLanguage={activeLocale} />
      ) : null}
      {p === 'account' ? (
        <SwitchAccount
          currentAccountId={activeAccountId}
          changeAccount={changeAccount}
          accounts={accounts}
        />
      ) : null}
    </View>
  );

  // One tree so folding doesn't remount.
  return (
    <View style={tailwind.style('flex-1 flex-row bg-white')}>
      <View
        style={
          isSplit ? { width: Math.max(320, Math.round(width * 0.4)) } : tailwind.style('flex-1')
        }>
        {listContent}
      </View>
      {isSplit ? (
        <>
          <View style={tailwind.style('w-[1px] bg-blackA-A3')} />
          <SafeAreaView
            edges={['top', 'right', 'bottom']}
            style={tailwind.style('flex-1 bg-gray-50')}>
            <PaneHeader title={titleFor(pane)} />
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={tailwind.style('px-4 pt-2', `pb-[${tabBarHeight}px]`)}>
              {renderPaneCard(pane)}
            </ScrollView>
          </SafeAreaView>
        </>
      ) : null}
      {null}
    </View>
  );
};

export default SettingsScreen;
