import client from './client';
import type { Attachment, AttachmentList, AttachmentType } from '../types/budget';

export interface UploadAttachmentParams {
  costItemId?: string;
  workAreaId?: string;
  functionalAreaId?: string;
  priceHistoryId?: string;
  changeCostId?: string;
  file: File;
  description?: string;
  attachmentType?: AttachmentType;
}

export async function uploadAttachment(params: UploadAttachmentParams): Promise<Attachment> {
  const formData = new FormData();
  formData.append('file', params.file);

  if (params.costItemId) {
    formData.append('cost_item_id', params.costItemId);
  }
  if (params.workAreaId) {
    formData.append('work_area_id', params.workAreaId);
  }
  if (params.functionalAreaId) {
    formData.append('functional_area_id', params.functionalAreaId);
  }
  if (params.priceHistoryId) {
    formData.append('price_history_id', params.priceHistoryId);
  }
  if (params.changeCostId) {
    formData.append('change_cost_id', params.changeCostId);
  }
  if (params.description) {
    formData.append('description', params.description);
  }
  if (params.attachmentType) {
    formData.append('attachment_type', params.attachmentType);
  }

  const response = await client.post<Attachment>('/attachments/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function getAttachments(filters: {
  costItemId?: string;
  workAreaId?: string;
  functionalAreaId?: string;
}): Promise<AttachmentList> {
  const params: Record<string, string> = {};
  if (filters.costItemId) params.cost_item_id = filters.costItemId;
  if (filters.workAreaId) params.work_area_id = filters.workAreaId;
  if (filters.functionalAreaId) params.functional_area_id = filters.functionalAreaId;

  const response = await client.get<AttachmentList>('/attachments', { params });
  return response.data;
}

export function getDownloadUrl(attachmentId: string): string {
  return `${client.defaults.baseURL}/attachments/${attachmentId}/download`;
}

export async function downloadAttachment(attachmentId: string): Promise<void> {
  const url = getDownloadUrl(attachmentId);
  // Open in new tab for browser-native download
  window.open(url, '_blank');
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
  await client.delete(`/attachments/${attachmentId}`);
}
