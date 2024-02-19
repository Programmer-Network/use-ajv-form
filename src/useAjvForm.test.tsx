import { act, renderHook } from '@testing-library/react-hooks';
import { JSONSchemaType } from 'ajv';
import { vi } from 'vitest';
import useAJVForm from '.';

// @ts-expect-error - Currently, there is no type definition for this package.
import programmerNetworkAjv from 'programmer-network-ajv';
export const { keywords } = programmerNetworkAjv;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useAJVForm', () => {
  it('initializes correctly', () => {
    const initialData = {
      title: 'Hi, World',
    };

    const schema: JSONSchemaType<{ title: string }> = {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string' },
      },
    };

    const { result } = renderHook(() => useAJVForm(initialData, schema));

    expect(result.current.state).toEqual({
      title: { value: 'Hi, World', error: '' },
    });
  });

  it('handles onChange event correctly', () => {
    const initialData = { title: '' };
    const schema: JSONSchemaType<{ title: string }> = {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string' },
      },
    };

    const { result } = renderHook(() => useAJVForm(initialData, schema));

    result.current.set({ title: 'New Title' });

    expect(result.current.state.title.value).toBe('New Title');
  });

  it('handles onBlur event with validation correctly', () => {
    const initialData = { title: '' };
    const schema: JSONSchemaType<{ title: string }> = {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string' },
      },
    };

    const { result } = renderHook(() => useAJVForm(initialData, schema));

    result.current.set({ title: '' });
    result.current.onBlur('title');

    expect(result.current.state.title.error).toEqual('');
  });

  it('correctly identifies when the form is dirty', () => {
    const initialData = { title: 'Original Title' };
    const schema: JSONSchemaType<{ title: string }> = {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string' },
      },
    };

    const { result } = renderHook(() => useAJVForm(initialData, schema));

    expect(result.current.isDirty).toBe(false);

    result.current.set({ title: 'Changed Title' });

    expect(result.current.isDirty).toBe(true);
  });

  it('resets the form correctly', () => {
    const initialData = { title: 'Hello' };
    const schema: JSONSchemaType<{ title: string }> = {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string' },
      },
    };

    const { result } = renderHook(() => useAJVForm(initialData, schema));

    result.current.set({ title: 'New Title' });

    result.current.reset();

    expect(result.current.state.title.value).toBe('Hello');
  });

  it('validates the form correctly', () => {
    const initialData = { title: '' };
    const schema: JSONSchemaType<{ title: string }> = {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string' },
      },
    };

    const { result } = renderHook(() => useAJVForm(initialData, schema));

    result.current.set({ title: 'Foo' });

    const validation = result.current.validate();

    expect(validation.isValid).toBe(true);
  });

  it('isValid should be false when the initial state is set or when reset is called', () => {
    const initialData = { title: 'Foo' };
    const schema: JSONSchemaType<{ title: string }> = {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string' },
      },
    };

    const { result } = renderHook(() => useAJVForm(initialData, schema));

    expect(result.current.validate().isValid).toBe(false);

    result.current.set({ title: 'Bar' });

    expect(result.current.validate().isValid).toBe(true);

    result.current.reset();

    expect(result.current.validate().isValid).toBe(false);
  });

  it('validates minLength and maxLength for title', () => {
    const initialData = { title: '' };
    const schema: JSONSchemaType<{
      title: string;
    }> = {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string', minLength: 3, maxLength: 10 },
      },
    };

    const { result } = renderHook(() => useAJVForm(initialData, schema));

    result.current.set({ title: 'Lo' });
    result.current.onBlur('title');
    expect(result.current.state.title.error).toContain(
      'Should be at least 3 characters long.',
    );

    result.current.set({ title: 'Lorem ipsum hi world' });
    result.current.onBlur('title');
    expect(result.current.state.title.error).toContain(
      'Should not exceed 10 characters.',
    );
  });

  it('validates secure-string custom ajv validator', () => {
    const initialData = { title: '' };
    const schema: JSONSchemaType<{
      title: string;
    }> = {
      type: 'object',
      required: ['title'],
      properties: {
        title: {
          type: 'string',
          'secure-string': true,
        },
      },
    };

    const { result } = renderHook(() =>
      useAJVForm(initialData, schema, { customKeywords: [...keywords] }),
    );

    result.current.set({ title: 'Hello, world ++++' });
    result.current.onBlur('title');

    expect(result.current.state.title.error).toContain(
      'The string contains characters that are not alphanumeric, a dash, an exclamation mark, a question mark, an underscore, or a space',
    );
  });

  it('validates is-youtube-url custom ajv validator', () => {
    const initialData = { videoURL: '' };
    const schema: JSONSchemaType<{
      videoURL: string;
    }> = {
      type: 'object',
      required: ['videoURL'],
      properties: {
        videoURL: {
          type: 'string',
          'is-youtube-url': true,
        },
      },
    };

    const { result } = renderHook(() => useAJVForm(initialData, schema));

    result.current.set({ videoURL: 'dsdsds' });
    result.current.onBlur('videoURL');

    expect(result.current.state.videoURL.error).toContain('Invalid YouTube URL');
  });

  it('debounces validation on change event', async () => {
    const initialData = { title: '' };
    const schema: JSONSchemaType<{ title: string }> = {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string', minLength: 3 },
      },
    };

    const { result } = renderHook(() => useAJVForm(initialData, schema));

    result.current.set({ title: 'Hi' });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.state.title.error).not.toBe('');
  });

  it('should not validate and debounce if shouldDebounceAndValidate is set to false', async () => {
    const initialData = { title: '' };
    const schema: JSONSchemaType<{ title: string }> = {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string', minLength: 3 },
      },
    };

    const { result } = renderHook(() => useAJVForm(initialData, schema));

    result.current.set({ title: 'Hi' });
    expect(result.current.state.title.error).toBe('');
  });

  it('should use debounceTime argument for the useDebounce', async () => {
    const initialData = { title: '' };
    const schema: JSONSchemaType<{ title: string }> = {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string', minLength: 3 },
      },
    };

    const { result } = renderHook(() =>
      useAJVForm(initialData, schema, { debounceTime: 1000 }),
    );

    result.current.set({ title: 'Hi' });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.state.title.error).not.toBe('');
  });

  it('validates immediately on blur event', () => {
    const initialData = { title: '' };
    const schema: JSONSchemaType<{ title: string }> = {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string', minLength: 3 },
      },
    };

    const { result } = renderHook(() => useAJVForm(initialData, schema));

    result.current.set({ title: 'Hi' });
    result.current.onBlur('title');

    expect(result.current.state.title.error).toBe(
      'Should be at least 3 characters long.',
    );
  });

  it('should overwrite the existing error message by providing userDefinedMessages', () => {
    const initialData = { title: '' };
    const schema: JSONSchemaType<{ title: string }> = {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string', minLength: 3 },
      },
    };

    const { result } = renderHook(() =>
      useAJVForm(initialData, schema, {
        userDefinedMessages: {
          minLength: () => 'Monkey message',
        },
      }),
    );

    result.current.set({ title: 'Hi' });
    result.current.onBlur('title');

    expect(result.current.state.title.error).toBe('Monkey message');
  });

  it('should correctly update isValid based on form errors', () => {
    const initialData = { title: '' };
    const schema: JSONSchemaType<{ title: string }> = {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string', minLength: 3 },
      },
    };

    const { result } = renderHook(() => useAJVForm(initialData, schema));

    result.current.validate();

    expect(result.current.isValid).toBe(false);

    result.current.set({ title: 'Hello' });
    result.current.onBlur('title');

    expect(result.current.isValid).toBe(true);
    result.current.set({ title: 'Hi' });
    result.current.onBlur('title');

    expect(result.current.isValid).toBe(false);
  });

  it('should correctly set data object', () => {
    const initialData = { title: '', description: '' };
    const schema: JSONSchemaType<{ title: string; description: string }> = {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
      },
    };

    const { result } = renderHook(() => useAJVForm(initialData, schema));

    result.current.validate();

    result.current.set({ title: 'Hello' });
    result.current.onBlur('title');

    expect(result.current.data).toEqual({ title: 'Hello', description: '' });
    expect(result.current.isValid).toBe(true);

    result.current.set({ title: '112' });
    result.current.set({ description: 'John Doe' });
    result.current.onBlur('title');

    expect(result.current.data).toEqual({ title: '112', description: 'John Doe' });

    expect(result.current.isValid).toBe(true);
  });
});

