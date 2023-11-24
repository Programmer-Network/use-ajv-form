# useAjvForm

<p align="center" style="width:300px; margin: auto;">
  <img src="./assets/ajv-react.png">
</p>

[use-ajv-form](https://github.com/agjs/use-ajv-form) is a custom React Hook enabling powerful and efficient form logic and validation using [Ajv JSON Schema Validator](https://ajv.js.org/). It offers an elegant solution to integrate state and validation into any form, independent of the form's design and presentation.

This library is a part of the toolkit used extensively on [Programmer Network](https://programmer.network/). It is an open-source project, fostered by our vibrant community on the [Programmer Network Twitch Channel](https://twitch.tv/programmer_network).

## Why Use React AJV Schema?

- **Streamlined Form Validation**: Uses Ajv to automate form validation against the [JSON Schema Specification](https://json-schema.org/specification.html), significantly reducing the need for manual validation.
- **Plugin Extensibility**: Supports Ajv [plugins](https://ajv.js.org/packages/) for custom validators, enhancing schema flexibility.
- **Design Agnostic**: Offers full freedom in how you structure, style, and handle your forms.

## Features

- **JSON Schema Validation**: Validates form data against a specified JSON schema.
- **Dirty State Tracking**: Identifies changes in form fields.
- **Remote Error Handling**: Manages errors from external sources (like APIs) as part of schema validation.

## Installation

```bash
pnpm add @programmer_network/use-ajv-form
# or
bun install @programmer_network/use-ajv-form
# or
yarn add @programmer_network/use-ajv-form
# or
npm install @programmer_network/use-ajv-form
```
