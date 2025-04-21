import * as osd from '1fpga:osd';

export interface ChoicesOptions<T> {
  title?: string;
  message: string;
  choices: [string, T][];
}

export const choices = async <T>({
  title,
  message,
  choices,
}: ChoicesOptions<T>): Promise<T | null> => {
  const c = await osd.alert({
    title,
    message,
    choices: choices.map(([a]) => a),
  });

  if (c === null) {
    return null;
  }

  return choices[c][1];
};
