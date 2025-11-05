import TransportStream = require('winston-transport');

declare namespace DailyRotateFile {
  interface DailyRotateFileTransportOptions extends TransportStream.TransportStreamOptions {
    filename?: string;
    dirname?: string;
    datePattern?: string;
    zippedArchive?: boolean;
    frequency?: string;
    utc?: boolean;
    maxSize?: string | number;
    maxFiles?: string | number;
    auditFile?: string;
    extension?: string;
    createSymlink?: boolean;
    symlinkName?: string;
    [key: string]: unknown;
  }
}

declare class DailyRotateFile extends TransportStream {
  constructor(options?: DailyRotateFile.DailyRotateFileTransportOptions);
}

declare module 'winston-daily-rotate-file' {
  export = DailyRotateFile;
}
