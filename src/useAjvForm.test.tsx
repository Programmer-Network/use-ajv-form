import { act, renderHook } from '@testing-library/react-hooks';
import { JSONSchemaType } from 'ajv';
import { vi } from 'vitest';
import useAJVForm from '.';

import { secureString, validYouTubeUrl } from '@programmer_network/ajv';
import { getFormState } from 'utils';

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
      title: { value: 'Hi, World', isRequired: true, error: '' },
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

  it('handles onChange with fields not in initial data', () => {
    const initialData = { name: '' };
    const schema: JSONSchemaType<{ name: string }> = {
      type: 'object',
      required: ['name'],
      properties: {
        name: {
          type: 'string',
          minLength: 1,
          maxLength: 65,
          errorMessage: {
            maxLength: 'Name cannot be greater than 65 characters.',
          },
        },
      },
    };

    const { result } = renderHook(() => useAJVForm(initialData, schema));

    // Accidentally including an additional field in update
    const payload = { name: 'Dog', id: 1 };
    result.current.set(payload);

    expect(result.current.state.name.value).toBe('Dog');
    expect(result.current.isDirty).toBeTruthy();

    // Clearing existing field has earlier caused hook to throw
    result.current.set({ name: '' });

    expect(result.current.state.name.value).toBe('');
    expect(result.current.isDirty).toBeTruthy();
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

  it('isValid should be true when the initial state is set or when reset is called', () => {
    const initialData = { title: 'Foo' };
    const schema: JSONSchemaType<{ title: string }> = {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string' },
      },
    };

    const { result } = renderHook(() => useAJVForm(initialData, schema));

    expect(result.current.validate().isValid).toBe(true);

    result.current.set({ title: 'Bar' });

    expect(result.current.validate().isValid).toBe(true);

    result.current.reset();

    expect(result.current.validate().isValid).toBe(true);
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
      useAJVForm(initialData, schema, {
        customKeywords: [secureString],
      }),
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

    const { result } = renderHook(() =>
      useAJVForm(initialData, schema, {
        customKeywords: [validYouTubeUrl],
      }),
    );

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
        title: {
          type: 'string',
          minLength: 3,
          errorMessage: 'Should be at least 3 characters long.',
        },
      },
    };

    const { result } = renderHook(() =>
      useAJVForm(initialData, schema, { debounceTime: 1000 }),
    );

    act(() => {
      result.current.set({ title: 'Hi' });
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.state.title.error).not.toBe('');

    // Assert: Ensure the validation error is updated after the debounce delay
    expect(result.current.state.title.error).toBe(
      'Should be at least 3 characters long.',
    );
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

    act(() => {
      result.current.set({ title: 'Hi' });
    });

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

  it('should handle conditional validations on locationType correctly', () => {
    /**
     * Test Scenario:
     * - When `locationType` is 'onsite', `location` is required.
     * - When `locationType` is 'remote', `eventUrl` is required.
     * - When `locationType` is 'hybrid', both `location` and `eventUrl` are required.
     */
    const initialData = {
      locationType: 'onsite',
      location: '',
      eventUrl: '',
    };

    const schema = {
      type: 'object',
      required: ['locationType'],
      properties: {
        locationType: { type: 'string', enum: ['hybrid', 'onsite', 'remote'] },
        location: { type: 'string' },
        eventUrl: { type: 'string' },
      },
      allOf: [
        {
          if: { properties: { locationType: { const: 'onsite' } } },
          then: {
            required: ['location'],
            properties: {
              location: { type: 'string', minLength: 1 },
            },
          },
        },
        {
          if: { properties: { locationType: { const: 'remote' } } },
          then: {
            required: ['eventUrl'],
            properties: {
              eventUrl: { type: 'string', format: 'uri' },
            },
          },
        },
        {
          if: { properties: { locationType: { const: 'hybrid' } } },
          then: {
            required: ['location', 'eventUrl'],
            properties: {
              location: { type: 'string', minLength: 1 },
              eventUrl: { type: 'string', format: 'uri' },
            },
          },
        },
      ],
    };

    const { result } = renderHook(() =>
      useAJVForm(initialData, schema, { debug: true }),
    );

    // Validate initial state (onsite)
    expect(result.current.validate().isValid).toBe(false); // Validation should fail
    expect(result.current.state.location.error).toBe('This field is required.');
    expect(result.current.state.eventUrl.error).toBe(''); // eventUrl is not required for 'onsite'

    // Transition to "remote" and validate
    result.current.set({ locationType: 'remote', eventUrl: '' });
    expect(result.current.validate().isValid).toBe(false); // Validation should fail for remote
    expect(result.current.state.location.error).toBe(''); // location is no longer required
    expect(result.current.state.eventUrl.error).toBe('Should be in uri format.'); // eventUrl now required

    // Add valid eventUrl for remote
    result.current.set({ eventUrl: 'https://example.com' });
    expect(result.current.validate().isValid).toBe(true); // Validation should now pass

    // // Transition to "hybrid" and validate
    result.current.set({ locationType: 'hybrid', location: '', eventUrl: '' });
    expect(result.current.validate().isValid).toBe(false); // Validation should fail for hybrid
    expect(result.current.state.location.error).toBe('This field is required.');
    expect(result.current.state.eventUrl.error).toBe('Should be in uri format.');

    result.current.set({
      location: 'Some Location',
      eventUrl: 'https://example.com',
    });

    expect(result.current.validate().isValid).toBe(true); // Validation should pass now
  });

  it('should clear errors when switching between different locationType values', () => {
    const initialData = {
      locationType: 'onsite',
      location: '',
      eventUrl: '',
    };

    const schema = {
      type: 'object',
      required: ['locationType'],
      properties: {
        locationType: { type: 'string', enum: ['hybrid', 'onsite', 'remote'] },
        location: { type: 'string' },
        eventUrl: { type: 'string' },
      },
      allOf: [
        {
          if: { properties: { locationType: { const: 'onsite' } } },
          then: {
            required: ['location'],
            properties: {
              location: { type: 'string', minLength: 1 },
            },
          },
        },
        {
          if: { properties: { locationType: { const: 'remote' } } },
          then: {
            required: ['eventUrl'],
            properties: {
              eventUrl: { type: 'string', format: 'uri' },
            },
          },
        },
        {
          if: { properties: { locationType: { const: 'hybrid' } } },
          then: {
            required: ['location', 'eventUrl'],
            properties: {
              location: { type: 'string', minLength: 1 },
              eventUrl: { type: 'string', format: 'uri' },
            },
          },
        },
      ],
    };

    const { result } = renderHook(() =>
      useAJVForm(initialData, schema, { debug: true }),
    );

    // Initially, locationType is 'onsite', location is required
    expect(result.current.validate().isValid).toBe(false);
    expect(result.current.state.location.error).toBe('This field is required.');
    expect(result.current.state.eventUrl.error).toBe(''); // Not required for 'onsite'

    // Transition to remote => location error should clear; eventUrl is now required
    result.current.set({ locationType: 'remote' });
    expect(result.current.validate().isValid).toBe(false);
    expect(result.current.state.location.error).toBe(''); // Not required anymore
    expect(result.current.state.eventUrl.error).toBe('Should be in uri format.');

    // Transition to hybrid => both fields are now required
    result.current.set({ locationType: 'hybrid' });
    expect(result.current.validate().isValid).toBe(false);
    expect(result.current.state.location.error).toBe('This field is required.');
    expect(result.current.state.eventUrl.error).toBe('Should be in uri format.');

    // Transition back to onsite => location required, eventUrl clears
    result.current.set({ locationType: 'onsite', eventUrl: '' });
    expect(result.current.validate().isValid).toBe(false);
    expect(result.current.state.location.error).toBe('This field is required.');
    expect(result.current.state.eventUrl.error).toBe(''); // Cleared
  });

  it('should validate non-conditional fields alongside conditional fields', () => {
    const initialData = {
      locationType: 'onsite',
      location: '',
      eventUrl: '',
      title: '',
    };

    const schema = {
      type: 'object',
      required: ['locationType', 'title'],
      properties: {
        locationType: { type: 'string', enum: ['hybrid', 'onsite', 'remote'] },
        location: { type: 'string' },
        eventUrl: { type: 'string' },
        title: { type: 'string', minLength: 3 },
      },
      allOf: [
        {
          if: { properties: { locationType: { const: 'onsite' } } },
          then: {
            required: ['location'],
            properties: {
              location: { type: 'string', minLength: 1 },
            },
          },
        },
        {
          if: { properties: { locationType: { const: 'remote' } } },
          then: {
            required: ['eventUrl'],
            properties: {
              eventUrl: { type: 'string', format: 'uri' },
            },
          },
        },
      ],
    };

    const { result } = renderHook(() =>
      useAJVForm(initialData, schema, { debug: true }),
    );

    // Initially, title and location should fail
    expect(result.current.validate().isValid).toBe(false);
    expect(result.current.state.title.error).toBe(
      'Should be at least 3 characters long.',
    );
    expect(result.current.state.location.error).toBe('This field is required.');
    expect(result.current.state.eventUrl.error).toBe(''); // Not required for 'onsite'

    // Set valid title
    result.current.set({ title: 'My Event' });
    expect(result.current.validate().isValid).toBe(false); // Still invalid because of location
    expect(result.current.state.title.error).toBe(''); // Cleared
    expect(result.current.state.location.error).toBe('This field is required.');

    // Fix location
    result.current.set({ location: 'Some Location' });
    expect(result.current.validate().isValid).toBe(true); // Everything valid now

    // Transition to remote => validation should update
    result.current.set({ locationType: 'remote', eventUrl: '' });
    expect(result.current.validate().isValid).toBe(false);
    expect(result.current.state.eventUrl.error).toBe('Should be in uri format.');
    expect(result.current.state.location.error).toBe(''); // No longer required
  });

  it('should handle invalid or missing locationType gracefully', () => {
    const initialData = {
      locationType: '', // Invalid value
      location: '',
      eventUrl: '',
    };

    const schema = {
      type: 'object',
      required: ['locationType'],
      properties: {
        locationType: { type: 'string', enum: ['hybrid', 'onsite', 'remote'] },
        location: { type: 'string' },
        eventUrl: { type: 'string' },
      },
      allOf: [
        {
          if: { properties: { locationType: { const: 'onsite' } } },
          then: {
            required: ['location'],
            properties: {
              location: { type: 'string', minLength: 1 },
            },
          },
        },
        {
          if: { properties: { locationType: { const: 'remote' } } },
          then: {
            required: ['eventUrl'],
            properties: {
              eventUrl: { type: 'string', format: 'uri' },
            },
          },
        },
      ],
    };

    const { result } = renderHook(() =>
      useAJVForm(initialData, schema, { debug: true }),
    );

    // Invalid locationType should not enforce any conditional requirements
    expect(result.current.validate().isValid).toBe(false);
    expect(result.current.state.locationType.error).toBe(
      'hybrid, onsite, remote are the only allowed values.',
    );
    expect(result.current.state.location.error).toBe(''); // No requirement enforced
    expect(result.current.state.eventUrl.error).toBe('');

    // Set valid locationType and verify behavior
    result.current.set({ locationType: 'onsite' });
    expect(result.current.validate().isValid).toBe(false); // Still fails due to location
    expect(result.current.state.location.error).toBe('This field is required.');

    result.current.set({ locationType: 'invalidType' }); // Invalid type
    expect(result.current.validate().isValid).toBe(false);
    expect(result.current.state.location.error).toBe(''); // Cleared since it's invalid
  });

  it('should update value and isRequired dynamically', () => {
    const prevState = {
      locationType: { value: 'onsite', isRequired: true, error: '' },
      location: { value: '', isRequired: true, error: '' },
      eventUrl: { value: '', isRequired: false, error: '' },
    };

    const form = {
      location: '',
      eventUrl: '',
      locationType: 'remote',
    };

    const fieldDependencies = {
      locationType: ['location', 'eventUrl'],
    };

    const schema = {
      allOf: [
        {
          if: { properties: { locationType: { const: 'onsite' } } },
          then: { required: ['location'] },
        },
        {
          if: { properties: { locationType: { const: 'remote' } } },
          then: { required: ['eventUrl'] },
        },
      ],
    };

    const result = getFormState(prevState, form, fieldDependencies, schema);

    expect(result.locationType.value).toEqual('remote');
    expect(result.location.isRequired).toEqual(false);
    expect(result.eventUrl.isRequired).toEqual(true);
  });
});

describe('useAJVForm with error handling', () => {
  it('should set initial errors from options', () => {
    const initialData = { title: '' };
    const schema: JSONSchemaType<{ title: string }> = {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string' },
      },
    };

    const errors = [
      {
        instancePath: '/title',
        keyword: 'required',
        params: { missingProperty: 'title' },
        schemaPath: '#/required',
      },
    ];

    const { result } = renderHook(() => useAJVForm(initialData, schema, { errors }));

    expect(result.current.state.title.error).toBe('title is required.');
    expect(result.current.isValid).toBe(false);
  });

  it('should update errors when options.errors changes', () => {
    const initialData = { title: '' };
    const schema: JSONSchemaType<{ title: string }> = {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string' },
      },
    };

    const { result, rerender } = renderHook(
      (props) => useAJVForm(initialData, schema, props),
      { initialProps: {} },
    );

    expect(result.current.state.title.error).toBe('');

    rerender({
      errors: [
        {
          instancePath: '/title',
          keyword: 'minLength',
          params: { limit: 3 },
          schemaPath: '#/properties/title/minLength',
        },
      ],
    });

    expect(result.current.state.title.error).toBe(
      'Should be at least 3 characters long.',
    );

    expect(result.current.isValid).toBe(false);
  });
});
