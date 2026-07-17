export const HAZARD_CATEGORIES = [
  'Flooding',
  'Waste Dumping',
  'Pollution',
  'Blocked Drainage',
  'Dirty Environment',
  'Others',
];

export const REPORT_STATUS = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
};

export const REPORT_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

export const TIMELINE_EVENT_TYPES = {
  REPORT_SUBMITTED: 'report_submitted',
  STATUS_CHANGED: 'status_changed',
  REPORT_ASSIGNED: 'report_assigned',
  COMMENT_ADDED: 'comment_added',
  IMAGE_ADDED: 'image_added',
};

export const NOTIFICATION_TYPES = {
  REPORT_SUBMITTED: 'report_submitted',
  REPORT_STATUS_CHANGED: 'report_status_changed',
  REPORT_REJECTED: 'report_rejected',
  REPORT_ASSIGNED: 'report_assigned',
  ANNOUNCEMENT: 'announcement',
  STUDENT_UPLOAD: 'student_upload',
  ADMIN_CREATED: 'admin_created',
  ADMIN_UPDATED: 'admin_updated',
  ADMIN_DISABLED: 'admin_disabled',
  SYSTEM: 'system',
};
