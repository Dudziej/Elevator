export type CallCommand = { type: 'call'; floor: number; direction: 'up' | 'down'; ts: number };
export type SelectCommand = { type: 'select'; elevatorId: number; floor: number; ts: number };
export type Command = CallCommand | SelectCommand;
