export function auctionRoom(auctionId: string): string {
  return `auction:${auctionId}`;
}

export function userRoom(userId: string): string {
  return `user:${userId}`;
}

export const ADMIN_ROOM = 'admin';
