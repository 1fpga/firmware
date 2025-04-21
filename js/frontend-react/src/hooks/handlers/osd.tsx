import { SelectFileOptions } from '1fpga:osd';

import { OsdAlert, OsdPrompt, OsdSelectFile, OsdShow, OsdTextMenu } from '@/components/osd';
import { createView, register } from '@/hooks';

export async function alert({
  messageOrOptions,
  orMessage,
}: {
  messageOrOptions:
    | string
    | {
        title?: string;
        message: string;
        choices?: string[];
      };
  orMessage: string;
}): Promise<void | null | number> {
  // Resolve which version of alert was called.
  const { message, title, choices } =
    typeof messageOrOptions !== 'string'
      ? messageOrOptions
      : {
          message: orMessage ?? messageOrOptions,
          title: orMessage === undefined ? undefined : orMessage,
        };

  let { promise, resolve } = Promise.withResolvers<number | null>();
  createView('osd', () => (
    <OsdAlert message={message} title={title} choices={choices} resolve={resolve} />
  ));

  const result = await promise;
  return result ?? null;
}

async function textMenu({ options }: any) {
  let { promise, resolve, reject } = Promise.withResolvers<any>();
  createView('osd', () => <OsdTextMenu options={options} resolve={resolve} reject={reject} />);

  return await promise;
}

async function prompt({
  messageOrOptions,
}: {
  messageOrOptions:
    | string
    | {
        title?: string;
        message: string;
        default?: string;
      };
}) {
  const {
    title,
    default: defaultValue,
    message,
  } = typeof messageOrOptions === 'string' ? { message: messageOrOptions } : messageOrOptions;

  const { promise, resolve } = Promise.withResolvers<string | undefined>();
  createView('osd', () => (
    <OsdPrompt title={title} default={defaultValue} message={message} resolve={resolve} />
  ));

  return await promise;
}

export async function selectFile({
  title,
  initialDir,
  options,
}: {
  title: string;
  initialDir: string;
  options: SelectFileOptions;
}): Promise<string | undefined> {
  const { promise, resolve } = Promise.withResolvers<string | undefined>();

  createView('osd', () => (
    <OsdSelectFile title={title} initialDir={initialDir} options={options} resolve={resolve} />
  ));

  return promise;
}

export async function show({
  messageOrTitle,
  message,
}: {
  messageOrTitle: string;
  message?: string;
}) {
  let title = undefined;
  if (message !== undefined) {
    title = messageOrTitle;
  } else {
    message = messageOrTitle;
  }

  createView('osd', () => <OsdShow title={title} message={message} />);
}

export function registerHandlers() {
  register('osd.alert', alert);
  register('osd.textMenu', textMenu);
  register('osd.prompt', prompt);
  register('osd.selectFile', selectFile);
  register('osd.show', show);
}
