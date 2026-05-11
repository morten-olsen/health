import { z } from 'zod/v4';

const integrationSchema = z.string().min(1).max(100);
const deviceIdSchema = z.string().min(1).max(100);
const nameSchema = z.string().min(1).max(200);

const deviceResponseSchema = z.object({
  id: z.string(),
  integration: integrationSchema,
  device_id: deviceIdSchema,
  name: nameSchema,
  created_at: z.string(),
  updated_at: z.string(),
});

const deviceListResponseSchema = z.object({
  devices: z.array(deviceResponseSchema),
});

const registerDeviceInputSchema = z.object({
  integration: integrationSchema,
  device_id: deviceIdSchema,
  name: nameSchema,
});

const updateDeviceInputSchema = z.object({
  name: nameSchema,
});

const errorResponseSchema = z.object({ error: z.string() });

type DeviceResponse = z.infer<typeof deviceResponseSchema>;
type DeviceListResponse = z.infer<typeof deviceListResponseSchema>;
type RegisterDeviceInput = z.infer<typeof registerDeviceInputSchema>;
type UpdateDeviceInput = z.infer<typeof updateDeviceInputSchema>;

z.globalRegistry.add(deviceResponseSchema, { id: 'Device' });
z.globalRegistry.add(deviceListResponseSchema, { id: 'DeviceList' });
z.globalRegistry.add(registerDeviceInputSchema, { id: 'RegisterDevice' });
z.globalRegistry.add(updateDeviceInputSchema, { id: 'UpdateDevice' });

export type { DeviceListResponse, DeviceResponse, RegisterDeviceInput, UpdateDeviceInput };
export {
  deviceListResponseSchema,
  deviceResponseSchema,
  errorResponseSchema,
  registerDeviceInputSchema,
  updateDeviceInputSchema,
};
