"use client";

import { Heading, Subheading } from "@/components/ui-kit/heading";
import { Divider } from "@/components/ui-kit/divider";
import { Text } from "@/components/ui-kit/text";
import { toggleIsOnline, useOnline } from "@/hooks";
import { Toggle } from "@/components/ui-kit/toggle";

export default function Settings() {
  const isOnline = useOnline();

  return (
    <>
      <form method="post" className="mx-auto max-w-4xl">
        <Heading>Settings</Heading>
        <Divider className="my-10 mt-6" />

        <section className="grid gap-x-8 gap-y-6 px-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>Online</Subheading>
            <Text>
              Set whether 1FPGA should be linked to the Internet. A random IP
              address will be generated.
            </Text>
          </div>
          <div className="flex-col flex items-end">
            <Toggle
              name="online"
              checked={isOnline}
              onChange={toggleIsOnline}
            />
          </div>
        </section>
        <Divider className="my-10" soft />
      </form>
    </>
  );
}
