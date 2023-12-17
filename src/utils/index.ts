import Ajv, { ErrorObject, KeywordDefinition } from 'ajv';

import { AJVMessageFunction, InitialState, useFormErrors } from './types';

// import { DefaultAJVMessages } from './types';
import { defaultAJVMessages } from './constants';

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

export const getErrors = <T extends Record<string, any>>(
  ajvErrors: ErrorObject[],
  userDefinedMessages?: Record<string, AJVMessageFunction>,
): useFormErrors<T> => {
  return ajvErrors.reduce((acc, current) => {
    const fieldName: string | null = getFieldName(current?.instancePath);
    if (!fieldName) {
      return acc;
    }

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
