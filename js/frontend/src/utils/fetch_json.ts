import { ValidateFunction } from 'ajv';
import production from 'consts:production';

import * as net from '1fpga:net';
import * as osd from '1fpga:osd';

export class ValidationError extends Error {
  constructor(public readonly errors: any) {
    if (!production) {
      debugger;
    }

    let message = '' + errors;
    if (Array.isArray(errors)) {
      message = `Validation error:\n  ` + errors.map((e: any) => JSON.stringify(e)).join('\n  ');
    } else if (errors.name === '$ZodError') {
      message = errors.message;
    }
    super(message);
  }
}

export interface FetchJsonAndValidateOptions {
  allowRetry?: boolean | 'onlyFetch';
  onPreValidate?: (json: any) => Promise<void>;
}

/**
 * Fetch a JSON file from the internet and validate it.
 * @param url The URL to fetch.
 * @param validate The validation function to use.
 * @param options Options for fetching the url.
 * @returns The parsed JSON.
 */
export async function fetchJsonAndValidate<T>(
  url: string,
  validate:
    | ValidateFunction<T>
    | {
        safeParseAsync(v: unknown): Promise<{ success: true } | { success: false; error: any }>;
      }
    | ((json: unknown) => boolean | Promise<boolean>),
  { allowRetry = true, onPreValidate }: FetchJsonAndValidateOptions = {},
): Promise<T> {
  while (true) {
    let fetching = true;
    try {
      const response = await net.fetchJson(url);
      fetching = false;

      if (onPreValidate) {
        await onPreValidate(response);
      }

      let valid = false;
      let error = null;
      if (validate instanceof Function) {
        valid = await validate(response);
        if (!valid) {
          error = (validate as any).errors ?? [];
        }
      } else {
        const result = await validate.safeParseAsync(response);

        valid = result.success;
        if (!result.success) {
          error = result.error;
        }
      }
      if (valid) {
        return response;
      } else {
        console.warn(`Validation error: ${JSON.stringify(error)}`);
        throw new ValidationError(error);
      }
    } catch (e) {
      if (allowRetry === 'onlyFetch') {
        allowRetry = fetching;
      }

      if (!allowRetry) {
        console.warn(`Error fetching JSON: ${e}`);
        throw e;
      }

      let message = (e as any)?.message ?? `${e}`;
      if (message.toString() == '[object Object]' || !message) {
        message = JSON.stringify(e);
      }

      const choice = await osd.alert({
        title: 'Error fetching JSON',
        message: `URL: ${url}\n\n${(e as any)?.message ?? JSON.stringify(e)}\n`,
        choices: ['Retry fetching', 'Cancel'],
      });

      if (choice === 1) {
        throw e;
      }
    }
  }
}
