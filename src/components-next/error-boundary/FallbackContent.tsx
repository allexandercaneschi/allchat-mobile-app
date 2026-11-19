import { PhoneFallback } from './PhoneFallback';

export type FallbackProps = {
  resetError: () => void;
};

export const FallbackContent = ({ resetError }: FallbackProps) => (
  <PhoneFallback resetError={resetError} />
);
