'use client';

import { useEffect, useState } from 'react';

import { Divider } from '@/components/ui-kit/divider';
import { Heading, Subheading } from '@/components/ui-kit/heading';
import { Input } from '@/components/ui-kit/input';
import { Text } from '@/components/ui-kit/text';
import { Toggle } from '@/components/ui-kit/toggle';
import { toggleIsOnline, useOnline } from '@/hooks';

function send(query: string, bindings: any[] = []) {
  return fetch('/api/db', {
    method: 'POST',
    body: JSON.stringify({
      db: '1fpga/1fpga.sqlite',
      query,
      bindings,
      mode: 'query',
    }),
  }).then(res => res.json());
}

function GlobalSetting({ name }: { name: string }) {
  const [value, setValue] = useState<string | null>(null);

  useEffect(() => {
    send('SELECT value FROM GlobalStorage WHERE key = ?', [name])
      .then(row => row[0])
      .then(({ value }) => setValue(value));
  }, [name]);

  return (
    <div className="flex flex-row w-full">
      <div className="flex-1">{name}</div>
      <div className="flex-1">
        <Input
          defaultValue={value ?? ''}
          onChange={e => {
            setValue(e.target.value);
          }}
        />
      </div>
    </div>
  );
}

function GlobalSettingList() {
  const [keys, setKeys] = useState<string[]>([]);

  useEffect(() => {
    send('SELECT key FROM GlobalStorage').then(rows => setKeys(rows.map((r: any) => r.key)));
  }, []);

  function newValue() {}

  return (
    <>
      {keys.map(key => (
        <div key={key}>
          <GlobalSetting name={key} />
        </div>
      ))}
      {}
    </>
  );
}

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
              Set whether 1FPGA should be connected to the Internet. A random IP address will be
              generated.
            </Text>
          </div>
          <div className="flex-col flex items-end">
            <Toggle name="online" checked={isOnline} onChange={toggleIsOnline} />
          </div>
        </section>
        <Divider className="my-10" soft />

        <section className="grid gap-x-8 gap-y-6 px-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>Global Settings</Subheading>
            <Text className="mb-8">Settings that are not associated with a user.</Text>
          </div>
          <div className="flex-col flex items-end">
            <GlobalSettingList />
          </div>
        </section>
        <Divider className="my-10" soft />
      </form>
    </>
  );
}
