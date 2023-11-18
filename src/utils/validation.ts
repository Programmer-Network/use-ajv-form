/**
 * @url https://github.com/ajv-validator/ajv
 * @url https://github.com/ajv-validator/ajv-formats
 * @url https://github.com/ajv-validator/ajv-errors
 */
import Ajv, { KeywordDefinition } from 'ajv';
import addCustomMessages from 'ajv-errors';
import addFormats from 'ajv-formats';
// @ts-expect-error - Currently, there is no type definition for this package.
import programmerNetworkAjv from 'programmer-network-ajv';

const { keywords } = programmerNetworkAjv;

export const ajv = addFormats(
  addCustomMessages(
    new Ajv({
      allErrors: true,
      $data: true,
      strict: true,
      strictTypes: true,
      strictSchema: true,
      strictRequired: true,
      strictNumbers: true,
      strictTuples: true,
      coerceTypes: true,
      removeAdditional: true,
      useDefaults: true,
    }),
  ),
);

keywords.map((keyword: string | KeywordDefinition, _?: KeywordDefinition) =>
  ajv.addKeyword(keyword),
);
