import { TextMenuItem, TextMenuOptions } from "1fpga:osd";
import { Heading, Subheading } from "@/components/ui-kit/heading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui-kit/table";
import { Button } from "@/components/ui-kit/button";
import { Divider } from "@/components/ui-kit/divider";

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
  return <TableRow />;
}

function OsdTextMenuLabel({
                            label,
                            marker,
                          }: {
  label: string;
  marker?: string;
}) {
  return (
    <TableRow>
      <TableCell>{label}</TableCell>
      <TableCell>{marker}</TableCell>
      <TableCell />
    </TableRow>
  );
}

function OsdTextMenuItem<R>({ item, i, resolve }: OsdTextMenuItemProps<R>) {
  if (typeof item === "string") {
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
    <TableRow
      className="cursor-pointer has-[[data-row-link][data-focus]]:outline-2 has-[[data-row-link][data-focus]]:-outline-offset-2 has-[[data-row-link][data-focus]]:outline-blue-500 dark:focus-within:bg-white/[2.5%]"
      title={`Row ${i} with label "${item.label}"`}
      onClick={select}
    >
      <TableCell>{item.label}</TableCell>
      <TableCell className="text-zinc-500">{item.marker}</TableCell>
      <TableCell className="text-right">
        <Button onClick={select}>Select</Button>
        {item.details && <Button onClick={details}>Details</Button>}
      </TableCell>
    </TableRow>
  );
}

export function OsdTextMenu<R>({
                                 options,
                                 resolve,
                                 reject,
                               }: OsdTextMenuProps<R>) {
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

  return (
    <>
      <Heading>Text Menu</Heading>
      <Divider />
      {options.title && (<Subheading>
        Title: <code>{JSON.stringify(options.title)}</code>
      </Subheading>)
      }

      {options.}

      <Table className="mt-8 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
        <TableHead>
          <TableRow>
            <TableHeader>Label</TableHeader>
            <TableHeader>Marker</TableHeader>
            <TableHeader>Actions</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
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
        </TableBody>
      </Table>

      <Divider />

      <Button onClick={back} disabled={options.back === undefined}>
        Back
      </Button>
    </>
  );
}

/**
 * To facilitate creating this component in the adapter 1fpga layer.
 */
export function createOsdTextMenu<R>(props: OsdTextMenuProps<R>) {
  return <OsdTextMenu {...props} />;
}
