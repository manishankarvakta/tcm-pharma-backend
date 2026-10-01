const Minio = require("minio");
require("dotenv").config();


class MinIOPhotoManager {
  constructor() {
    this.client = new Minio.Client({
        endPoint: 'minio.aamardokan.online',
        port: 9000,
        useSSL: false,
        accessKey: 'rv58jpLuGmncE737Ce37',
        secretKey: 'XQb0ZoCB8KyuQR8ue8NUeW3Ksr1GC7TLGs7SpiWV',
        // region: 'dk-north-1',
        rejectUnauthorized: false,
    });
  } 

  async createBucket(bucketName) {
    try {
      const exists = await this.client.bucketExists(bucketName);
      if (!exists) {
        await this.client.makeBucket(bucketName);
        // await this.client.makeBucket(bucketName, 'dk-north-1');
        console.log(`Bucket ${bucketName} created successfully`);
        return true;
      }
      return false;
    } catch (error) {
      throw new Error(`Bucket creation failed: ${error.message}`);
    }
  }

  async uploadPhoto(bucketName, objectName, filePathOrBuffer) {
    try {
      await this.createBucket(bucketName);
      
      if (typeof filePathOrBuffer === 'string') {
        await this.client.fPutObject(bucketName, objectName, filePathOrBuffer);
      } else {
        await this.client.putObject(bucketName, objectName, filePathOrBuffer);
      }
      
      return this.getPhotoUrl(bucketName, objectName);
    } catch (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  async deletePhoto(bucketName, objectName) {
    try {
      await this.client.removeObject(bucketName, objectName);
      return true;
    } catch (error) {
      throw new Error(`Deletion failed: ${error.message}`);
    }
  }

  async getPhotoUrl(bucketName, objectName, expiry = 24 * 60 * 60) {
    try {
      return await this.client.presignedGetObject(bucketName, objectName, expiry);
    } catch (error) {
      throw new Error(`URL generation failed: ${error.message}`);
    }
  }

  async listPhotos(bucketName) {
    return new Promise((resolve, reject) => {
      const items = [];
      const stream = this.client.listObjects(bucketName);
      
      stream.on('data', (obj) => items.push({
        name: obj.name,
        size: obj.size,
        lastModified: obj.lastModified
      }));
      
      stream.on('end', () => resolve(items));
      stream.on('error', (error) => reject(error));
    });
  }

  async bucketExists(bucketName) {
    try {
      return await this.client.bucketExists(bucketName);
    } catch (error) {
      if (error.code === 'NoSuchBucket') return false;
      throw new Error(`Bucket check failed: ${error.message}`);
    }
  }

  async listBuckets() {
    try {
      const buckets = await this.client.listBuckets();
      return buckets.map(bucket => ({
        name: bucket.name,
        creationDate: bucket.creationDate
      }));
    } catch (error) {
      throw new Error(`Bucket listing failed: ${error.message}`);
    }
  }

  async deleteBucket(bucketName, force = false) {
    try {
      const exists = await this.bucketExists(bucketName);
      if (!exists) throw new Error(`Bucket "${bucketName}" does not exist`);

      const isEmpty = await this.isBucketEmpty(bucketName);
      
      if (!isEmpty) {
        if (!force) {
          throw new Error(`Bucket "${bucketName}" is not empty. Use force=true to delete anyway`);
        }
        await this.emptyBucket(bucketName);
      }

      await this.client.removeBucket(bucketName);
      return true;
    } catch (error) {
      throw new Error(`Bucket deletion failed: ${error.message}`);
    }
  }

  async isBucketEmpty(bucketName) {
    return new Promise((resolve, reject) => {
      const stream = this.client.listObjects(bucketName);
      let isEmpty = true;

      stream.on('data', () => {
        isEmpty = false;
        stream.destroy();
      });

      stream.on('end', () => resolve(isEmpty));
      stream.on('error', error => reject(error));
    });
  }

  async emptyBucket(bucketName) {
    return new Promise((resolve, reject) => {
      const objectsList = [];
      const stream = this.client.listObjects(bucketName);

      stream.on('data', obj => objectsList.push(obj.name));
      stream.on('end', async () => {
        try {
          await this.client.removeObjects(bucketName, objectsList);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      stream.on('error', error => reject(error));
    });
  }
}

module.exports = new MinIOPhotoManager(); 