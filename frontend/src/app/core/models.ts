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
  type: string;
  title: string;
  message: string;
  username: string;
  taskId: string | null;
  taskKey: string | null;
  createdAt: string;
}
