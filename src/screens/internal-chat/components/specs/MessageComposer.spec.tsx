import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MessageComposer } from '../MessageComposer';

jest.mock('@/theme/appearance', () => ({ useAppAppearance: () => 'light' }));
jest.mock('@/i18n', () => ({ t: (key: string) => key }));
jest.mock('@/svg-icons', () => ({ SendIcon: 'SendIcon' }));

const render = (props: Partial<React.ComponentProps<typeof MessageComposer>> = {}) => {
  const onSend = jest.fn().mockResolvedValue(true);
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(<MessageComposer onSend={onSend} {...props} />);
  });
  const byId = (testID: string) => tree.root.findAllByProps({ testID });
  return { tree, onSend, byId };
};

describe('MessageComposer', () => {
  it('replaces the field with the reason when the posting policy blocks the user', () => {
    const { byId } = render({
      blockedReason: 'Só administradores podem enviar mensagens nesta sala.',
    });
    expect(byId('composer-blocked').length).toBeGreaterThan(0);
    expect(byId('composer-input')).toHaveLength(0);
    expect(byId('composer-send')).toHaveLength(0);
  });

  it('keeps Send disabled until there is text', () => {
    const { byId } = render();
    expect(byId('composer-send')[0].props.disabled).toBe(true);
    act(() => byId('composer-input')[0].props.onChangeText('   '));
    expect(byId('composer-send')[0].props.disabled).toBe(true);
    act(() => byId('composer-input')[0].props.onChangeText('oi'));
    expect(byId('composer-send')[0].props.disabled).toBe(false);
  });

  it('sends the trimmed text and clears the field', async () => {
    const { byId, onSend } = render();
    act(() => byId('composer-input')[0].props.onChangeText('  oi  '));
    await act(async () => byId('composer-send')[0].props.onPress());
    expect(onSend).toHaveBeenCalledWith('oi', false);
    expect(byId('composer-input')[0].props.value).toBe('');
  });

  it('keeps the draft when sending fails', async () => {
    const onSend = jest.fn().mockResolvedValue(false);
    const { byId } = render({ onSend });
    act(() => byId('composer-input')[0].props.onChangeText('oi'));
    await act(async () => byId('composer-send')[0].props.onPress());
    expect(byId('composer-input')[0].props.value).toBe('oi');
  });

  it('offers the urgent flag only when allowed (direct conversations)', async () => {
    expect(render({ allowUrgent: false }).byId('urgent-toggle')).toHaveLength(0);
    const { byId, onSend } = render({ allowUrgent: true });
    act(() => byId('urgent-toggle')[0].props.onPress());
    act(() => byId('composer-input')[0].props.onChangeText('socorro'));
    await act(async () => byId('composer-send')[0].props.onPress());
    expect(onSend).toHaveBeenCalledWith('socorro', true);
  });
});
