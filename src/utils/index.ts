import Ajv, {
  ErrorObject,
  JSONSchemaType,
  KeywordDefinition,
  SchemaObject,
} from 'ajv';

import { AJVMessageFunction, InitialState, useFormErrors } from './types';

import { defaultAJVMessages } from './constants';
import Logger from './Logger';

const getFieldName = (instancePath: string): string | null => {
  if (!instancePath) {
    return null;
  }

  return instancePath.slice(1);
};

const getErrorMessage = (
  error: ErrorObject,
  userDefinedMessages?: Record<string, AJVMessageFunction>,
): string => {
  const UNKNOWN_VALIDATION_ERROR = 'Unknown validation error';

  try {
    const errorObject = error as ErrorObject;
    const keyword = errorObject.keyword;
    const errorMessageFunction = { ...defaultAJVMessages, ...userDefinedMessages }[
      keyword
    ];

    if (typeof errorMessageFunction === 'function') {
      return errorMessageFunction(errorObject.params);
    }

    return error.message || UNKNOWN_VALIDATION_ERROR;
  } catch (_) {
    return UNKNOWN_VALIDATION_ERROR;
  }
};

const resolveConditionalField = (
  schemaPath: string,
  schema: any, // JSONSchemaType<T> or SchemaObject
  logger?: Logger,
): string | null => {
  if (!schemaPath || !schema) return null;

  // Remove JSON Pointer prefix '#/' and split into parts
  const pathParts = schemaPath.replace(/^#\//, '').split('/');

  // Traverse the schema to locate the failing node
  let current: any = schema;
  for (const key of pathParts) {
    if (!current[key]) {
      logger?.log(`Failed to traverse schema path: ${schemaPath}`, {
        current,
        key,
      });
      return null; // Failed to traverse
    }
    current = current[key];
  }

  // Special handling for "if" schema failure
  const match = /allOf\/(\d+)\/if/.exec(schemaPath); // Extract 'allOf' block
  if (match) {
    const index = parseInt(match[1], 10); // Get the index of the allOf clause

    // Access the parent "allOf" clause
    const allOfBlock = schema.allOf?.[index];
    if (allOfBlock?.then) {
      // Check for "required" fields in the "then" clause
      if (allOfBlock.then.required && allOfBlock.then.required.length > 0) {
        const resolvedField = allOfBlock.then.required[0]; // First required field
        logger?.log(`Resolved "if/then" error to required field: ${resolvedField}`);
        return resolvedField;
      }

      // Fallback: Look for properties defined in the "then"
      const propertyKeys = Object.keys(allOfBlock.then.properties || {});
      if (propertyKeys.length > 0) {
        const resolvedProperty = propertyKeys[0];
        logger?.log(
          `Resolved field using fallback in "then.properties": ${resolvedProperty}`,
        );
        return resolvedProperty; // Fallback to the first property key
      }
    } else {
      logger?.log(`Error: 'then' clause missing in schema for path: ${schemaPath}`);
    }
  }

  logger?.log(`Failed to resolve any field for path: ${schemaPath}`);
  return null; // Could not resolve a field
};

export const getErrors = <T extends Record<string, any>>(
  ajvErrors: ErrorObject[],
  userDefinedMessages?: Record<string, AJVMessageFunction>,
  logger?: Logger,
  schema?: JSONSchemaType<T> | SchemaObject,
): useFormErrors<T> => {
  const seenFields = new Set<string>(); // Track field-level errors

  return ajvErrors.reduce((acc, current) => {
    // Try resolving the field from instancePath or schemaPath
    let fieldName = getFieldName(current?.instancePath);

    if (!fieldName && schema && current.schemaPath.includes('/if')) {
      // Resolve conditional "if" errors to corresponding fields
      fieldName = resolveConditionalField(current.schemaPath, schema, logger);
    }

    if (!fieldName) {
      // Log skipped errors for debugging
      logger?.log('Skipping unresolved error:', current);
      return acc;
    }

    if (seenFields.has(fieldName) && current.schemaPath.includes('/if')) {
      // Skip reporting "if" errors if we already have field-level errors
      logger?.log(`Skipping redundant "if" error for field: ${fieldName}`, current);
      return acc;
    }

    // Mark this field as having an error
    seenFields.add(fieldName);

    // Map resolved field name to its error message
    return {
      ...acc,
      [fieldName]: getErrorMessage(current, userDefinedMessages),
    };
  }, {});
};

export const getInitial = <T extends Record<string, any>>(
  initialState: T,
): InitialState<T> => {
  const state: InitialState<T> = {} as InitialState<T>;

  for (const key in initialState) {
    if (Object.prototype.hasOwnProperty.call(initialState, key)) {
      state[key] = { value: initialState[key], error: '' };
    }
  }

  return state;
};

export const getValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return '';
  }

  return value ?? '';
};

export const addUserDefinedKeywords = (
  ajv: Ajv,
  customKeywords: KeywordDefinition[],
): void => {
  customKeywords.forEach((keyword: KeywordDefinition) => {
    if (ajv.getKeyword(keyword.keyword as string)) {
      return;
    }

    ajv.addKeyword(keyword);
  });
};
