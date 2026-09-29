export interface KingsettAvatarColor {
  background: string;
  color: string;
}

/** KingSett brand avatar tints — pale fills with digital/chart foreground (Guidelines v1.4). */
export const KINGSETT_AVATAR_COLORS: readonly KingsettAvatarColor[] = [
  { background: '#e6edf7', color: '#00529b' },
  { background: '#eef2f7', color: '#0c274a' },
  { background: '#dce8f3', color: '#003666' },
  { background: '#e8eef4', color: '#456896' },
  { background: '#edf3eb', color: '#668c62' },
  { background: '#fdf5df', color: '#b8840f' },
  { background: '#f4f6f9', color: '#00529b' },
  { background: '#f2f3f4', color: '#86898e' },
];

export function kingsettAvatarColor(index: number): KingsettAvatarColor {
  return KINGSETT_AVATAR_COLORS[index % KINGSETT_AVATAR_COLORS.length];
}
