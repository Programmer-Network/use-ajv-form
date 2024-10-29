import { useEffect, useMemo, useRef, useState } from 'react';
import { addUserDefinedKeywords, getErrors, getInitial, getValue } from './utils';
import { ajv as ajvInternal } from './utils/validation';

import { ErrorObject, JSONSchemaType, KeywordDefinition, SchemaObject } from 'ajv';
import { useDebounce } from './Hooks/useDebounce';
import {
  AJVMessageFunction,
  FormField,
  IState,
  UseFormReturn,
  useFormErrors,
} from './utils/types';

const useAJVForm = <T extends Record<string, any>>(
  initial: T,
  schema: JSONSchemaType<T> | SchemaObject,
  options?: {
    ajv?: typeof ajvInternal;
    customKeywords?: KeywordDefinition[];
    errors?: ErrorObject[];
    userDefinedMessages?: Record<string, AJVMessageFunction>;
    shouldDebounceAndValidate?: boolean;
    debounceTime?: number;
  },
): UseFormReturn<T> => {
  const ajvInstance = options?.ajv || ajvInternal;

  const initialStateRef = useRef<IState<T>>(getInitial(initial));

  const [state, setState] = useState<IState<T>>(getInitial(initial));

  const [currentField, setCurrentField] = useState<{
    name: keyof T;
    editId: number;
  } | null>(null);
  const [editCounter, setEditCounter] = useState(0);
  const debouncedField = useDebounce(currentField, options?.debounceTime || 500);

  if (options?.customKeywords?.length) {
    addUserDefinedKeywords(ajvInstance, options.customKeywords);
  }

  const AJVValidate = ajvInstance.compile(schema);

  const resetForm = () => {
    setState(initialStateRef.current);
  };

  const validateField = (fieldName: keyof T) => {
    const isValid = AJVValidate({ [fieldName]: state[fieldName].value });
    const errors = AJVValidate.errors || [];
    const fieldErrors = isValid
      ? {}
      : getErrors(errors, options?.userDefinedMessages);

    const error = isDirty ? fieldErrors[fieldName as string] || '' : '';

    setState((prevState) => ({
      ...prevState,
      [fieldName]: {
        ...prevState[fieldName],
        error,
      },
    }));
  };

  const handleBlur = (fieldName: keyof T) => {
    validateField(fieldName);
  };

  const setFormState = (form: Partial<FormField<T>>) => {
    setState((current) => {
      const newState = { ...current };

      Object.keys(form).forEach((key) => {
        const name = key as keyof T;
        newState[name] = {
          ...newState[name],
          value: getValue(form[name]),
          error: newState[name]?.error || '',
        };
      });

      setCurrentField({
        name: Object.keys(form)[0] as keyof T,
        editId: editCounter,
      });

      setEditCounter(editCounter + 1);

      return newState;
    });
  };

  const _setErrors = (errors: useFormErrors<T>) => {
    return Object.keys(errors).reduce(
      (acc, fieldName) => {
        const key = fieldName as keyof typeof state;

        return {
          ...acc,
          [fieldName]: {
            value: getValue(state[key].value),
            error: errors[fieldName] || '',
          },
        };
      },
      { ...state },
    );
  };

  const validateForm = () => {
    try {
      const data = Object.keys(state).reduce((acc, inputName) => {
        return {
          ...acc,
          [inputName]: getValue(state[inputName].value),
        };
      }, {} as T);

      if (!AJVValidate(data) && AJVValidate.errors) {
        const errors: useFormErrors<T> = getErrors(
          AJVValidate.errors,
          options?.userDefinedMessages,
        );

        setState(
          _setErrors(
            Object.keys(errors).reduce((acc, fieldName) => {
              return {
                ...acc,
                [fieldName]: getValue(errors[fieldName]),
              };
            }, {}),
          ),
        );

        return { isValid: false, data: null };
      }

      if (!isFormValid(state)) {
        return { isValid: false, data: null };
      }

      return { isValid: true, data };
    } catch (error) {
      return { isValid: false, data: null };
    }
  };

  const isFormDirty = (
    currentState: IState<T>,
    initialState: IState<T>,
  ): boolean => {
    return Object.keys(currentState).some(
      (key) => currentState[key].value !== initialState[key].value,
    );
  };

  const isFormValid = (currentState: IState<T>): boolean => {
    const hasErrors = Object.keys(currentState).some(
      (key) => currentState[key].error !== '',
    );

    return !hasErrors;
  };

  const isValid = useMemo(() => {
    return isFormValid(state);
  }, [state]);

  const isDirty = useMemo(
    () => isFormDirty(state, initialStateRef.current),
    [state],
  );

  const setErrors = (errors: ErrorObject[]): void => {
    setState(_setErrors(getErrors(errors, options?.userDefinedMessages)));
  };

  useEffect(() => {
    if (options?.shouldDebounceAndValidate === false || !debouncedField) {
      return;
    }

    validateField(debouncedField.name);
  }, [debouncedField]);

  useEffect(() => {
    if (!options?.errors?.length) {
      return;
    }

    setState(_setErrors(getErrors(options?.errors, options?.userDefinedMessages)));
  }, [options?.errors]);

  return {
    reset: resetForm,
    set: setFormState,
    setErrors,
    validate: validateForm,
    onBlur: handleBlur,
    isValid,
    isDirty,
    data: Object.keys(state).reduce((acc, fieldName) => {
      return {
        ...acc,
        [fieldName]: getValue(state[fieldName].value),
      };
    }, {} as T),
    state,
  };
};

export default useAJVForm;
