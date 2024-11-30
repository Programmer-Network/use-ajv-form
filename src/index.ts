import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addUserDefinedKeywords,
  getErrors,
  getFormState,
  getInitial,
  getValue,
} from './utils';
import { ajv as ajvInternal } from './utils/validation';

import { ErrorObject, JSONSchemaType, KeywordDefinition, SchemaObject } from 'ajv';
import { useDebounce } from './Hooks/useDebounce';
import { AJVMessageFunction, FormField, IState, UseFormReturn } from './utils/types';
import Logger from './utils/Logger';
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
    debug?: boolean;
  },
): UseFormReturn<T> => {
  const ajvInstance = options?.ajv || ajvInternal;

  const initialStateRef = useRef<IState<T>>(
    getInitial(initial, schema) as IState<T>,
  );

  const logger = useMemo(
    () => new Logger(options?.debug || false),
    [options?.debug],
  );

  // Precompute field dependencies
  const fieldDependencies = useMemo(() => {
    const dependencies: Record<string, string[]> = {};
    if (schema.allOf) {
      schema.allOf.forEach((condition: any) => {
        if (condition.if) {
          const parentField = Object.keys(condition.if.properties || {})[0];
          const dependentFields = condition.then?.required || [];
          dependencies[parentField] = [
            ...(dependencies[parentField] || []),
            ...dependentFields,
          ];
        }
      });
    }

    logger.log('Precomputed field dependencies:', dependencies);
    return dependencies;
  }, [schema]);

  const [state, setState] = useState<IState<T>>(initialStateRef.current);

  const [currentField, setCurrentField] = useState<{
    name: keyof T;
    editId: number;
  } | null>(null);

  const debouncedField = useDebounce(currentField, options?.debounceTime || 1000);

  if (options?.customKeywords?.length) {
    addUserDefinedKeywords(ajvInstance, options.customKeywords);
  }

  const AJVValidate = ajvInstance.compile(schema);

  const resetForm = () => {
    logger.log('Form reset to initial state');
    setState(initialStateRef.current);
  };

  const validateField = (fieldName: keyof T) => {
    const fieldData = { [fieldName]: state[fieldName].value };
    const isValid = AJVValidate(fieldData);
    const errors = AJVValidate.errors || [];

    logger.log(`Validating field '${String(fieldName)}':`, {
      fieldData,
      isValid,
      errors,
    });

    const fieldErrors = isValid
      ? {}
      : getErrors(errors, options?.userDefinedMessages, logger, schema);

    const error = fieldErrors[fieldName as string] || '';
    setState((prevState) => ({
      ...prevState,
      [fieldName]: {
        ...prevState[fieldName],
        error,
      },
    }));
  };

  const handleBlur = (fieldName: keyof T) => {
    logger.log(`Field '${String(fieldName)}' blurred`);
    validateField(fieldName);
  };

  const setFormState = (form: Partial<FormField<T>>) => {
    setState(getFormState(state, form, fieldDependencies, schema) as IState<T>);
    setCurrentField({
      name: Object.keys(form)[0] as keyof T,
      editId: currentField?.editId || 0 + 1,
    });
  };

  const validateForm = () => {
    const data = Object.keys(state).reduce((acc, inputName) => {
      acc[inputName as keyof T] = getValue(state[inputName].value) as T[keyof T];
      return acc;
    }, {} as T);

    logger.log('Validating entire form:', { data });
    const isValid = AJVValidate(data);

    if (!isValid && AJVValidate.errors) {
      logger.error('Form validation failed with errors:', AJVValidate.errors);

      const errors = getErrors(
        AJVValidate.errors,
        options?.userDefinedMessages,
        logger,
      );
      setState((prevState) =>
        Object.keys(prevState).reduce((updatedState, fieldName) => {
          return {
            ...updatedState,
            [fieldName]: {
              ...prevState[fieldName],
              error: errors[fieldName] || '',
            },
          };
        }, {} as IState<T>),
      );

      return { isValid: false, data: null };
    }

    // Clear errors if valid
    setState((prevState) =>
      Object.keys(prevState).reduce((updatedState, fieldName) => {
        return {
          ...updatedState,
          [fieldName]: {
            ...prevState[fieldName],
            error: '',
          },
        };
      }, {} as IState<T>),
    );

    logger.log('Form is valid:', data);
    return { isValid: true, data };
  };

  const isDirty = useMemo(() => {
    return Object.keys(state).some(
      (key) => state[key].value !== initialStateRef.current[key].value,
    );
  }, [state]);

  const isValid = useMemo(
    () => Object.keys(state).every((key) => !state[key].error),
    [state],
  );

  const setErrors = (errors: ErrorObject[]) => {
    const newErrors = getErrors(
      errors,
      options?.userDefinedMessages,
      logger,
      schema,
    );
    setState((prevState) =>
      Object.keys(newErrors).reduce((updatedState, fieldName) => {
        return {
          ...updatedState,
          [fieldName]: {
            ...prevState[fieldName],
            error: newErrors[fieldName] || '',
          },
        };
      }, {} as IState<T>),
    );
  };

  useEffect(() => {
    if (
      !debouncedField ||
      !isDirty ||
      options?.shouldDebounceAndValidate === false
    ) {
      return;
    }
    validateField(debouncedField.name);
  }, [debouncedField, isDirty]);

  return {
    reset: resetForm,
    set: setFormState,
    setErrors,
    validate: validateForm,
    isValid,
    isDirty,
    data: Object.keys(state).reduce((acc, fieldName) => {
      return {
        ...acc,
        [fieldName]: getValue(state[fieldName].value),
      };
    }, {} as T),
    state,
    onBlur: handleBlur,
  };
};

export default useAJVForm;
