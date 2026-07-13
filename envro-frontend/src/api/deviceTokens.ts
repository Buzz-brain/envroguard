import api from './client';

export const deviceTokensApi = {
  register: (token: string, platform: string = 'android') =>
    api.post('/device-tokens', { token, platform }),

  unregister: (token: string) =>
    api.delete('/device-tokens', { data: { token } }),
};
