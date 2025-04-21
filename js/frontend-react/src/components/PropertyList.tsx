import { Subheading } from '@/components/ui-kit/heading';
import { Input } from '@/components/ui-kit/input';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui-kit/table';
import { Textarea } from '@/components/ui-kit/textarea';

export function PropertyList({ properties }: { properties: Record<string, any> }) {
  return (
    <>
      <Subheading className="mt-8 text-xl!">Properties</Subheading>
      <Table className="ml-4 mt-4 space-y-0">
        <TableBody className="--spacing(1)">
          {Object.entries(properties).map(([k, v]) => {
            const value = JSON.stringify(v) ?? 'undefined';
            return (
              <TableRow key={k}>
                <TableCell width={100} className="py-1!">
                  {k}
                </TableCell>
                <TableCell className="py-1!">
                  {value.length > 80 ? (
                    <Textarea disabled={true} value={value} />
                  ) : (
                    <Input disabled={true} value={value} />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}
