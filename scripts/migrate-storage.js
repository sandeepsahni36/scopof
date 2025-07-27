#!/usr/bin/env node

/**
 * Storage Migration Script: Supabase to AWS S3
 * 
 * This script migrates all files from Supabase storage to AWS S3
 * with zero-downtime and integrity verification.
 */

const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    bucket: process.env.AWS_S3_BUCKET,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  migration: {
    batchSize: 10,
    retryAttempts: 3,
    retryDelay: 1000,
    logFile: 'migration.log',
    checksumFile: 'migration-checksums.json',
  },
};

// Initialize clients
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);
const s3Client = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

class MigrationLogger {
  constructor(logFile) {
    this.logFile = logFile;
    this.startTime = Date.now();
  }

  async log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      elapsed: Date.now() - this.startTime,
    };
    
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
    
    try {
      await fs.appendFile(this.logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  async info(message, data) { await this.log('info', message, data); }
  async warn(message, data) { await this.log('warn', message, data); }
  async error(message, data) { await this.log('error', message, data); }
  async success(message, data) { await this.log('success', message, data); }
}

class StorageMigrator {
  constructor() {
    this.logger = new MigrationLogger(config.migration.logFile);
    this.checksums = new Map();
    this.stats = {
      total: 0,
      migrated: 0,
      failed: 0,
      skipped: 0,
      totalBytes: 0,
      migratedBytes: 0,
    };
  }

  async validateEnvironment() {
    const required = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'AWS_S3_BUCKET',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
    ];

    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    await this.logger.info('Environment validation passed');
  }

  async loadExistingChecksums() {
    try {
      const data = await fs.readFile(config.migration.checksumFile, 'utf8');
      const checksums = JSON.parse(data);
      for (const [key, value] of Object.entries(checksums)) {
        this.checksums.set(key, value);
      }
      await this.logger.info(`Loaded ${this.checksums.size} existing checksums`);
    } catch (error) {
      await this.logger.info('No existing checksum file found, starting fresh');
    }
  }

  async saveChecksums() {
    const checksumData = Object.fromEntries(this.checksums);
    await fs.writeFile(config.migration.checksumFile, JSON.stringify(checksumData, null, 2));
  }

  async calculateChecksum(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  async downloadFromSupabase(bucket, filePath) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filePath);

    if (error) {
      throw new Error(`Supabase download failed: ${error.message}`);
    }

    return Buffer.from(await data.arrayBuffer());
  }

  async uploadToS3(buffer, key, metadata = {}) {
    const command = new PutObjectCommand({
      Bucket: config.aws.bucket,
      Key: key,
      Body: buffer,
      Metadata: metadata,
    });

    await s3Client.send(command);
  }

  async verifyS3Upload(key, expectedChecksum) {
    try {
      const command = new HeadObjectCommand({
        Bucket: config.aws.bucket,
        Key: key,
      });

      const response = await s3Client.send(command);
      return response.ETag?.replace(/"/g, '') === expectedChecksum;
    } catch (error) {
      return false;
    }
  }

  async migrateFile(file, retryCount = 0) {
    const { bucket, filePath, targetKey } = file;
    
    try {
      // Check if already migrated
      if (this.checksums.has(targetKey)) {
        await this.logger.info(`Skipping already migrated file: ${targetKey}`);
        this.stats.skipped++;
        return true;
      }

      // Download from Supabase
      await this.logger.info(`Downloading: ${bucket}/${filePath}`);
      const buffer = await this.downloadFromSupabase(bucket, filePath);
      
      // Calculate checksum
      const checksum = await this.calculateChecksum(buffer);
      
      // Upload to S3
      await this.logger.info(`Uploading to S3: ${targetKey}`);
      await this.uploadToS3(buffer, targetKey, {
        'source-bucket': bucket,
        'source-path': filePath,
        'migration-checksum': checksum,
        'migration-date': new Date().toISOString(),
      });

      // Verify upload
      const verified = await this.verifyS3Upload(targetKey, checksum);
      if (!verified) {
        throw new Error('Upload verification failed');
      }

      // Store checksum and update stats
      this.checksums.set(targetKey, checksum);
      this.stats.migrated++;
      this.stats.migratedBytes += buffer.length;

      await this.logger.success(`Successfully migrated: ${targetKey}`, {
        size: buffer.length,
        checksum,
      });

      return true;
    } catch (error) {
      await this.logger.error(`Migration failed for ${targetKey}`, {
        error: error.message,
        retryCount,
      });

      if (retryCount < config.migration.retryAttempts) {
        await this.logger.info(`Retrying migration for ${targetKey} (attempt ${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, config.migration.retryDelay * (retryCount + 1)));
        return this.migrateFile(file, retryCount + 1);
      }

      this.stats.failed++;
      return false;
    }
  }

  async getFilesToMigrate() {
    const files = [];

    // Get inspection photos
    const { data: photos, error: photosError } = await supabase.storage
      .from('inspection-photos')
      .list('', { limit: 1000, sortBy: { column: 'created_at', order: 'asc' } });

    if (photosError) {
      throw new Error(`Failed to list photos: ${photosError.message}`);
    }

    for (const photo of photos || []) {
      files.push({
        bucket: 'inspection-photos',
        filePath: photo.name,
        targetKey: `photos/migrated/${photo.name}`,
        type: 'photo',
        size: photo.metadata?.size || 0,
      });
    }

    // Get inspection reports
    const { data: reports, error: reportsError } = await supabase.storage
      .from('inspection-reports')
      .list('', { limit: 1000, sortBy: { column: 'created_at', order: 'asc' } });

    if (reportsError) {
      throw new Error(`Failed to list reports: ${reportsError.message}`);
    }

    for (const report of reports || []) {
      files.push({
        bucket: 'inspection-reports',
        filePath: report.name,
        targetKey: `reports/migrated/${report.name}`,
        type: 'report',
        size: report.metadata?.size || 0,
      });
    }

    this.stats.total = files.length;
    this.stats.totalBytes = files.reduce((sum, file) => sum + file.size, 0);

    return files;
  }

  async processBatch(files) {
    const promises = files.map(file => this.migrateFile(file));
    const results = await Promise.allSettled(promises);
    
    return results.map((result, index) => ({
      file: files[index],
      success: result.status === 'fulfilled' && result.value,
      error: result.status === 'rejected' ? result.reason : null,
    }));
  }

  async migrate() {
    try {
      await this.logger.info('Starting storage migration');
      
      // Validate environment
      await this.validateEnvironment();
      
      // Load existing progress
      await this.loadExistingChecksums();
      
      // Get files to migrate
      await this.logger.info('Discovering files to migrate');
      const files = await this.getFilesToMigrate();
      
      await this.logger.info(`Found ${files.length} files to migrate`, {
        totalSize: this.stats.totalBytes,
        photos: files.filter(f => f.type === 'photo').length,
        reports: files.filter(f => f.type === 'report').length,
      });

      // Process in batches
      for (let i = 0; i < files.length; i += config.migration.batchSize) {
        const batch = files.slice(i, i + config.migration.batchSize);
        
        await this.logger.info(`Processing batch ${Math.floor(i / config.migration.batchSize) + 1}`, {
          batchSize: batch.length,
          progress: `${i + batch.length}/${files.length}`,
        });

        await this.processBatch(batch);
        
        // Save progress
        await this.saveChecksums();
        
        // Progress update
        const progress = Math.round(((i + batch.length) / files.length) * 100);
        await this.logger.info(`Migration progress: ${progress}%`, this.stats);
      }

      // Final summary
      await this.logger.success('Migration completed', this.stats);
      
      return this.stats;
    } catch (error) {
      await this.logger.error('Migration failed', { error: error.message });
      throw error;
    }
  }
}

// CLI execution
if (require.main === module) {
  const migrator = new StorageMigrator();
  
  migrator.migrate()
    .then(stats => {
      console.log('\n=== Migration Summary ===');
      console.log(`Total files: ${stats.total}`);
      console.log(`Migrated: ${stats.migrated}`);
      console.log(`Failed: ${stats.failed}`);
      console.log(`Skipped: ${stats.skipped}`);
      console.log(`Total data: ${(stats.totalBytes / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Migrated data: ${(stats.migratedBytes / 1024 / 1024).toFixed(2)} MB`);
      
      if (stats.failed > 0) {
        console.log('\nSome files failed to migrate. Check migration.log for details.');
        process.exit(1);
      } else {
        console.log('\nMigration completed successfully!');
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('Migration failed:', error.message);
      process.exit(1);
    });
}

module.exports = StorageMigrator;