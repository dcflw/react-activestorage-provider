import * as ActiveStorage from "@rails/activestorage";
import { buildUrl, compactObject } from "./helpers";

import type { ActiveStorageFileUpload, Origin, CustomHeaders } from "./types";

export interface UploadOptions {
  origin?: Origin;
  directUploadsPath?: string;
  onBeforeBlobRequest?: (request: {
    id: string;
    file: File;
    xhr: XMLHttpRequest;
  }) => void;
  onBeforeStorageRequest?: (request: {
    id: string;
    file: File;
    xhr: XMLHttpRequest;
  }) => void;
  onChangeFile: (uploads: { [key: string]: ActiveStorageFileUpload }) => void;
  headers?: CustomHeaders;
}

/** Perform the direct upload of a single file. */
class Upload implements ActiveStorage.DirectUploadDelegate {
  static CONVENTIONAL_DIRECT_UPLOADS_PATH =
    "/rails/active_storage/direct_uploads";

  static defaultOptions = {
    origin: {},
    directUploadsPath: Upload.CONVENTIONAL_DIRECT_UPLOADS_PATH,
  };

  directUpload: ActiveStorage.DirectUpload;
  options: UploadOptions & typeof Upload.defaultOptions;

  constructor(file: File, options: UploadOptions) {
    this.options = { ...Upload.defaultOptions, ...compactObject(options) };
    this.directUpload = new ActiveStorage.DirectUpload(
      file,
      this.directUploadsUrl,
      this,
    );

    this.handleChangeFile({ state: "waiting", id: this.id, file });
  }

  get id(): string {
    return `${this.directUpload.id}`;
  }

  get directUploadsUrl(): string {
    const { origin, directUploadsPath } = this.options;

    return buildUrl({ ...origin, path: directUploadsPath });
  }

  handleChangeFile = (upload: ActiveStorageFileUpload) => {
    this.options.onChangeFile({ [this.id]: upload });
  };

  handleProgress = ({ loaded, total }: ProgressEvent) => {
    const progress = (loaded / total) * 100;

    this.handleChangeFile({
      state: "uploading",
      file: this.directUpload.file,
      id: this.id,
      progress,
    });
  };

  handleSuccess = (signedId: string) => {
    this.handleChangeFile({
      state: "finished",
      id: this.id,
      file: this.directUpload.file,
    });
    return signedId;
  };

  handleError = (error: string) => {
    this.handleChangeFile({
      state: "error",
      id: this.id,
      file: this.directUpload.file,
      error,
    });
    throw error;
  };

  start() {
    const promise = new Promise<string>((resolve, reject) => {
      this.directUpload.create((error, attributes) => {
        if (error) reject(error);
        else resolve(attributes.signed_id);
      });
    });

    return promise.then(this.handleSuccess).catch(this.handleError);
  }

  directUploadWillCreateBlobWithXHR(xhr: XMLHttpRequest) {
    this.addHeaders(xhr);

    this.options.onBeforeBlobRequest?.({
      id: this.id,
      file: this.directUpload.file,
      xhr,
    });
  }

  directUploadWillStoreFileWithXHR(xhr: XMLHttpRequest) {
    this.options.onBeforeStorageRequest?.({
      id: this.id,
      file: this.directUpload.file,
      xhr,
    });

    xhr.upload.addEventListener("progress", this.handleProgress);
  }

  private addHeaders(xhr: XMLHttpRequest) {
    const headers = this.options.headers;
    if (headers) {
      for (const headerKey of Object.keys(headers)) {
        xhr.setRequestHeader(headerKey, headers[headerKey]);
      }
    }
  }
}

export default Upload;
