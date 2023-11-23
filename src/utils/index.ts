import { ErrorObject } from 'ajv';

import { InitialState, useFormErrors } from './types';

import { DefaultAJVMessages } from './types';
import { defaultAJVMessages } from './constants';
import { customKeywordNames } from './validation';

// TODO: Is there a better way to do this?
// This is error prone because not all keywords are covered.
const getFieldName = (field: ErrorObject): string | null => {
  if (customKeywordNames.includes(field.keyword)) {
    return field.instancePath.slice(1);
  }

  switch (field.keyword) {
    case 'required':
      return field.params.missingProperty;
    case 'errorMessage':
    case 'minimum':
    case 'maximum':
    case 'type':
    case 'minItems':
    case 'maxItems':
    case 'minLength':
    case 'maxLength':
    case 'format':
    case 'secure-string':
      return field.instancePath.slice(1);
    default:
      return null;
  }
};

const getErrorMessage = (error: ErrorObject): string => {
  const UNKNOWN_VALIDATION_ERROR = 'Unknown validation error';

  try {
    const keyword = error.keyword as keyof DefaultAJVMessages;
    const errorMessageFunction = defaultAJVMessages[keyword];

    if (typeof errorMessageFunction === 'function') {
      return errorMessageFunction(error.params);
    }

    return error.message || UNKNOWN_VALIDATION_ERROR;
  } catch (_) {
    return UNKNOWN_VALIDATION_ERROR;
  }
};

export const getErrors = <T extends Record<string, any>>(
  ajvErrors: ErrorObject[],
): useFormErrors<T> => {
  return ajvErrors.reduce((acc, current) => {
    const fieldName: string | null = getFieldName(current);
    if (!fieldName) {
      return acc;
    }

    return {
      ...acc,
      [fieldName]: getErrorMessage(current),
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
