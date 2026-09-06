import axios from 'axios';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

const GGPIX_BASE_URL = 'https://ggpixapi.com/api/v1';

const getHeaders = () => ({
  'X-API-Key': env.GGPIX_API_KEY,
  'Content-Type': 'application/json'
});

export const GGPixService = {
  async getBalance() {
    try {
      if (!env.GGPIX_API_KEY) throw new Error('GGPix API Key não configurada.');

      const response = await axios.get(`${GGPIX_BASE_URL}/balance`, {
        headers: getHeaders()
      });

      return response.data;
    } catch (error: any) {
      logger.error({ error: error.response?.data || error.message }, '[GGPixService] Error fetching balance');
      throw error;
    }
  },

  async getWallets() {
    if (!env.GGPIX_API_KEY) return [];

    try {
      const response = await axios.get(`${GGPIX_BASE_URL}/wallets`, {
        headers: getHeaders(),
        validateStatus: (status) => status < 500,
      });

      if (response.status === 404) return [];
      return response.data;
    } catch (error: any) {
      return [];
    }
  }
};
