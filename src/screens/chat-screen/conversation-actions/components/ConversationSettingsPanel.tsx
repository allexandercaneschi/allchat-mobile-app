import { useTailwind } from '@/theme/useTailwind';
import React from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { Agent, ConversationPriority, Team } from '@/types';
import AssigneePanel from './AssigneePanel';
import TeamPanel from './TeamPanel';
import PriorityPanel from './PriorityPanel';
import { useIsInDetailPane } from '@/navigation/split/SplitViewContext';

type ConversationSettingsPanelProps = {
  priority: ConversationPriority;
  team: Team | null;
  assignee: Agent | null;
  onChangeAssignee: () => void;
  onChangeTeamAssignee: () => void;
  onChangePriority: () => void;
};

export const ConversationSettingsPanel = ({
  assignee,
  team,
  priority,
  onChangeAssignee,
  onChangeTeamAssignee,
  onChangePriority,
}: ConversationSettingsPanelProps) => {
  const tailwind = useTailwind();
  const isInPane = useIsInDetailPane();
  return (
    <Animated.View
      style={[tailwind.style('rounded-[13px] mx-4 bg-white'), isInPane ? null : styles.listShadow]}>
      <AssigneePanel assignee={assignee} onPress={onChangeAssignee} />
      <TeamPanel team={team} onPress={onChangeTeamAssignee} />
      <PriorityPanel priority={priority} onPress={onChangePriority} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  listShadow: {
    elevation: 4,
  },
});
