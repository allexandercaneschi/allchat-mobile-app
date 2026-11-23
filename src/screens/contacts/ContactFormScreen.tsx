import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, ScrollView, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import axios from 'axios';

import { Button } from '@/components-next';
import { FullScreenPage } from '@/navigation/split/FullScreenPage';
import { PageHeader } from '@/navigation/split/PageHeader';
import type { TabBarExcludedScreenParamList } from '@/navigation/tabs/AppTabs';
import i18n from '@/i18n';
import { ContactService } from '@/store/contact/contactService';
import { useTailwind } from '@/theme/useTailwind';
import { showToast } from '@/utils/toastUtils';
import { formatPhone } from '@/utils/phone';

import { FormField } from './components/FormField';
import { ContactFormErrors, ContactFormInput, validateContactForm } from './contactFormValidation';

type ContactFormScreenProps = NativeStackScreenProps<TabBarExcludedScreenParamList, 'ContactForm'>;

const emptyForm: ContactFormInput = { name: '', phone: '', email: '' };

const serverMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message;
    if (message) {
      return message;
    }
  }
  return i18n.t('CONTACTS.FORM.SAVE_ERROR');
};

const ContactFormScreen = ({ navigation, route }: ContactFormScreenProps) => {
  const tailwind = useTailwind();
  const contactId = route.params?.contactId;
  const isEditing = contactId !== undefined;

  const [form, setForm] = useState<ContactFormInput>(emptyForm);
  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (contactId === undefined) {
      return;
    }
    let cancelled = false;
    ContactService.getContact(contactId)
      .then(contact => {
        if (cancelled) {
          return;
        }
        setForm({
          name: contact.name ?? '',
          phone: formatPhone(contact.phoneNumber) || (contact.phoneNumber ?? ''),
          email: contact.email ?? '',
        });
        setIsLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          showToast({ message: i18n.t('CONTACTS.FORM.LOAD_ERROR') });
          navigation.goBack();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [contactId, navigation]);

  const setField = useCallback(
    (field: keyof ContactFormInput) => (value: string) => {
      setForm(current => ({ ...current, [field]: value }));
      setErrors(current => ({ ...current, [field]: undefined }));
    },
    [],
  );

  const save = useCallback(async () => {
    if (isSaving) {
      return;
    }
    const validation = validateContactForm(form);
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }
    setIsSaving(true);
    try {
      if (contactId === undefined) {
        await ContactService.createContact(validation.values);
      } else {
        await ContactService.updateContact(contactId, validation.values);
      }
      showToast({
        message: i18n.t(isEditing ? 'CONTACTS.FORM.SAVED_EDIT' : 'CONTACTS.FORM.SAVED_NEW'),
      });
      navigation.goBack();
    } catch (error) {
      showToast({ message: serverMessage(error) });
    } finally {
      setIsSaving(false);
    }
  }, [contactId, form, isEditing, isSaving, navigation]);

  const startConversation = useCallback(() => {
    if (contactId !== undefined) {
      navigation.replace('NewConversation', { contactId });
    }
  }, [contactId, navigation]);

  const translate = (key?: string) => (key ? i18n.t(key) : undefined);

  return (
    <FullScreenPage>
      <PageHeader
        title={i18n.t(isEditing ? 'CONTACTS.FORM.TITLE_EDIT' : 'CONTACTS.FORM.TITLE_NEW')}
        onBack={navigation.goBack}
      />
      {isLoading ? (
        <View style={tailwind.style('flex-1 items-center justify-center')}>
          <ActivityIndicator color={tailwind.color('text-gray-950')} />
        </View>
      ) : (
        <KeyboardAvoidingView style={tailwind.style('flex-1')} behavior={undefined}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={tailwind.style('px-4 pt-4 pb-8 gap-5')}>
            <FormField
              label={i18n.t('CONTACTS.FORM.NAME')}
              value={form.name}
              onChangeText={setField('name')}
              error={translate(errors.name)}
              autoCapitalize="words"
              returnKeyType="next"
            />
            <FormField
              label={i18n.t('CONTACTS.FORM.PHONE')}
              value={form.phone}
              onChangeText={setField('phone')}
              error={translate(errors.phone)}
              hint={i18n.t('CONTACTS.FORM.PHONE_HINT')}
              keyboardType="phone-pad"
              returnKeyType="next"
            />
            <FormField
              label={i18n.t('CONTACTS.FORM.EMAIL')}
              value={form.email}
              onChangeText={setField('email')}
              error={translate(errors.email)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Button
              text={i18n.t('CONTACTS.FORM.SAVE')}
              handlePress={save}
              isLoading={isSaving}
              disabled={isSaving}
            />
            {isEditing ? (
              <Button
                variant="secondary"
                text={i18n.t('CONTACTS.FORM.START_CONVERSATION')}
                handlePress={startConversation}
                disabled={isSaving}
              />
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </FullScreenPage>
  );
};

export default ContactFormScreen;
