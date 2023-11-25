import { useState, useEffect, useMemo, useRef } from 'react';
import { getInitial, getValue, getErrors } from './utils';
import { ajv } from './utils/validation';

import { FormField, IState, useFormErrors, UseFormReturn } from './utils/types';
import { ErrorObject, JSONSchemaType } from 'ajv';
import { useDebounce } from './Hooks/useDebounce';

const useAJVForm = <T extends Record<string, any>>(
  initial: T,
  schema: JSONSchemaType<T>,
  errors?: ErrorObject[],
): UseFormReturn<T> => {
  const initialStateRef = useRef<IState<T>>(getInitial(initial));
  const [state, setState] = useState<IState<T>>(getInitial(initial));
  const AJVValidate = ajv.compile(schema);

  const [currentField, setCurrentField] = useState<{
    name: keyof T;
    editId: number;
  } | null>(null);
  const [editCounter, setEditCounter] = useState(0);
  const debouncedField = useDebounce(currentField, 500);

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
    const fieldErrors = isValid ? {} : getErrors(errors);

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
      const name = Object.keys(form)[0] as keyof T;
      const state = { ...current };
      state[name] = {
        ...state[name],
        value: getValue(form[name]),
        error: '',
      };

      setCurrentField({ name, editId: editCounter });
      setEditCounter(editCounter + 1);

      return state;
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
        const errors: useFormErrors<T> = getErrors(AJVValidate.errors);

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

  const isDirty = useMemo(
    () => isFormDirty(state, initialStateRef.current),
    [state],
  );

  useEffect(() => {
    if (debouncedField) {
      validateField(debouncedField.name);
    }
  }, [debouncedField]);

  useEffect(() => {
    if (!errors?.length) {
      return;
    }

    setState(setErrors(getErrors(errors)));
  }, [errors]);

  return {
    reset: resetForm,
    set: setFormState,
    validate: validateForm,
    onBlur: handleBlur,
    isDirty,
    state,
  };
};

export default useAJVForm;
