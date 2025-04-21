import { ArrowPathIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/solid';
import normalize from 'path-normalize';
import { useEffect, useMemo, useState } from 'react';

import { SelectFileOptions } from '1fpga:osd';

import { PropertyList } from '@/components';
import { Button } from '@/components/ui-kit/button';
import { Divider } from '@/components/ui-kit/divider';
import { Heading, Subheading } from '@/components/ui-kit/heading';
import { Sidebar, SidebarItem, SidebarLabel } from '@/components/ui-kit/sidebar';
import { Code, Text } from '@/components/ui-kit/text';

export interface OsdSelectFileProps {
  title: string;
  initialDir: string;
  options: SelectFileOptions;
  resolve: (result: string | undefined) => void;
}

export function OsdSelectFile({ title, initialDir, options, resolve }: OsdSelectFileProps) {
  const [dir, setDirInner] = useState(initialDir);
  const [files, setFiles] = useState<[string, boolean, number][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [refresh, setRefresh] = useState(false);

  function setDir(newDir: string) {
    setDirInner(normalize(newDir));
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/fs/list', {
          method: 'POST',
          body: JSON.stringify({
            dir,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
        }
        const data: [string, boolean, number][] = await response.json();
        setFiles(data);
        setError(null);
      } catch (e) {
        setError(e);
        setFiles([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [dir, refresh]);

  // Filter by options.
  const filtered = useMemo(() => {
    let f = files.sort((a, b) => a[0].localeCompare(b[0]));
    if (options.extensions) {
      f = f.filter(([name, isDir]) => {
        const ext = name.match(/\.[^.]+$/)?.[0] ?? '';
        return isDir || options.extensions?.includes(ext);
      });
    }
    if (options.directory === true) {
      f = f.filter(([_, isDir]) => isDir);
    }
    if (options.showHidden === true) {
      f = f.filter(([name]) => !name.startsWith('.'));
    }
    if (options.filterPattern) {
      const re = new RegExp(options.filterPattern);
      f = f.filter(([name]) => !!name.match(re));
    }

    if (options.dirFirst) {
      f = files.sort((a, b) => {
        return Number(a[1]) - Number(b[1]);
      });
    }

    return f;
  }, [files, options]);

  const canGoUp = options.allowBack !== false ? dir !== '/' : dir.startsWith(initialDir);

  function goUp() {
    const up = dir.replace(/[^\/]+\/?$/, '');
    setDir(up === '' ? '/' : up);
  }

  function select(name: string, isDir: boolean) {
    if (isDir) {
      setDir(`${dir}/${name}`);
    } else {
      resolve(`${dir}/${name}`);
    }
  }

  return (
    <>
      <Heading>File Select</Heading>
      <Divider className="mt-4" />

      <PropertyList
        properties={{
          title,
          initialDir,
          ...options,
        }}
      />

      <Subheading className="mt-8 text-xl!">Current Directory</Subheading>
      <Code>{dir}</Code>

      <Subheading className="mt-8 text-xl!">Files</Subheading>
      {loading ? (
        <Text>Loading...</Text>
      ) : (
        <>
          <Sidebar className="min-h-5 mt-4 pl-1 border-l-2 border-white/5 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
            {canGoUp && <SidebarItem onClick={goUp}>..</SidebarItem>}
            {filtered.map(([name, isDir, size]) => (
              <SidebarItem key={`${dir}/${name}`} onClick={() => select(name, isDir)}>
                <SidebarLabel>
                  {options.showExtensions === false ? name.replace(/\.[^.]+$/, '') : name}
                  {isDir ? '/' : ` (${size} bytes)`}
                </SidebarLabel>
              </SidebarItem>
            ))}
          </Sidebar>

          <Divider className="py-2 mt-8" />
          {options.directory === true && (
            <Button className="mx-2" onClick={() => resolve(dir)}>
              <CheckIcon />
              Select
            </Button>
          )}
          <Button className="mx-2" onClick={() => resolve(undefined)}>
            <XMarkIcon />
            Cancel
          </Button>
          {window.location.hostname === 'localhost' && (
            <Button className="mx-2" onClick={() => setRefresh(r => !r)}>
              <ArrowPathIcon />
              Refresh
            </Button>
          )}
        </>
      )}
    </>
  );
}
