import { CheckIcon, XMarkIcon } from '@heroicons/react/24/solid';
import Form from 'next/form';
import { useState } from 'react';

import { PropertyList } from '@/components';
import { Button } from '@/components/ui-kit/button';
import { Divider } from '@/components/ui-kit/divider';
import { Heading, Subheading } from '@/components/ui-kit/heading';
import { Input } from '@/components/ui-kit/input';

export function OsdPrompt({
  title,
  message,
  default: defaultValue,
  resolve,
}: {
  title?: string;
  message: string;
  default?: string;
  resolve: (v: string | undefined) => void;
}) {
  const [value, setValue] = useState<string>(defaultValue ?? '');

  return (
    <>
      <Heading>Prompt</Heading>
      <PropertyList properties={{ title, message, default: defaultValue }} />
      <Subheading>Value</Subheading>
      <Form action={() => resolve(value)}>
        <Input autoFocus={true} value={value} onChange={e => setValue(e.target.value)} />
        <Divider className="py-2 mt-8" />
        <div className="flex flex-row space-x-1">
          <Button onClick={() => resolve(value)}>
            <CheckIcon /> Submit
          </Button>
          <Button onClick={() => resolve(undefined)}>
            <XMarkIcon /> Cancel
          </Button>
        </div>
      </Form>
    </>
  );
}
