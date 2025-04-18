import { Subheading } from "@/components/ui-kit/heading";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui-kit/table";
import { Textarea } from "@/components/ui-kit/textarea";

export function PropertyList({
  properties,
}: {
  properties: Record<string, any>;
}) {
  return (
    <>
      <Subheading className="mt-8 text-xl!">Properties</Subheading>
      <Table className="ml-4 mt-4">
        <TableBody>
          {Object.entries(properties).map(([k, v]) => (
            <TableRow key={k}>
              <TableCell width={100}>{k}</TableCell>
              <TableCell>
                <Textarea disabled={true} value={JSON.stringify(v)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
