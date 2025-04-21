import * as zod from 'zod';

/**
 * A version number or version string. If a string, it is expected to
 * be semver-ish.
 */
export const Version = zod
  .string()
  .min(1)
  .max(64)
  .regex(/^[0-9a-zA-Z][-0-9a-zA-Z._@()+]*$/)
  .or(zod.number())
  .describe('Version number');

export type Version = zod.TypeOf<typeof Version>;

export const UrlOrRelative = zod.url().or(
  zod
    .string()
    .min(1)
    .check(
      // Allow URL strings relative to a base, so need to validate with a random base.
      ctx => {
        try {
          new URL(ctx.value, 'p://example.com/');
        } catch (e) {
          ctx.issues.push({
            message: `${e}`,
            input: ctx.value,
          });
        }
      },
    ),
);

export type UrlOrRelative = zod.TypeOf<typeof UrlOrRelative>;

export const ShortName = zod
  .string()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_-]+$/);

export type ShortName = zod.TypeOf<typeof ShortName>;

export const Tag = ShortName;
export type Tag = zod.TypeOf<typeof ShortName>;

export const Hex = zod.string().regex(/^[0-9a-fA-F]+$/);
export type Hex = zod.TypeOf<typeof Hex>;

export const Base64 = zod
  .string()
  .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/);
export type Base64 = zod.TypeOf<typeof Base64>;

export const File = zod.object({
  url: UrlOrRelative,
  type: zod.string().optional().describe('A mimetype for the file.'),
  size: zod.number().describe('The size (in bytes) of the file.'),
  sha256: Hex.length(64).describe('The SHA256 hash of the file, in hexadecimal.'),
  signature: Base64.describe('The signature of the file, in base64.').optional(),
});
export type File = zod.TypeOf<typeof File>;

export function UrlVersionedType<Inner extends zod.Schema>(inner: Inner) {
  return zod.union([inner, UrlOrRelative, zod.object({ url: UrlOrRelative, version: Version })]);
}

export type UrlVersionedType<Inner extends zod.Schema> = zod.TypeOf<
  ReturnType<typeof UrlVersionedType<Inner>>
>;

export const Links = zod
  .object({
    homepage: zod.url().optional(),
    github: zod.url().optional(),
  })
  .catchall(zod.url());
