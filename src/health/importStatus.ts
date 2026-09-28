import { createStatus } from '@/lib/statusStore';

/** Whether the last Apple Health import failed (not counting offline), for Settings. */
export const importStatus = createStatus();
export const useImportStatus = () => importStatus.use();
