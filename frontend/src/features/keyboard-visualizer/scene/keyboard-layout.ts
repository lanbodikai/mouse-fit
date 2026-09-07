export type ProceduralKey = {
  id: string;
  legend: string;
  rowIndex: number;
  keyIndex: number;
  x: number;
  z: number;
  widthUnits: number;
};

export const KEY_UNIT = 0.78;
export const KEY_GAP = 0.075;

const rowWidths = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
  [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],
  [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25],
  [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75],
  [1.25, 1.25, 1.25, 6.25, 1.25, 1.25, 1.25, 1.25],
] as const;

const rowLegends = [
  ["Esc", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"],
  ["Tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\"],
  ["Caps", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "Enter"],
  ["Shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "Shift"],
  ["Ctrl", "Win", "Alt", "Space", "Alt", "Fn", "Menu", "Ctrl"],
] as const;

export const KEYBOARD_WIDTH = 15 * KEY_UNIT;
export const KEYBOARD_DEPTH = rowWidths.length * KEY_UNIT;

export const KEY_LAYOUT: readonly ProceduralKey[] = rowWidths.flatMap(
  (row, rowIndex) => {
    const rowUnits = row.reduce((total, width) => total + width, 0);
    let cursor = -(rowUnits * KEY_UNIT) / 2;

    return row.map((widthUnits, keyIndex) => {
      const width = widthUnits * KEY_UNIT;
      const key: ProceduralKey = {
        id: `${rowIndex}-${keyIndex}`,
        legend: rowLegends[rowIndex][keyIndex],
        rowIndex,
        keyIndex,
        x: cursor + width / 2,
        z: (rowIndex - (rowWidths.length - 1) / 2) * KEY_UNIT,
        widthUnits,
      };
      cursor += width;
      return key;
    });
  },
);
