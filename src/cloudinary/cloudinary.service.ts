import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'ecomerce/categories',
  ): Promise<UploadApiResponse> {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo para subir.');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            return reject(new BadRequestException(`Error de Cloudinary: ${error.message}`));
          }
          if (!result) {
            return reject(new BadRequestException('Error inesperado al subir a Cloudinary'));
          }
          resolve(result);
        },
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  async uploadBase64(
    base64Data: string,
    folder: string = 'ecomerce/categories',
  ): Promise<UploadApiResponse> {
    try {
      return await cloudinary.uploader.upload(base64Data, {
        folder,
        resource_type: 'image',
      });
    } catch (error: any) {
      throw new BadRequestException(`Error al subir base64 a Cloudinary: ${error?.message || error}`);
    }
  }

  async deleteImage(publicId: string): Promise<any> {
    try {
      return await cloudinary.uploader.destroy(publicId);
    } catch (error: any) {
      console.warn(`No se pudo eliminar la imagen ${publicId} de Cloudinary:`, error?.message);
    }
  }

  extractPublicId(url: string): string | null {
    if (!url || !url.includes('cloudinary.com')) return null;
    const regex = /\/upload\/(?:v\d+\/)?([^\.]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  async deleteImageByUrl(url: string): Promise<any> {
    const publicId = this.extractPublicId(url);
    if (publicId) {
      return await this.deleteImage(publicId);
    }
  }
}
