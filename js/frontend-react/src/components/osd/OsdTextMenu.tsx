import { TextMenuItem, TextMenuOptions } from "1fpga:osd";

export interface OsdTextMenuProps<R> {
  resolve: (value: R) => void;
  reject: (reject: any) => void;
  options: TextMenuOptions<R>;
}

function OsdTextMenuItem<R>({
  item,
  i,
  options,
  resolve,
}: {
  item: string | TextMenuItem<R>;
  i: number;
  options: TextMenuOptions<R>;
  resolve: (value: R) => void;
}) {
  if (typeof item === "string") {
    if (item.match(/^-+$/)) {
      return <hr />;
    }
    return <div>{item}</div>;
  }

  const select = async () => {
    if (item.select instanceof Function) {
      const v = await item.select(item, i);
      if (v === undefined) {
        return;
      }
      return resolve(v);
    }
    return resolve(item);
  };

  return (
    <li className="flex flex-row justify-between" onClick={select}>
      <span>- {item.label}</span>
      <span>
        <button>Select</button>
      </span>
    </li>
  );
}

export function OsdTextMenu<R>({
  options,
  resolve,
  reject,
}: OsdTextMenuProps<R>) {
  console.log("OsdTextMenu", options);

  return (
    <div className="osd-text-menu p-1 font-mono">
      <h1 className="bg-blue-800 mb-2">
        Text Menu (title: {JSON.stringify(options.title)})
      </h1>

      <ul className="flex flex-col space-y-1">
        {options.items.map((item, i) => (
          <OsdTextMenuItem
            key={`item-${i}`}
            item={item}
            i={i}
            options={options}
          />
        ))}
      </ul>
    </div>
  );
}

/**
 * To facilitate creating this component in the adapter 1fpga layer.
 */
export function createOsdTextMenu<R>(props: OsdTextMenuProps<R>) {
  return <OsdTextMenu {...props} />;
}
