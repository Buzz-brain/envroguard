import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from './Skeleton';
import { spacing } from '../../constants';

type CardVariant = 'default' | 'accent-card' | 'notification-card' | 'student-card' | 'faculty-card' | 'admin-card';

interface SkeletonListProps {
  count?: number;
  variant?: CardVariant;
}

function DefaultItem() {
  return (
    <View style={s.item}>
      <Skeleton height={20} width="60%" />
      <View style={{ height: spacing.xs }} />
      <Skeleton height={14} width="40%" />
      <View style={{ height: spacing.xs }} />
      <Skeleton height={12} width="30%" />
    </View>
  );
}

function AccentCardItem() {
  return (
    <View style={s.accentCard}>
      <Skeleton width={4} height={120} borderRadius={2} style={s.accentBar} />
      <View style={s.accentBody}>
        <View style={s.accentTop}>
          <Skeleton width={32} height={32} borderRadius={9} />
          <View style={{ flex: 1, gap: 3 }}>
            <Skeleton height={15} width="65%" />
          </View>
          <Skeleton width={70} height={22} borderRadius={11} />
        </View>
        <Skeleton height={12} width="85%" style={{ marginTop: spacing.xs }} />
        <View style={s.accentBottom}>
          <Skeleton width={60} height={16} borderRadius={8} />
          <Skeleton width={80} height={12} />
        </View>
      </View>
    </View>
  );
}

function NotificationCardItem() {
  return (
    <View style={s.notifCard}>
      <View style={s.notifRow}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={{ flex: 1, gap: 4 }}>
          <Skeleton height={14} width="75%" />
          <Skeleton height={12} width="90%" />
          <Skeleton height={10} width="35%" />
        </View>
        <Skeleton width={18} height={18} borderRadius={4} />
      </View>
    </View>
  );
}

function StudentCardItem() {
  return (
    <View style={s.studentCard}>
      <Skeleton width={44} height={44} borderRadius={22} />
      <View style={{ flex: 1, gap: 4 }}>
        <Skeleton height={15} width="50%" />
        <Skeleton height={12} width="70%" />
        <Skeleton height={10} width="25%" />
      </View>
      <Skeleton width={18} height={18} borderRadius={4} />
    </View>
  );
}

function FacultyCardItem() {
  return (
    <View style={s.facultyCard}>
      <Skeleton width={48} height={48} borderRadius={14} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <Skeleton height={15} width="55%" />
          <Skeleton width={50} height={18} borderRadius={9} />
        </View>
        <Skeleton height={11} width="30%" />
      </View>
      <View style={{ gap: 6 }}>
        <Skeleton width={20} height={20} borderRadius={4} />
        <Skeleton width={20} height={20} borderRadius={4} />
        <Skeleton width={20} height={20} borderRadius={4} />
      </View>
    </View>
  );
}

function AdminCardItem() {
  return (
    <View style={s.adminCard}>
      <Skeleton width={44} height={44} borderRadius={22} />
      <View style={{ flex: 1, gap: 4 }}>
        <Skeleton height={15} width="45%" />
        <Skeleton height={12} width="60%" />
        <Skeleton width={55} height={18} borderRadius={9} />
      </View>
      <View style={{ gap: 8 }}>
        <Skeleton width={20} height={20} borderRadius={4} />
        <Skeleton width={20} height={20} borderRadius={4} />
      </View>
    </View>
  );
}

const ITEM_MAP: Record<CardVariant, React.FC> = {
  default: DefaultItem,
  'accent-card': AccentCardItem,
  'notification-card': NotificationCardItem,
  'student-card': StudentCardItem,
  'faculty-card': FacultyCardItem,
  'admin-card': AdminCardItem,
};

export const SkeletonList: React.FC<SkeletonListProps> = ({ count = 6, variant = 'default' }) => {
  const Item = ITEM_MAP[variant];
  return (
    <View style={s.container}>
      {Array.from({ length: count }).map((_, i) => (
        <Item key={i} />
      ))}
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  item: {
    padding: spacing.md,
  },

  // Accent card
  accentCard: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  accentBar: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  accentBody: {
    flex: 1,
    padding: spacing.md,
  },
  accentTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  accentBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },

  // Notification card
  notifCard: {
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notifRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  // Student card
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  // Faculty card
  facultyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  // Admin card
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
});
