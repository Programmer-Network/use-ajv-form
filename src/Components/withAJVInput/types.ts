import { UseFormReturn } from '../../utils/types';

export interface IWithFormInputProps {
  form: UseFormReturn<any>;
  name: string;
}

export interface IInjectedFormProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  error?: string | null;
}
