// src/utils/vapi.js or src/lib/vapi.js
import Vapi from '@vapi-ai/web';

// Use import.meta.env instead of process.env
export const vapi = new Vapi(import.meta.env.VITE_VAPI_PUBLIC_KEY);