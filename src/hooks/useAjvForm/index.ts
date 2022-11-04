import { JSONSchemaType } from 'ajv';
import { useState } from 'react';
import { ajv } from './ajv';

import { getInitialState, getValue, processAjvErrors, unflatten } from '../../utils';

export const useAjvForm = (initialState: Object, schema: JSONSchemaType<any>) => {
  const [localState, setLocalState] = useState<any>(getInitialState(initialState));
  const ajvValidate = ajv.compile(schema);

  const setState = (form: any) => {
    const inputs = Object.keys(form).reduce((acc, name) => {
      return {
        ...acc,
        [name]: { value: form[name], error: null },
      };
    }, {});

    setLocalState((currentState: any) => ({ ...currentState, ...inputs }));
  };

  const setErrors = (errors: any) => {
    return Object.keys(localState).reduce((acc, fieldName) => {
      return {
        ...acc,
        [fieldName]: {
          value: getValue(localState, fieldName).value,
          error: errors[fieldName] || null,
        },
      };
    }, {});
  };

  /**
   * 1. Takes the flat state
   * 2. Creates an object with an interface that fits func @ajvValidate
   * 3. Unflattens the state
   * 4. Loops through the errors and sets them for those inputs that have one
   */
  const validate = () => {
    const data = unflatten(
      Object.keys(localState).reduce((acc, inputName) => {
        return {
          ...acc,
          [inputName]: localState[inputName].value,
        };
      }, {}),
      '.',
    );

    const isValid = ajvValidate(data);

    if (!isValid) {
      const ajvErrors: any = processAjvErrors(ajvValidate.errors);

      const errors: any = Object.keys(ajvErrors).reduce((acc, key) => {
        return {
          ...acc,
          [key.split('/').join('.')]:
            typeof ajvErrors[key] === 'object'
              ? Object.keys(ajvErrors[key]).reduce((a, k) => {
                  return {
                    ...a,
                    [k]: ajvErrors[key][k],
                  };
                }, {})
              : ajvErrors[key],
        };
      }, {});

      setLocalState(
        setErrors(
          Object.keys(errors).reduce((acc, fieldName) => {
            return {
              ...acc,
              [fieldName]: errors[fieldName],
            };
          }, {}),
        ),
      );
      return false;
    }

    return true;
  };

  return { state: localState, setState, validate };
};
