import {
  Controller,
  Get,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Express } from 'express';
import { createReadStream, createWriteStream } from 'fs';
import { Readable } from 'stream';
import { ReadableStream as NodeReadableStream } from 'stream/web';
import { pipeline } from 'stream/promises';

@Controller()
export class AppController {
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'),
        filename: (req, file, cb) => {
          const filename = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, filename);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.pdf$/)) {
          cb(new Error('Only PDF files are allowed'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return { message: 'File uploaded successfully!', file: file.filename };
  }

  @Get('download')
  getFile(): StreamableFile {
    const file = createReadStream(
      join(process.cwd(), 'downloads', 'google.pdf'),
    );
    return new StreamableFile(file, {
      type: 'application/pdf',
      disposition: 'attachment; filename="google.pdf"',
    });
  }

  @Post('request')
  async downloadFileToUploads() {
    const url = 'http://localhost:3000/api/download';
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const filename = `${uuidv4()}.pdf`;
    const fileStream = createWriteStream(
      join(process.cwd(), 'uploads', filename),
    );

    const nodeStream = Readable.fromWeb(
      response.body as unknown as NodeReadableStream,
    );

    try {
      await pipeline(nodeStream, fileStream);
      return {
        message: `File downloaded and saved successfully as ${filename}`,
      };
    } catch (error) {
      console.error('Failed to download and save file:', error);
      throw new Error('File download failed');
    }
  }
}
