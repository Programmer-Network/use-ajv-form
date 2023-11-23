import { useState, useEffect, useMemo, useRef } from 'react';
import { getInitial, getValue, getErrors } from './utils';
import { ajv } from './utils/validation';

import { FormField, IState, useFormErrors, UseFormReturn } from './utils/types';
import { ErrorObject, JSONSchemaType } from 'ajv';

const useAJVForm = <T extends Record<string, any>>(
  initial: T,
  schema: JSONSchemaType<T>,
  errors?: ErrorObject[],
): UseFormReturn<T> => {
  const initialStateRef = useRef<IState<T>>(getInitial(initial));
  const [state, setState] = useState<IState<T>>(getInitial(initial));
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

  const handleBlur = (fieldName: keyof T) => {
    const isValid = AJVValidate({ [fieldName]: state[fieldName].value });
    const errors = AJVValidate.errors || [];
    const fieldErrors = isValid ? {} : getErrors(errors);

    setState((prevState) => ({
      ...prevState,
      [fieldName]: {
        ...prevState[fieldName],
        error: fieldErrors[fieldName as string] || '',
      },
    }));
  };

  const setFormState = (form: Partial<FormField<T>>) => {
    setState((currentState) => ({
      ...currentState,
      ...Object.keys(form).reduce((acc, key) => {
        const fieldKey = key as keyof T;
        return {
          ...acc,
          [fieldKey]: {
            ...currentState[fieldKey],
            value: getValue(form[fieldKey]),
          },
        };
      }, {} as IState<T>),
    }));
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
