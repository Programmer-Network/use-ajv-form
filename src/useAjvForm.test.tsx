import { act, renderHook } from '@testing-library/react-hooks';
import useAJVForm from '.';
import { JSONSchemaType } from 'ajv';
import { vi } from 'vitest';
import { keywords } from 'utils/validation';

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

    act(() => {
      result.current.set({ title: 'New Title' });
    });

    result.current.reset();

    expect(result.current.state.title.value).toBe('');
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

    result.current.set({ title: '' });

    const validation = result.current.validate();

    expect(validation.isValid).toBe(true);
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
});
