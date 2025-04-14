export interface OsdProps {
  id?: string;
}

export function Osd({ id }: OsdProps) {
  return (
    <div className="flex flex-col items-center spacing-">
      <h1>OSD</h1>
      <div id={id} className="border-amber-50 border-2 h-96 w-1/2"></div>
    </div>
  );
}
