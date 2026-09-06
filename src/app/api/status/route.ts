import { NextResponse } from 'next/server';
import os from 'os';

export async function GET() {
  const memoryUsage = process.memoryUsage();
  return NextResponse.json({
    status: 'online',
    uptime: Math.floor(process.uptime()),
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
    },
    platform: process.platform,
    nodeVersion: process.version,
    os: {
      totalmem: Math.round(os.totalmem() / 1024 / 1024) + ' MB',
      freemem: Math.round(os.freemem() / 1024 / 1024) + ' MB',
      loadavg: os.loadavg()
    }
  });
}
