const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_PATTERN = new RegExp(`^[${ROOM_CODE_CHARS}]{6}$`);

export function normalizeRoomCode(value: string): string {
  return value
    .toUpperCase()
    .split("")
    .filter((char) => ROOM_CODE_CHARS.includes(char))
    .join("")
    .slice(0, 6);
}

export function isRoomCode(value: string): boolean {
  return ROOM_CODE_PATTERN.test(value.toUpperCase());
}
