import React, { useCallback } from 'react';
import { IInjectedFormProps, IWithFormInputProps } from './types';

function withAJVInput<T>(
  WrappedComponent: React.ComponentType<IInjectedFormProps & T>,
) {
  return function HOC({ form, name, ...rest }: IWithFormInputProps & T) {
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        form.set({ [name]: e.target.value });
      },
      [form, name],
    );

    const handleBlur = useCallback(() => {
      form.onBlur(name);
    }, [form, name]);

    const injectedProps: IInjectedFormProps = {
      value: form.state[name]?.value || '',
      onChange: handleChange,
      onBlur: handleBlur,
      error: form.state[name]?.error,
    };

    return <WrappedComponent {...injectedProps} {...(rest as T)} />;
  };
}

export default withAJVInput;
