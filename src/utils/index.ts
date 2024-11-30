import Ajv, {
  ErrorObject,
  JSONSchemaType,
  KeywordDefinition,
  SchemaObject,
} from 'ajv';

import { AJVMessageFunction, FormField, IState, useFormErrors } from './types';

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
  schema: JSONSchemaType<T> | SchemaObject,
): IState<T> => {
  const state: IState<T> = {} as IState<T>;
  const requiredFields = new Set((schema.required || []) as (keyof T)[]);

  for (const key in initialState) {
    if (Object.prototype.hasOwnProperty.call(initialState, key)) {
      state[key] = {
        value: initialState[key],
        error: '',
        isRequired: requiredFields.has(key),
      };
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

/**
 * Updates the value of a single field in the form state.
 *
 * @template T - The type representing the form state.
 * @param {IState<T>} state - The current form state.
 * @param {keyof T} fieldName - The name of the field to update.
 * @param {FormField<T>[keyof T]} value - The new value for the field.
 * @returns {IState<T>} - The updated form state.
 */
const updateFieldValue = <T extends Record<string, any>>(
  state: IState<T>,
  fieldName: keyof T,
  value: any,
): IState<T> => {
  return {
    ...state,
    [fieldName]: {
      ...state[fieldName],
      value,
    },
  };
};

/**
 * Evaluates whether a field should be `isRequired` based on its parent's value and the schema conditions.
 *
 * @template T - The type representing the form state.
 * @param {keyof T} fieldName - The dependent field name.
 * @param {keyof T} parentFieldName - The parent field name.
 * @param {FormField<T>[keyof T]} parentValue - The current value of the parent field.
 * @param {SchemaObject | JSONSchemaType<T>} schema - The schema defining the dependencies and validation rules.
 * @returns {boolean} - Whether the dependent field should be required.
 */
const evaluateFieldDependency = <T>(
  fieldName: keyof T,
  parentFieldName: keyof T,
  parentValue: any,
  schema: SchemaObject | JSONSchemaType<T>,
): boolean => {
  return (
    schema.allOf?.some((condition: any) => {
      return (
        condition.if?.properties?.[parentFieldName]?.const === parentValue &&
        condition.then?.required?.includes(fieldName as string)
      );
    }) || false
  );
};

/**
 * Updates the `isRequired` property for dependent fields dynamically based on the schema.
 *
 * @template T - The type representing the form state.
 * @param {IState<T>} state - The current form state.
 * @param {keyof T} parentFieldName - The name of the parent field.
 * @param {FormField<T>[keyof T]} parentValue - The current value of the parent field.
 * @param {Record<string, string[]>} fieldDependencies - The map of parent fields to their dependent fields.
 * @param {SchemaObject | JSONSchemaType<T>} schema - The schema defining the dependencies and validation rules.
 * @returns {IState<T>} - The updated form state.
 */
const updateDynamicRequiredFields = <T>(
  state: IState<T>,
  parentFieldName: keyof T,
  parentValue: any,
  fieldDependencies: Record<string, string[]>,
  schema: SchemaObject | JSONSchemaType<T>,
): IState<T> => {
  const relatedFields = fieldDependencies[parentFieldName as string] || [];

  return relatedFields.reduce(
    (updatedState, childFieldName) => {
      const fieldName = childFieldName as keyof T;

      const isRequired = evaluateFieldDependency(
        fieldName,
        parentFieldName,
        parentValue,
        schema,
      );

      return {
        ...updatedState,
        [fieldName]: {
          ...updatedState[fieldName],
          isRequired,
        },
      };
    },
    { ...state },
  );
};

/**
 * Gets the form state with new field values and dynamically updates `isRequired` for dependent fields.
 *
 * @template T - The type representing the form state.
 * @param {IState<T>} prevState - The current state of the form.
 * @param {Partial<FormField<T>>} form - The updated field values to apply.
 * @param {Record<string, string[]>} fieldDependencies - A map of parent fields to their dependent fields.
 * @param {SchemaObject | JSONSchemaType<T>} schema - The schema defining form validation and dependencies (e.g., `if/then`).
 * @returns {IState<T>} - The updated form state with new values and dynamically updated `isRequired` flags.
 */
export const getFormState = <T extends Record<string, any>>(
  prevState: IState<T>,
  form: Partial<FormField<T>>,
  fieldDependencies: Record<string, string[]>,
  schema: SchemaObject | JSONSchemaType<T>,
): IState<T> => {
  return Object.keys(form).reduce((updatedState, key) => {
    const fieldName = key as keyof T;
    const value = getValue(form[fieldName]);

    const stateWithUpdatedFieldValue = updateFieldValue(
      updatedState,
      fieldName,
      value,
    );

    return updateDynamicRequiredFields(
      stateWithUpdatedFieldValue,
      fieldName,
      value,
      fieldDependencies,
      schema,
    );
  }, prevState);
};
