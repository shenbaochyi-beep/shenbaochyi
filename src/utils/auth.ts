import { CurrentUser } from '../types';

export const DEAN_CREDENTIALS = {
  account: 'slvssa300300',
  title: '學務主任',
  name: '胡方奕',
};

export const AUTH_STORAGE_KEY = 'school_current_auth_v1';

export const DEFAULT_TEACHER_USER: CurrentUser = {
  role: 'teacher',
  name: '王偉仁 老師',
  title: '訪視導師',
  isDeanAuthenticated: false,
};

export const DEAN_USER: CurrentUser = {
  role: 'dean',
  name: DEAN_CREDENTIALS.name,
  title: DEAN_CREDENTIALS.title,
  account: DEAN_CREDENTIALS.account,
  isDeanAuthenticated: true,
};

export function getInitialCurrentUser(): CurrentUser {
  try {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load user from localStorage:', e);
  }
  return DEFAULT_TEACHER_USER;
}

export function saveCurrentUser(user: CurrentUser): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Failed to save user to localStorage:', e);
  }
}

export function isCurrentUserDean(user?: CurrentUser | null): boolean {
  if (!user) return false;
  return (
    user.role === 'dean' &&
    user.isDeanAuthenticated === true &&
    user.account?.trim().toLowerCase() === DEAN_CREDENTIALS.account.toLowerCase()
  );
}
