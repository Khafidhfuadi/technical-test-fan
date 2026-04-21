// Test app helper — gunakan instance ini dengan supertest
// Import di test file: import { request } from '../helpers/testApp';

import supertest from 'supertest';
import app from '../../app';

// Export supertest instance yang sudah di-bind ke app
const request = supertest(app);

export { request, app };
