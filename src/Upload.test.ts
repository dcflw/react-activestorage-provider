import { describe, it, expect, vi, beforeEach, test } from "vitest";
import { DirectUpload } from "@rails/activestorage";

import Upload from "./Upload";

vi.mock("@rails/activestorage", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@rails/activestorage")>();

  return {
    ...mod,
    DirectUpload: vi.fn(
      (file) =>
        ({
          id: 1,
          file,
          url: "",
          create(cb) {
            cb(
              null as unknown as Error,
              { signed_id: "signedId" } as ActiveStorage.Blob,
            );
          },
        }) as DirectUpload,
    ),
  };
});

const file = new File([], "file");
const options = {
  onChangeFile: vi.fn(),
  onBeforeBlobRequest: vi.fn(),
  onBeforeStorageRequest: vi.fn(),
};

describe("Upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("falls back to default options", () => {
      const upload = new Upload(file, {
        ...options,
        directUploadsPath: undefined,
      });
      expect(upload.options.directUploadsPath).toEqual(
        Upload.CONVENTIONAL_DIRECT_UPLOADS_PATH,
      );
    });

    it("reports that it is waiting to upload", () => {
      new Upload(file, options);

      expect(options.onChangeFile).toHaveBeenCalledWith({
        1: { state: "waiting", id: "1", file },
      });
    });
  });

  describe("directUploadsUrl", () => {
    it("uses the conventional direct upload url by default", () => {
      const upload = new Upload(file, options);
      expect(upload.directUploadsUrl).toEqual(
        "/rails/active_storage/direct_uploads",
      );
    });

    test.each`
      protocol     | host         | port         | url
      ${"http"}    | ${"0.0.0.0"} | ${3000}      | ${"http://0.0.0.0:3000/rails/active_storage/direct_uploads"}
      ${"http"}    | ${"0.0.0.0"} | ${undefined} | ${"http://0.0.0.0/rails/active_storage/direct_uploads"}
      ${"http://"} | ${"0.0.0.0"} | ${undefined} | ${"http://0.0.0.0/rails/active_storage/direct_uploads"}
      ${undefined} | ${"0.0.0.0"} | ${3000}      | ${"//0.0.0.0:3000/rails/active_storage/direct_uploads"}
      ${undefined} | ${"0.0.0.0"} | ${undefined} | ${"//0.0.0.0/rails/active_storage/direct_uploads"}
    `(
      "allows the consumer to specify a different origin { protocol: $protocol, host: $host, port: $port}",
      ({ protocol, host, port, url }) => {
        const origin = { protocol, host, port };
        const upload = new Upload(file, { ...options, origin });
        expect(upload.directUploadsUrl).toEqual(url);
      },
    );
  });

  describe("start()", () => {
    it("resolves with the signed id from the direct upload", async () => {
      const upload = new Upload(file, options);
      expect(await upload.start()).toEqual("signedId");
    });

    it("reports that the upload is finished if it does so", async () => {
      const upload = new Upload(file, options);
      await upload.start();
      expect(options.onChangeFile).toHaveBeenCalledWith({
        1: { state: "finished", id: "1", file },
      });
    });

    describe("if the upload fails", () => {
      beforeEach(() => {
        vi.mocked(DirectUpload).mockImplementationOnce(
          (file) =>
            ({
              id: 1,
              file,
              create(cb) {
                cb(new Error("Failed"), null as unknown as ActiveStorage.Blob);
              },
            }) as DirectUpload,
        );
      });

      it("rejects with the error", async () => {
        const upload = new Upload(file, options);
        expect(upload.start()).rejects.toEqual(new Error("Failed"));
      });

      it("reports an error", async () => {
        const upload = new Upload(file, options);
        await upload.start().catch(() => {});
        expect(options.onChangeFile).toHaveBeenCalledWith({
          1: { state: "error", id: "1", file, error: new Error("Failed") },
        });
      });
    });
  });

  describe("as a direct upload delegate", () => {
    describe("directUploadWillCreateBlobWithXHR", () => {
      it("calls options.onBeforeBlobRequest", () => {
        const xhr = new XMLHttpRequest();
        const upload = new Upload(file, options);
        upload.directUploadWillCreateBlobWithXHR(xhr);
        expect(options.onBeforeBlobRequest).toHaveBeenCalledWith({
          id: "1",
          file,
          xhr,
        });
      });

      describe("if headers are provided", () => {
        const mockXHR = {
          setRequestHeader: vi.fn(),
          readyState: 1,
        };
        vi.stubGlobal(
          "XMLHttpRequest",
          vi.fn(() => mockXHR),
        );

        it("adds the headers to the xhr request", () => {
          const xhr = new XMLHttpRequest();
          const headerKey = "Test-Header";
          const headerValue = "testValue";
          const headers = { [headerKey]: headerValue };
          const upload = new Upload(file, { headers, ...options });
          upload.directUploadWillCreateBlobWithXHR(xhr);
          expect(mockXHR.setRequestHeader).toHaveBeenCalledWith(
            headerKey,
            headerValue,
          );
        });
      });
    });

    describe("directUploadWillStoreFileWithXHR", () => {
      it("calls options.onBeforeStorageRequest", () => {
        const xhr = { upload: { addEventListener: vi.fn() } };
        const upload = new Upload(file, options);
        upload.directUploadWillStoreFileWithXHR(
          xhr as unknown as XMLHttpRequest,
        );
        expect(options.onBeforeStorageRequest).toHaveBeenCalledWith({
          id: "1",
          file,
          xhr,
        });
      });

      it("listens for progress", () => {
        const xhr = { upload: { addEventListener: vi.fn() } };
        const upload = new Upload(file, options);
        upload.directUploadWillStoreFileWithXHR(
          xhr as unknown as XMLHttpRequest,
        );
        expect(xhr.upload.addEventListener).toHaveBeenCalledWith(
          "progress",
          upload.handleProgress,
        );
      });
    });

    describe("handleProgress", () => {
      it("reports uploading with the progress", () => {
        const upload = new Upload(file, options);
        upload.handleProgress({ loaded: 20, total: 100 } as ProgressEvent);
        expect(options.onChangeFile).toHaveBeenCalledWith({
          1: {
            id: "1",
            state: "uploading",
            file,
            progress: 20,
          },
        });
      });
    });
  });
});
