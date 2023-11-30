# useAjvForm

[![lint-and-test-pr](https://github.com/Programmer-Network/use-ajv-form/actions/workflows/lint-and-test.yaml/badge.svg)](https://github.com/Programmer-Network/use-ajv-form/actions/workflows/lint-and-test.yaml)

<p align="center" style="width:300px; margin: auto;">
  <img src="./assets/ajv-react.png" alt="AJV React Logo">
</p>

> "The most awesome React form validation library I've ever used." - **Gill Bates** 😉

[use-ajv-form](https://github.com/agjs/use-ajv-form) is a custom React Hook enabling powerful and efficient form logic and validation using [Ajv JSON Schema Validator](https://ajv.js.org/). Designed for ease of integration, it offers an elegant solution to incorporate state and validation into any form, independent of the form's design and presentation.

This library, a part of the toolkit used extensively on [Programmer Network](https://programmer.network/), is fostered by our vibrant community on the [Programmer Network Twitch Channel](https://twitch.tv/programmer_network).

## Why Use React AJV Schema?

- **Streamlined Form Validation**: 🌞 Automates form validation against the [JSON Schema Specification](https://json-schema.org/specification.html), significantly reducing manual validation needs.
- **Plugin Extensibility**: 🌃 Supports Ajv [plugins](https://ajv.js.org/packages/) for custom validators, adding flexibility to schemas.
- **Design Agnostic**: 🖼️ Provides complete freedom in structuring, styling, and managing forms.
- **Ease of Integration**: 🚴🏻 Simplifies form handling with minimal code, enhancing the developer experience.
- **Isomorphic Usage**: 🧙 Ideal for projects utilizing AJV on the backend (e.g., with Node.js or [Fastify](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)), as it allows you to share the same schemas, plugins, and custom validators between front-end and back-end, ensuring consistency and efficiency in validation logic. _(We do this already here at [PN](https://programmer.network), take a look at [Programmer Network AJV](https://github.com/Programmer-Network/Programmer-Network-AJV))_.

## Installation

```bash
pnpm add @programmer_network/use-ajv-form
# or using npm
npm install @programmer_network/use-ajv-form
# or using yarn
yarn add @programmer_network/use-ajv-form
```

## Usage

```js
import useAjvForm from '@programmer_network/use-ajv-form';

// Create a form object with initial state, schema, and optional configuration
const form = useAjvForm(
  {
    title: '', // initial state
  },
  {
    type: 'object', // schema
    properties: {
      title: {
        type: 'string',
        minLength: 5,
      },
    },
  },
  {
    // optional configuration options
    // refer to the table below for details
  },
);
```

```jsx
// Basic input example
<input
  type="text"
  value={form.state.title.value}
  onBlur={() => form.onBlur('title')}
/>;
<span>{form.state.title.error}</span>;
```

This approach can become repetitive, so we advise creating a simple higher-order component (HOC) to inject these values for you. Although our library does not export any HOCs, you can easily create one as shown below:

```jsx
// Higher-Order Component to enhance form inputs
import React, { useCallback } from 'react';

export interface IWithFormInputProps {
  form: UseFormReturn<any>;
  name: string;
}

export interface IInjectedFormProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  error?: string;
}

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

const Input = withAJVInput(YourOwnInputComponent);

// Then somewhere in your component
// ...
return <div>
  <Input form={form} name="title" />;
</div>

```

Note: The HOC example provided is just one way to enhance your experience with `use-ajv-form`. We encourage creativity and experimentation to suit your specific needs. For example, employing a factory pattern could streamline the process further. Our philosophy with `use-ajv-form` is its adaptability—it's designed to work seamlessly in any setup, with any architecture.

### Validating the Entire Form with form.validate

`useAjvForm` offers debouncing for individual inputs by default. However, you might want to validate the entire form upon submission, especially to catch any errors before processing the form data. Here's how to implement this:

```jsx
// Form submission handler that validates the form
const handleSubmit = (e) => {
  e.preventDefault();
  const { isValid } = form.validate();

  if (!isValid) {
    // Handle invalid form state
    return;
  }

  // Proceed with valid form data
};

<form onSubmit={handleSubmit}>
  <input
    type="text"
    value={form.state.title.value}
    onBlur={() => form.onBlur('title')}
  />
  <span>{form.state.title.error}</span>
</form>;
```

### Using `isValid` and `isDirty` for Conditional Rendering in Forms

In some scenarios, it's useful to conditionally render elements based on the form's validity or whether the form has been interacted with (i.e., is "dirty"). While disabling the submit button for an invalid form is generally not recommended due to accessibility concerns, there are other ways to provide feedback to the user.

For example, product managers often require displaying error messages below a form, particularly in long forms, to inform users about any issues after submission.

Here’s how you can implement this in a long form scenario:

```jsx
<form onSubmit={handleSubmit}>
  <input
    type="text"
    value={form.state.title.value}
    onBlur={() => form.onBlur('title')}
  />
  <span>{form.state.title.error}</span>
  <button type="submit">Save</button>
</form>;

{
  !form.isValid && (
    <div>
      {Object.keys(form.state).map((inputName) => {
        const error = form.state[inputName].error;
        return error ? (
          <div key={inputName}>
            {inputName}: {error}
          </div>
        ) : null;
      })}
    </div>
  );
}
```

In this example, if the form is invalid (`!form.isValid`), we loop through the `form.state` object and render each error message. Each error message is associated with its corresponding field name for clarity. This approach helps in guiding users to correct their inputs, especially in long forms where errors might not be immediately visible.

### Exports from useAJVForm

The `useAJVForm` hook provides a set of utilities and state indicators for robust form management and validation. Below is a detailed description of each export from the hook:

| Export     | Type        | Description                                                                |
| ---------- | ----------- | -------------------------------------------------------------------------- |
| `reset`    | `Function`  | Resets the form to its initial state.                                      |
| `set`      | `Function`  | Sets the state for a specific form field.                                  |
| `validate` | `Function`  | Validates the entire form against the provided AJV schema.                 |
| `onBlur`   | `Function`  | Handler function to be called on the onBlur event of a form field.         |
| `isValid`  | `boolean`   | Indicates whether the form is currently valid according to the schema.     |
| `isDirty`  | `boolean`   | Indicates whether the form has been modified from its initial state.       |
| `state`    | `IState<T>` | The current state of the form, including values and errors for each field. |

## Options

You can customize `useAJVForm` using the following options:

| Option                      | Type                                 | Description                                                                                             |
| --------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `customKeywords`            | `KeywordDefinition[]`                | Custom AJV keywords for additional validation logic.                                                    |
| `errors`                    | `ErrorObject[]`                      | Pre-defined errors to set initial form errors. This could also be errors originating from your API.     |
| `userDefinedMessages`       | `Record<string, AJVMessageFunction>` | Custom error messages for validation errors.                                                            |
| `shouldDebounceAndValidate` | `boolean`                            | If `true`, enables debouncing for field validation.                                                     |
| `debounceTime`              | `number`                             | Time in milliseconds for debouncing validation. Ignored if `shouldDebounceAndValidate` is set to false. |

## Usage in Practice

To see `useAJVForm` in action, visit our [Yail Storybook](https://yail.programmer.network/?path=/docs/input-forms--docs). Click on `Show code` to explore practical usage examples of the hook.
