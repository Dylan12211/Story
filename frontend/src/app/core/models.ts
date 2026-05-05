export interface SessionState {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  username: string;
  email?: string;
  roles: string[];

  provider?: 'LOCAL' | 'KEYCLOAK' | 'GOOGLE';
}

export interface ApiEnvelope<T> {
  result: T;
}

export interface StoryItem {
  id: number;
  title: string;
  content: string;
  status: string;
  createdBy: string;
}

export interface WorkflowTask {
  id: string;
  name: string;
  key: string;
  assignee: string | null;
}

export interface WorkflowTaskDetail extends WorkflowTask {
  variables: Record<string, unknown>;
}

export interface ProfileResponse {
  profileId: number;
  userId: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  dob: string;
  roles: string[];
  // CCCD Information
  idNumber?: string;
  gender?: string;
  nationality?: string;
  placeOfOrigin?: string;
  placeOfResidence?: string;
  dateOfExpiry?: string;
}

export interface IdCardProfileResponse {
  idNumber?: string;
  firstName?: string;
  lastName?: string;
  dob?: string;
  gender?: string;
  nationality?: string;
  placeOfOrigin?: string;
  placeOfResidence?: string;
  dateOfExpiry?: string;
}

export interface RegisterPayload {
  username: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
  dob: string;
}

export interface ManagedUserPayload {
  username: string;
  email: string;
  password: string;
}

export interface UserManagementItem {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  enabled: boolean;
  emailVerified: boolean;
  roles: string[];
}

export interface ReportColumn {
  key: string;
  label: string;
  description: string;
}

export interface ReportTableOption {
  key: string;
  label: string;
  description: string;
  available: boolean;
  columns: ReportColumn[];
}

export interface DiagramNode {
  title: string;
  subtitle: string;
}

export interface DiagramLane {
  label: string;
  nodes: DiagramNode[];
}

export interface KnowledgeSection {
  id: string;
  title: string;
  summary: string;
  bullets: string[];
  apiNotes: string[];
  sampleNotes: string[];
  diagram: DiagramLane[];
}

export interface TaskNotification {
  id: number | null;
  type: string;
  title: string;
  message: string;
  username: string;
  taskId: string | null;
  taskKey: string | null;
  createdAt: string;
}

export enum StoryEventType {
  STORY_CREATED = 'STORY_CREATED',
  STORY_UPDATED = 'STORY_UPDATED',
  STORY_SUBMITTED = 'STORY_SUBMITTED',
  STORY_APPROVED = 'STORY_APPROVED',
  STORY_REJECTED = 'STORY_REJECTED',
  STORY_PUBLISHED = 'STORY_PUBLISHED',
  STORY_DELETED = 'STORY_DELETED'
}

export interface StoryEvent {
  storyId?: number;
  title?: string;
  createdBy?: string;
  status?: string;
  eventType?: StoryEventType;
  timestamp?: string;
  message?: string;
}
