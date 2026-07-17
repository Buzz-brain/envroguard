import { HazardReport } from '../modules/report/model.js';
import { TIMELINE_EVENT_TYPES } from '../constants/hazard.js';
import { logger } from '../utils/logger.js';

const MODEL_LABELS = {
  StudentAccount: 'Student',
  DepartmentAdmin: 'Dept Admin',
  FacultyAdmin: 'Faculty Admin',
  EnvironmentalAdmin: 'Environmental Admin',
};

const getActorName = (actor, actorModel) => {
  if (!actor) return 'System';
  if (typeof actor === 'object' && actor !== null) {
    return actor.fullName || actor.firstName + ' ' + (actor.lastName || '') || 'Unknown';
  }
  return MODEL_LABELS[actorModel] || actorModel || 'System';
};

export const addTimelineEvent = async ({
  reportId,
  eventType,
  description,
  actor,
  actorModel,
  actorName,
  metadata,
}) => {
  try {
    const resolvedActorName = actorName || getActorName(actor, actorModel);

    await HazardReport.findByIdAndUpdate(reportId, {
      $push: {
        timeline: {
          eventType,
          description,
          actor: actor || null,
          actorModel: actorModel || null,
          actorName: resolvedActorName,
          metadata: metadata || {},
          createdAt: new Date(),
        },
      },
    });
  } catch (error) {
    logger.error('Failed to add timeline event', { error: error.message, reportId, eventType });
  }
};

export const addReportSubmittedEvent = async (reportId, actor, studentName) => {
  await addTimelineEvent({
    reportId,
    eventType: TIMELINE_EVENT_TYPES.REPORT_SUBMITTED,
    description: 'Report submitted',
    actor,
    actorModel: 'StudentAccount',
    actorName: studentName || 'Student',
  });
};

export const addStatusChangedEvent = async (reportId, status, actor, actorModel, actorName, note) => {
  const statusLabels = {
    pending: 'Pending',
    under_review: 'Under Review',
    in_progress: 'In Progress',
    resolved: 'Resolved',
  };

  await addTimelineEvent({
    reportId,
    eventType: TIMELINE_EVENT_TYPES.STATUS_CHANGED,
    description: `Status changed to ${statusLabels[status] || status}${note ? `: ${note}` : ''}`,
    actor,
    actorModel,
    actorName,
    metadata: { status, note },
  });
};

export const addAssignedEvent = async (reportId, assignedToId, assignedToName, actor, actorModel) => {
  await addTimelineEvent({
    reportId,
    eventType: TIMELINE_EVENT_TYPES.REPORT_ASSIGNED,
    description: `Assigned to ${assignedToName || 'an admin'}`,
    actor,
    actorModel,
    actorName: getActorName(actor, actorModel),
    metadata: { assignedTo: assignedToId?.toString() },
  });
};

export const getTimeline = async (reportId) => {
  const report = await HazardReport.findById(reportId).select('timeline').populate('timeline.actor', 'fullName firstName lastName email');

  if (!report) return [];

  return report.timeline.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
};
