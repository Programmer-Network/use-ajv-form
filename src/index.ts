import { useState, useEffect, useMemo, useRef } from 'react';
import { getInitial, getValue, getErrors, addUserDefinedKeywords } from './utils';
import { ajv } from './utils/validation';

import {
  AJVMessageFunction,
  FormField,
  IState,
  useFormErrors,
  UseFormReturn,
} from './utils/types';
import { ErrorObject, JSONSchemaType, KeywordDefinition } from 'ajv';
import { useDebounce } from './Hooks/useDebounce';

const useAJVForm = <T extends Record<string, any>>(
  initial: T,
  schema: JSONSchemaType<T>,
  options?: {
    customKeywords?: KeywordDefinition[];
    errors?: ErrorObject[];
    userDefinedMessages?: Record<string, AJVMessageFunction>;
    shouldDebounceAndValidate?: boolean;
    debounceTime?: number;
  },
): UseFormReturn<T> => {
  const initialStateRef = useRef<IState<T>>(getInitial(initial));

  const [state, setState] = useState<IState<T>>(getInitial(initial));

  const [currentField, setCurrentField] = useState<{
    name: keyof T;
    editId: number;
  } | null>(null);
  const [editCounter, setEditCounter] = useState(0);
  const debouncedField = useDebounce(currentField, options?.debounceTime || 500);

  if (options?.customKeywords?.length) {
    addUserDefinedKeywords(ajv, options.customKeywords);
  }

  const AJVValidate = ajv.compile(schema);

  const resetForm = () => {
    setState(
      Object.keys(state).reduce((acc, name) => {
        return {
          ...acc,
          [name]: {
            value: '',
            error: '',
          },
        };
      }, {} as IState<T>),
    );
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

  const setErrors = (errors: useFormErrors<T>) => {
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
          setErrors(
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
    return !Object.keys(currentState).some((key) => currentState[key].error !== '');
  };

  const isDirty = useMemo(
    () => isFormDirty(state, initialStateRef.current),
    [state],
  );

  const isValid = useMemo(() => isFormValid(state), [state]);

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

    setState(setErrors(getErrors(options?.errors, options?.userDefinedMessages)));
  }, [options?.errors]);

  return {
    reset: resetForm,
    set: setFormState,
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
