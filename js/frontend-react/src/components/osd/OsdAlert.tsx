import { Heading, Subheading } from "@/components/ui-kit/heading";
import { Divider } from "@/components/ui-kit/divider";
import { Textarea } from "@/components/ui-kit/textarea";
import { Button } from "@/components/ui-kit/button";
import { Sidebar, SidebarItem } from "@/components/ui-kit/sidebar";
import { PropertyList } from "@/components";

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
          Title: title,
        }}
      />

      <Subheading className="mt-8 text-xl!">Message</Subheading>
      <Textarea
        className="mt-4 text-xl! h-64"
        disabled={true}
        value={message}
      />

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

          <Button className="mt-4 ml-4" onClick={() => select(null)}>
            Back
          </Button>
        </>
      ) : (
        <Button className="mt-4 ml-4" onClick={() => select(null)}>
          OK
        </Button>
      )}
    </>
  );
}
