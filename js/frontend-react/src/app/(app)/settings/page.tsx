"use client";

import { Heading, Subheading } from "@/components/ui-kit/heading";
import { Divider } from "@/components/ui-kit/divider";
import { Text } from "@/components/ui-kit/text";
import { toggleIsOnline, useOnline } from "@/hooks";
import { Checkbox, CheckboxField } from "@/components/ui-kit/checkbox";
import { Label } from "@/components/ui-kit/fieldset";

export default function Settings() {
  const isOnline = useOnline();

  return (
    <>
      <form method="post" className="mx-auto max-w-4xl">
        <Heading>Settings</Heading>
        <Divider className="my-10 mt-6" />

        <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>Online</Subheading>
            <Text>
              Set whether 1FPGA should be linked to the Internet. A random IP
              address will be generated.
            </Text>
          </div>
          <div>
            <CheckboxField>
              <Checkbox
                name="online"
                checked={isOnline}
                onChange={toggleIsOnline}
              />
              <Label>Online</Label>
            </CheckboxField>
          </div>
        </section>
        <Divider className="my-10" soft />
      </form>
    </>
  );
}
