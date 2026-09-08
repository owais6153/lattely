export const MEET_AGAIN_CHOICES = ['YES', 'NO', 'MAYBE'] as const;
export type MeetAgainChoice = (typeof MEET_AGAIN_CHOICES)[number];

export const FEEDBACK_TAGS = [
  'GREAT_CONVERSATION',
  'FRIENDLY',
  'AWKWARD',
  'LATE',
  'NO_SHOW',
  'SAFETY_CONCERN',
  'OTHER',
] as const;
export type FeedbackTag = (typeof FEEDBACK_TAGS)[number];
