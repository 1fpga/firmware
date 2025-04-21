import { PropertyList } from '@/components';
import { Button } from '@/components/ui-kit/button';
import { Divider } from '@/components/ui-kit/divider';
import { Heading, Subheading } from '@/components/ui-kit/heading';
import { Sidebar, SidebarItem } from '@/components/ui-kit/sidebar';
import { Text } from '@/components/ui-kit/text';

export interface OsdAlertProps {
  title?: string;
  message: string;
  choices?: string[];
  resolve: (result: null | number) => void;
}

export function OsdAlert({ title, message, choices, resolve }: OsdAlertProps) {
  function select(i: number | null) {
    resolve(i);
  }

  return (
    <>
      <Heading>Alert</Heading>
      <Divider className="mt-4" />

      <PropertyList
        properties={{
          title,
          choices,
        }}
      />

      <Subheading className="mt-8 text-xl!">Message</Subheading>
      <Text className="ml-2 mt-4 text-lg!">{message}</Text>

      <Subheading className="mt-8 text-xl!">Choices</Subheading>
      {choices ? (
        <>
          <Sidebar className="mt-4">
            {choices.map((choice, i) => (
              <SidebarItem key={`choice-${i}`} onClick={() => select(i)}>
                {choice}
              </SidebarItem>
            ))}
          </Sidebar>

          <Button className="mt-4 ml-2" onClick={() => select(null)}>
            Back
          </Button>
        </>
      ) : (
        <Button className="mt-4 ml-2" onClick={() => select(null)}>
          OK
        </Button>
      )}
    </>
  );
}

export function OsdShow({ title, message }: { title?: string; message: string }) {
  return (
    <>
      <Heading>Show</Heading>
      <Divider className="mt-4" />

      <Subheading className="mt-8 text-xl!">Title</Subheading>
      <Text className="mt-4 text-xl!">{title ?? ''}</Text>

      <Subheading className="mt-8 text-xl!">Message</Subheading>
      <Text className="ml-2 mt-4 text-lg!">{message}</Text>
    </>
  );
}
