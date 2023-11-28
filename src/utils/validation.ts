/**
 * @url https://github.com/ajv-validator/ajv
 * @url https://github.com/ajv-validator/ajv-formats
 * @url https://github.com/ajv-validator/ajv-errors
 */
import Ajv from 'ajv';
import addAjvErrors from 'ajv-errors';
import addFormats from 'ajv-formats';

export const ajv = addFormats(
  addAjvErrors(
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
