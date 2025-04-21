import { createView, isOnline, register } from "@/hooks";
import { OsdAlert, OsdTextMenu } from "@/components/osd";

export async function alert(
  { messageOrOptions, orMessage }:
    {
      messageOrOptions:
        | string
        | {
        title?: string;
        message: string;
        choices?: string[];
      },
      orMessage: string
    },
): Promise<void | null | number> {
  // Resolve which version of alert was called.
  const { message, title, choices } =
    typeof messageOrOptions !== "string"
      ? messageOrOptions
      : {
        message: orMessage ?? messageOrOptions,
        title: orMessage === undefined ? undefined : orMessage,
      };

  let { promise, resolve } = Promise.withResolvers<number | null>();
  createView("osd", () => (
    <OsdAlert
      message={message}
      title={title}
      choices={choices}
      resolve={resolve}
    />
  ));

  const result = await promise;
  return result ?? null;
}

async function textMenu({ options }: any) {
  let { promise, resolve, reject } = Promise.withResolvers<any>();
  createView("osd", () => (
    <OsdTextMenu options={options} resolve={resolve} reject={reject} />
  ));

  return await promise;
}

export function registerHandlers() {
  register("osd.textMenu", textMenu);
  register("osd.alert", alert);

  register("net.isOnline", async () => {
    return isOnline();
  });
}