describe('useAJVForm with multiple field updates', () => {
  it('updates multiple fields at once', () => {
    const initialData = { title: '', description: '' };
    const schema: JSONSchemaType<{ title: string; description: string }> = {
      type: 'object',
      required: ['title', 'description'],
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
      },
    };

    const { result } = renderHook(() => useAJVForm(initialData, schema));

    result.current.set({ title: 'New Title', description: 'New Description' });

    expect(result.current.state.title.value).toBe('New Title');
    expect(result.current.state.description.value).toBe('New Description');
  });

  it('preserves existing error messages when updating multiple fields', () => {
    const initialData = { title: '', description: '' };
    const schema: JSONSchemaType<{ title: string; description: string }> = {
      type: 'object',
      required: ['title', 'description'],
      properties: {
        title: { type: 'string', minLength: 3 },
        description: { type: 'string', minLength: 3 },
      },
    };

    const { result } = renderHook(() => useAJVForm(initialData, schema));

    result.current.set({ title: 'Ti', description: 'De' });
    result.current.onBlur('title');
    result.current.onBlur('description');

    expect(result.current.state.title.error).not.toBe('');
    expect(result.current.state.description.error).not.toBe('');

    expect(result.current.state.title.error).toBe(
      'Should be at least 3 characters long.',
    );
    expect(result.current.state.description.error).toBe(
      'Should be at least 3 characters long.',
    );
  });

  it('correctly updates isDirty when multiple fields are changed', () => {
    const initialData = {
      title: 'Original Title',
      description: 'Original Description',
    };
    const schema: JSONSchemaType<{ title: string; description: string }> = {
      type: 'object',
      required: ['title', 'description'],
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
      },
    };

    const { result } = renderHook(() => useAJVForm(initialData, schema));

    result.current.set({
      title: 'Changed Title',
      description: 'Changed Description',
    });

    expect(result.current.isDirty).toBe(true);
  });
});

