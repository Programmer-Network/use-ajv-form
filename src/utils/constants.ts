import { AJVErrorParams, DefaultAJVMessages } from './types';

export const defaultAJVMessages: DefaultAJVMessages = {
  required: (data: AJVErrorParams) => `${data.missingProperty} is required.`,
  minLength: (data: AJVErrorParams) => {
    if (data.limit === 1) {
      return 'This field is required.';
    }

    return `Should be at least ${data.limit} characters long.`;
  },
  maxLength: (data: AJVErrorParams) => `Should not exceed ${data.limit} characters.`,
  pattern: () => 'Invalid format.',
  minimum: (data: AJVErrorParams) =>
    `Should be greater than or equal to ${data.limit}.`,
  maximum: (data: AJVErrorParams) =>
    `Should be less than or equal to ${data.limit}.`,
  enum: (data: AJVErrorParams) =>
    `${data.allowedValues?.join(', ')} are the only allowed values.`,
  type: (data: AJVErrorParams) => `Should be of type ${data.type}.`,
  format: (data: AJVErrorParams) => `Should be in ${data.format} format.`,
};
