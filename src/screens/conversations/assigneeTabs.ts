import type { AssigneeTypes } from '@/types';

// Tab order shown at the top of the conversation list.
const TAB_ORDER: AssigneeTypes[] = ['me', 'unassigned', 'all'];

/**
 * Assignee views a user may open:
 * - conversation_manage / agent / administrator: all of them
 * - only conversation_unassigned_manage: no "all"
 * - otherwise (participating only): no "unassigned"
 */
export const getAvailableAssigneeTypes = (permissions: string[]): AssigneeTypes[] => {
  if (
    permissions.includes('conversation_manage') ||
    permissions.includes('agent') ||
    permissions.includes('administrator')
  ) {
    return TAB_ORDER;
  }
  if (permissions.includes('conversation_unassigned_manage')) {
    return TAB_ORDER.filter(type => type !== 'all');
  }
  return TAB_ORDER.filter(type => type !== 'unassigned');
};
