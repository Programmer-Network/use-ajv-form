import useForm from '../../src/index';

function App() {
  const form = useForm(
    {
      title: '',
      description: '',
    },
    {
      type: 'object',
      required: ['title', 'description'],
      properties: {
        title: { type: 'string', 'secure-string': true, minLength: 5 },
        description: {
          type: 'string',
          'secure-string': true,
          maxLength: 3,
          errorMessage: {
            minLength: 'Description should be at least 20 characters long.',
          },
        },
      },
    },
  );

  const handleSubmit = () => {
    form.validate();
  };

  return (
    <div>
      <input
        type="text"
        value={form.state.title.value}
        onChange={(e) =>
          form.set({
            title: e.target.value,
          })
        }
      />
      <input
        type="text"
        value={form.state.description.value}
        onChange={(e) => form.set({ description: e.target.value })}
      />
      <span>{form.state.title.error}</span>
      <span>{form.state.description.error}</span>
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}

export default App;
