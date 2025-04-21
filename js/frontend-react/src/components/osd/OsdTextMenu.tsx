import { ArrowLeftIcon, Bars3BottomLeftIcon } from '@heroicons/react/24/solid';

import { TextMenuItem, TextMenuOptions } from '1fpga:osd';

import { PropertyList } from '@/components';
import { Badge } from '@/components/ui-kit/badge';
import { Button } from '@/components/ui-kit/button';
import { Divider } from '@/components/ui-kit/divider';
import { Heading, Subheading } from '@/components/ui-kit/heading';
import { Link } from '@/components/ui-kit/link';
import {
  Sidebar,
  SidebarDivider,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
} from '@/components/ui-kit/sidebar';

export interface OsdTextMenuProps<R> {
  resolve: (value: R | void | undefined) => void;
  reject: (reject: any) => void;
  options: TextMenuOptions<R>;
}

export interface OsdTextMenuItemProps<R> {
  item: string | TextMenuItem<R>;
  i: number;
  options: TextMenuOptions<R>;
  resolve: (value: R | void | undefined) => void;
  reject: (error: any) => void;
}

function Separator() {
  return <SidebarDivider className="my-1! mx-0!" />;
}

function OsdTextMenuLabel({ label, marker }: { label: string; marker?: string }) {
  return (
    <SidebarHeader className="w-full p-2! border-0! font-bold bg-white/5">
      <SidebarLabel className="w-80">
        {label}
        {marker && <Badge>{marker}</Badge>}
      </SidebarLabel>
    </SidebarHeader>
  );
}

function OsdTextMenuItem<R>({ item, i, resolve }: OsdTextMenuItemProps<R>) {
  if (typeof item === 'string') {
    if (item.match(/^-+$/)) {
      return <Separator />;
    }
    return <OsdTextMenuLabel label={item} />;
  } else if (item.label.match(/^-+$/)) {
    return <Separator />;
  } else if (item.label && !item.select && !item.details) {
    return <OsdTextMenuLabel label={item.label} marker={item.marker} />;
  }

  const select = async () => {
    if (item.select instanceof Function) {
      resolve(await item.select(item, i));
    } else {
      resolve(item.select);
    }
  };

  const details = async () => {
    if (item.details instanceof Function) {
      const v = await item.details(item, i);
      resolve(v);
    } else {
      resolve(item.details);
    }
  };

  const selectable = item.select !== undefined;

  return (
    <SidebarItem className="cursor-pointer w-full" onClick={select}>
      <SidebarLabel className="w-80">{item.label}</SidebarLabel>
      <div className="w-80">{item.marker && <Badge>{item.marker}</Badge>}</div>
      {item.details && (
        <Link href="" onClick={details}>
          Details
        </Link>
      )}
    </SidebarItem>
  );
}

export function OsdTextMenu<R>({ options, resolve, reject }: OsdTextMenuProps<R>) {
  async function back() {
    if (options.back !== undefined) {
      if (options.back instanceof Function) {
        const v = await options.back();
        resolve(v);
      } else {
        resolve(options.back);
      }
    }
  }

  async function sort() {
    if (options.sort !== undefined) {
      if (options.sort instanceof Function) {
        const v = await options.sort();
        options = { ...options, ...v };
      } else {
        resolve(options.sort);
      }
    }
  }

  return (
    <>
      <Heading>Text Menu</Heading>
      <Divider className="mt-4" />

      <PropertyList properties={options} />

      <Subheading className="mt-8 text-xl!">Menu Items</Subheading>
      <Sidebar className="min-h-5 mt-4 pl-1 border-l-2 border-white/5 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
        {options.items.map((item, i) => (
          <OsdTextMenuItem
            key={`item-${i}`}
            i={i}
            item={item}
            options={options}
            resolve={resolve}
            reject={reject}
          />
        ))}
      </Sidebar>

      <Divider className="py-2 mt-8" />

      {options.back !== undefined && (
        <Button onClick={back}>
          <ArrowLeftIcon /> Back
        </Button>
      )}
      {options.sort !== undefined && (
        <Button onClick={sort}>
          <Bars3BottomLeftIcon />
          Sort
        </Button>
      )}
    </>
  );
}
