import { createStatus } from '@/lib/statusStore';

/** Whether preparing this week's check-in on the phone failed (not counting offline). */
export const checkinStatus = createStatus();
export const useCheckinStatus = () => checkinStatus.use();
