import createClient from 'openapi-fetch';
import type { Client } from 'openapi-fetch';

import type { components, paths } from './gb-ingest.api-types.ts';

type ApiClient = Client<paths>;
type Device = components['schemas']['Device'];
type IngestRequest = components['schemas']['IngestRequestInput'];
type IngestResponse = components['schemas']['IngestResponse'];

const unwrap = <T>(label: string, data: T | undefined, error: unknown): T => {
  if (data === undefined) {
    throw new Error(`${label} failed: ${JSON.stringify(error)}`);
  }
  return data;
};

const login = async (baseUrl: string, username: string, password: string): Promise<string> => {
  const anon = createClient<paths>({ baseUrl });
  const { data, error } = await anon.POST('/api/auth/login', { body: { username, password } });
  return unwrap('login', data, error).token;
};

const createAuthedClient = (baseUrl: string, token: string): ApiClient =>
  createClient<paths>({ baseUrl, headers: { authorization: `Bearer ${token}` } });

const listDevices = async (client: ApiClient): Promise<Device[]> => {
  const { data, error } = await client.GET('/api/devices');
  return unwrap('list devices', data, error).devices;
};

const registerDevice = async (
  client: ApiClient,
  body: components['schemas']['RegisterDeviceInput'],
): Promise<Device> => {
  const { data, error, response } = await client.POST('/api/devices', { body });
  if (response.status === 409) {
    throw new Error(`Device already registered: ${body.integration}/${body.device_id}`);
  }
  return unwrap('register device', data, error);
};

const ingest = async (client: ApiClient, body: IngestRequest): Promise<IngestResponse> => {
  const { data, error } = await client.POST('/api/ingest', { body });
  return unwrap('ingest', data, error);
};

// Returns whether the entry was newly created. 409 (already exists) is a
// normal idempotent outcome on subsequent runs — not an error.
const registerCustomEntry = async (
  client: ApiClient,
  entry: components['schemas']['CreateCustomEntryInput'],
): Promise<{ created: boolean }> => {
  const { response, error } = await client.POST('/api/catalogue/custom', { body: entry });
  if (response.status === 201) {
    return { created: true };
  }
  if (response.status === 409) {
    return { created: false };
  }
  throw new Error(`register custom entry failed: ${response.status} ${JSON.stringify(error)}`);
};

export type { ApiClient, Device, IngestRequest, IngestResponse };
export { createAuthedClient, ingest, listDevices, login, registerCustomEntry, registerDevice };
