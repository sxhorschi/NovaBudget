import client from './client';

// ---------------------------------------------------------------------------
// Types matching backend schemas
// ---------------------------------------------------------------------------

export interface UserBrief {
  id: string;
  email: string;
  name: string;
  department: string | null;
  job_title: string | null;
  photo_url: string | null;
}

export interface UserRead {
  id: string;
  email: string;
  name: string;
  role: string;
  job_title: string | null;
  department: string | null;
  office_location: string | null;
  phone: string | null;
  employee_id: string | null;
  company_name: string | null;
  manager_email: string | null;
  manager_name: string | null;
  photo_url: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

/** Fetch lightweight list of active users (for requester dropdown, etc.) */
export async function getUsersBrief(): Promise<UserBrief[]> {
  const response = await client.get<UserBrief[]>('/users/brief');
  return response.data;
}

/** Fetch current user's full profile */
export async function getCurrentUserProfile(): Promise<UserRead> {
  const response = await client.get<UserRead>('/users/me');
  return response.data;
}
