'use client';

import { TrashIcon } from '@heroicons/react/24/solid';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui-kit/button';
import { Divider } from '@/components/ui-kit/divider';
import { Heading, Subheading } from '@/components/ui-kit/heading';
import { Input } from '@/components/ui-kit/input';
import { Text } from '@/components/ui-kit/text';
import { Toggle } from '@/components/ui-kit/toggle';
import { useOneFpga, useVersion } from '@/hooks';

export default function Home() {
  const { start, started, stop } = useOneFpga();
  const [version, setVersion] = useVersion();
  const [disabled, setDisabled] = useState(false);
  const router = useRouter();

  async function toggleStart() {
    setDisabled(true);
    try {
      if (started) {
        await stop();
      } else {
        await start();
        router.push('/osd');
      }
    } finally {
      setDisabled(false);
    }
  }

  async function doReset() {
    if (confirm('Are you sure you want to reset the whole 1FPGA filesystem?')) {
      await fetch('/api/reset', { method: 'POST' });
    }
  }

  return (
    <>
      <form method="post" className="mx-auto max-w-4xl">
        <Heading>Home</Heading>
        <Divider className="my-10 mt-6" />

        <section className="grid gap-x-8 gap-y-6 px-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>1FPGA</Subheading>
            <Text>Start (or stop) the 1FPGA frontend.</Text>
          </div>
          <div className="flex-col flex items-end">
            <Toggle name="start" checked={started} onChange={toggleStart} disabled={disabled} />
          </div>
        </section>
        <Divider className="my-10" soft />

        <section className="grid gap-x-8 gap-y-6 px-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>Database</Subheading>
            <Text>
              Reset the database and the filesystem to its original state.
              <span className="block text-xs text-zinc-600">
                Only available when the frontend is stopped.
              </span>
            </Text>
          </div>
          <div className="flex-col flex items-end">
            <Button onClick={doReset} disabled={disabled || started}>
              <TrashIcon />
              Reset
            </Button>
          </div>
        </section>
        <Divider className="my-10" soft />

        <section className="grid gap-x-8 gap-y-6 px-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Subheading>Version</Subheading>
            <Text>
              Set the 1FPGA binary version (MAJOR.MINOR.PATCH).
              <span className="block text-xs text-zinc-600">
                Only available when the frontend is stopped.
              </span>
            </Text>
          </div>
          <div className="flex-col flex items-end">
            <div className="flex flex-row gap-2 items-baseline">
              <div className="flex-1">
                <Input
                  className="flex-1"
                  type="number"
                  pattern="\d+"
                  min={0}
                  disabled={disabled || started}
                  onChange={e => setVersion([e.target.valueAsNumber, version[1], version[2]])}
                  value={version[0]}
                />
              </div>
              <div>.</div>
              <div className="flex-1">
                <Input
                  className="flex-1"
                  type="number"
                  pattern="\d+"
                  disabled={disabled || started}
                  onChange={e => setVersion([version[0], e.target.valueAsNumber, version[2]])}
                  value={version[1]}
                />
              </div>
              <div>.</div>
              <div className="flex-1">
                <Input
                  className="flex-1"
                  type="number"
                  pattern="\d+"
                  disabled={disabled || started}
                  onChange={e => setVersion([version[0], version[1], e.target.valueAsNumber])}
                  value={version[2]}
                />
              </div>
            </div>
          </div>
        </section>
        <Divider className="my-10" soft />
      </form>
    </>
  );
}
