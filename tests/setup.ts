import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Sin globales de vitest, Testing Library no desmonta solo entre pruebas.
afterEach(cleanup);
