import { ErrorObject } from 'ajv';

export type AJVErrorParams = {
  limit?: number;
  missingProperty?: string;
  allowedValues?: string[];
  format?: string;
  type?: string;
};

export type AJVMessageFunction = (data: AJVErrorParams) => string;

export type DefaultAJVMessages = {
  required: AJVMessageFunction;
  minLength: AJVMessageFunction;
  maxLength: AJVMessageFunction;
  pattern: AJVMessageFunction;
  minimum: AJVMessageFunction;
  maximum: AJVMessageFunction;
  enum: AJVMessageFunction;
  type: AJVMessageFunction;
  format: AJVMessageFunction;
};

export type FormField<T> = {
  [K in keyof T]: T[K];
};

export type IState<T> = {
  [K in keyof T]: {
    value: T[K];
    error: string;
    isRequired: boolean;
  };
};

export type InitialState<T> = {
  [K in keyof T]: {
    value: T[K];
    error: string;
    isRequired: boolean;
  };
};

export type ValidateResult<T> = {
  isValid: boolean;
  data: T | null;
  errors?: Partial<{ [K in keyof T]: T[K] }>;
};

export type useFormErrors<T> = {
  [K in keyof T]?: string;
};
export interface UseFormReturn<T> {
  data: T;
  state: IState<T>;
  set: (form: Partial<{ [K in keyof T]: T[K] }>) => void;
  reset: () => void;
  validate: () => ValidateResult<T>;
  isDirty: boolean;
  isValid: boolean;
  onBlur: (fieldName: string) => void;
  setErrors: (errors: ErrorObject[]) => void;
}
