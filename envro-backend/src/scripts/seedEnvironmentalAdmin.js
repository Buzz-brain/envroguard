import mongoose from 'mongoose';
import { EnvironmentalAdmin } from '../modules/environmentalAdmin/model.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const seedEnvironmentalAdmin = async () => {
  try {
    await mongoose.connect(config.mongo.uri);
    logger.info('Connected to MongoDB');

    const existing = await EnvironmentalAdmin.findOne();

    if (existing) {
      logger.info('Environmental admin already exists. Skipping seed.');
      process.exit(0);
    }

    await EnvironmentalAdmin.create({
      fullName: 'System Administrator',
      email: 'admin@envroguard.com',
      password: 'Admin@123',
      isOnboarded: true,
    });

    logger.info('Environmental admin created successfully');
    logger.info('Email: admin@envroguard.com');
    logger.info('Password: Admin@123');
    logger.warn('CHANGE THESE CREDENTIALS IN PRODUCTION');

    process.exit(0);
  } catch (error) {
    logger.error('Seed failed', { error: error.message });
    process.exit(1);
  }
};

seedEnvironmentalAdmin();