describe('useAJVForm should properly set errors programmatically using setErrors function', () => {
  it('sets the errors using form.setErrors without having any userDefinedMessages', () => {
    const initialData = { title: '', description: '' };
    const schema: JSONSchemaType<{ title: string; description: string }> = {
      type: 'object',
      required: ['title', 'description'],
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
      },
    };

    const { result } = renderHook(() => useAJVForm(initialData, schema));

    result.current.setErrors([
      {
        instancePath: '/title',
        keyword: 'required',
        params: { missingProperty: 'title' },
        schemaPath: '#/required',
      },
      {
        instancePath: '/description',
        keyword: 'required',
        params: { missingProperty: 'description' },
        schemaPath: '#/required',
      },
    ]);

    expect(result.current.state.title.error).toBe('title is required.');
    expect(result.current.state.description.error).toBe('description is required.');
  });

  it('sets the errors using form.setErrors with userDefinedMessages', () => {
    const initialData = { title: '', description: '' };
    const schema: JSONSchemaType<{ title: string; description: string }> = {
      type: 'object',
      required: ['title', 'description'],
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
      },
    };

    const { result } = renderHook(() =>
      useAJVForm(initialData, schema, {
        userDefinedMessages: {
          required: () => 'Monkey message',
        },
      }),
    );

    result.current.setErrors([
      {
        instancePath: '/title',
        keyword: 'required',
        params: { missingProperty: 'title' },
        schemaPath: '#/required',
      },
      {
        instancePath: '/description',
        keyword: 'required',
        params: { missingProperty: 'description' },
        schemaPath: '#/required',
      },
    ]);

    expect(result.current.state.title.error).toBe('Monkey message');
    expect(result.current.state.description.error).toBe('Monkey message');
  });
});
