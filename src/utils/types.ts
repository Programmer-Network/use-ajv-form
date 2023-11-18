export type AJVErrorParams = {
  limit?: number;
  missingProperty?: string;
  allowedValues?: any[];
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

export type ErrorObject = {
  keyword: keyof DefaultAJVMessages;
  params: AJVErrorParams;
  message?: string;
};

export type FormField<T> = {
  [K in keyof T]: T[K];
};

export type IState<T> = {
  [K in keyof T]: {
    value: T[K];
    error: string | null;
  };
};

export type InitialState<T> = {
  [K in keyof T]: {
    value: T[K];
    error: null;
  };
};

export type ValidateResult<T> = {
  isValid: boolean;
  data: T | null;
  errors?: any;
};

export interface useFormErrors {
  [key: string]: any;
}

export interface UseFormReturn<T> {
  state: IState<T>;
  set: (form: Partial<{ [K in keyof T]: T[K] }>) => void;
  reset: () => void;
  validate: () => ValidateResult<T>;
}
