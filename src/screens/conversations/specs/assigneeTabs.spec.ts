import { getAvailableAssigneeTypes } from '../assigneeTabs';

describe('getAvailableAssigneeTypes', () => {
  it.each([['conversation_manage'], ['agent'], ['administrator']])(
    'gives %s every view, in tab order',
    permission => {
      expect(getAvailableAssigneeTypes([permission])).toEqual(['me', 'unassigned', 'all']);
    },
  );

  it('hides "all" when the user only manages unassigned conversations', () => {
    expect(getAvailableAssigneeTypes(['conversation_unassigned_manage'])).toEqual([
      'me',
      'unassigned',
    ]);
  });

  it('hides "unassigned" for participating-only users and for no permissions', () => {
    expect(getAvailableAssigneeTypes(['conversation_participating_manage'])).toEqual(['me', 'all']);
    expect(getAvailableAssigneeTypes([])).toEqual(['me', 'all']);
  });
});
