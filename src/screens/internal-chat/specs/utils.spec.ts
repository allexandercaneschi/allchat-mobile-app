import i18n from '@/i18n';
import {
  canClaimHelpRequest,
  canResolveHelpRequest,
  filterAgents,
  filterChannels,
  formatChannelTime,
  getChannelTitle,
  getHelpRequestStatus,
  getMessagePreview,
  getNudgeSecondsLeft,
  getPostingBlockedReason,
  matchesQuery,
} from '../utils';
import {
  ANA,
  buildChannel,
  buildMessage,
  ME,
} from '@/store/internal-chat/specs/internalChatFixtures';

beforeAll(() => {
  i18n.locale = 'pt_BR';
});

describe('channel titles and posting policy', () => {
  it('names a conversation after the other person, the team or the company', () => {
    expect(getChannelTitle(buildChannel())).toBe('Ana');
    expect(
      getChannelTitle(
        buildChannel({ kind: 'team_room', user: null, team: { id: 1, name: 'Suporte' } }),
      ),
    ).toBe('Suporte');
    expect(
      getChannelTitle(buildChannel({ kind: 'company_room', user: null, name: 'ALL Tecnologias' })),
    ).toBe('ALL Tecnologias');
    expect(getChannelTitle(buildChannel({ kind: 'company_room', user: null, name: null }))).toBe(
      'Sala da empresa',
    );
  });

  it('has no blocked reason when the user can post', () => {
    expect(getPostingBlockedReason(buildChannel({ canPost: true }))).toBeNull();
  });

  it('explains why the composer is disabled by the posting policy', () => {
    const adminsOnly = buildChannel({ canPost: false, postingPolicy: 'admins_only' });
    const supervisors = buildChannel({ canPost: false, postingPolicy: 'admins_and_supervisors' });
    expect(getPostingBlockedReason(adminsOnly)).toBe(
      'Só administradores podem enviar mensagens nesta sala.',
    );
    expect(getPostingBlockedReason(supervisors)).toBe(
      'Só administradores e supervisores podem enviar mensagens nesta sala.',
    );
  });
});

describe('help request rules', () => {
  const open = buildMessage({ kind: 'help_request', sender: ME });

  it('reads the status', () => {
    expect(getHelpRequestStatus(open)).toBe('open');
    expect(getHelpRequestStatus({ ...open, claimedBy: ANA })).toBe('claimed');
    expect(getHelpRequestStatus({ ...open, claimedBy: ANA, resolvedAt: 5 })).toBe('resolved');
  });

  it('lets anybody but the author take an open request', () => {
    expect(canClaimHelpRequest(open, ANA.id)).toBe(true);
    expect(canClaimHelpRequest(open, ME.id)).toBe(false);
    expect(canClaimHelpRequest({ ...open, claimedBy: ANA }, 3)).toBe(false);
    expect(canClaimHelpRequest({ ...open, resolvedAt: 5 }, ANA.id)).toBe(false);
    expect(canClaimHelpRequest(buildMessage(), ANA.id)).toBe(false);
  });

  it('lets only the author or who took it resolve', () => {
    const claimed = { ...open, claimedBy: ANA };
    expect(canResolveHelpRequest(claimed, ME.id)).toBe(true);
    expect(canResolveHelpRequest(claimed, ANA.id)).toBe(true);
    expect(canResolveHelpRequest(claimed, 3)).toBe(false);
    expect(canResolveHelpRequest({ ...claimed, resolvedAt: 9 }, ME.id)).toBe(false);
    expect(canResolveHelpRequest(open, ANA.id)).toBe(false);
  });
});

describe('nudge cooldown', () => {
  it('counts the seconds left, rounding up, never below zero', () => {
    expect(getNudgeSecondsLeft(61_000, 1_000)).toBe(60);
    expect(getNudgeSecondsLeft(10_500, 10_000)).toBe(1);
    expect(getNudgeSecondsLeft(5_000, 10_000)).toBe(0);
    expect(getNudgeSecondsLeft(0, 10_000)).toBe(0);
  });
});

describe('previews and times', () => {
  it('prefixes my own messages and describes a nudge', () => {
    expect(getMessagePreview(buildMessage({ content: 'oi', sender: ME }), ME.id)).toBe('Você: oi');
    expect(getMessagePreview(buildMessage({ content: 'oi' }), ME.id)).toBe('oi');
    expect(getMessagePreview(buildMessage({ kind: 'nudge', content: '' }), ME.id)).toBe(
      'Ana chamou sua atenção',
    );
    expect(getMessagePreview(buildMessage({ kind: 'nudge', content: '', sender: ME }), ME.id)).toBe(
      'Você chamou a atenção',
    );
  });

  it('shows the hour for today and the date for other days', () => {
    const now = new Date(2026, 10, 23, 15, 0, 0);
    const today = Math.floor(new Date(2026, 10, 23, 9, 5, 0).getTime() / 1000);
    const earlier = Math.floor(new Date(2026, 10, 20, 9, 5, 0).getTime() / 1000);
    expect(formatChannelTime(today, now)).toBe('09:05');
    expect(formatChannelTime(earlier, now)).toBe('20/11');
  });
});

describe('search filters', () => {
  it('ignores case and accents', () => {
    expect(matchesQuery('João Silva', 'joao')).toBe(true);
    expect(matchesQuery('João Silva', ' SILVA ')).toBe(true);
    expect(matchesQuery('João Silva', 'maria')).toBe(false);
  });

  it('filters the channels by title', () => {
    const channels = [
      buildChannel({ id: 1, user: { id: 2, name: 'Ana' } }),
      buildChannel({ id: 2, kind: 'team_room', user: null, team: { id: 1, name: 'Suporte' } }),
    ];
    expect(filterChannels(channels, 'sup').map(channel => channel.id)).toEqual([2]);
    expect(filterChannels(channels, '  ')).toHaveLength(2);
  });

  it('leaves me out of the colleagues list', () => {
    const agents = [ME, ANA, { id: 3, name: 'Beto' }];
    expect(filterAgents(agents, ME.id, '').map(agent => agent.id)).toEqual([2, 3]);
    expect(filterAgents(agents, ME.id, 'be').map(agent => agent.id)).toEqual([3]);
  });
});
