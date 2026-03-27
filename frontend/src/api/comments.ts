import client from './client';
import type { Comment } from '../types/budget';

export const listComments = (costItemId: string): Promise<Comment[]> =>
  client.get<Comment[]>(`/cost-items/${costItemId}/comments`).then((r) => r.data);

export const createComment = (costItemId: string, text: string): Promise<Comment> =>
  client.post<Comment>(`/cost-items/${costItemId}/comments`, { text }).then((r) => r.data);

export const deleteComment = (costItemId: string, commentId: string): Promise<void> =>
  client.delete(`/cost-items/${costItemId}/comments/${commentId}`).then(() => undefined);
