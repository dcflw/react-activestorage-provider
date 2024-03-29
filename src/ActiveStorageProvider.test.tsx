import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ActiveStorageProvider, {
  type ActiveStorageProviderProps,
} from "./ActiveStorageProvider";
import { ButtonHandleUpload } from "./componentsForTests";

const mockUploadStart = vi.hoisted(() =>
  vi.fn(() => Promise.resolve("signedId")),
);

vi.mock("./Upload", () => ({
  default: vi.fn((file, { onChangeFile }) => {
    onChangeFile({ [Date.now()]: { fileName: file.name } });

    return {
      start: mockUploadStart,
    };
  }),
}));

const endpoint = {
  path: "/users/1",
  model: "User",
  attribute: "avatar",
  method: "PUT",
};

const userData = { id: "1", avatar: "file" };

vi.stubGlobal(
  "fetch",
  vi.fn(() => Promise.resolve(new Response(JSON.stringify(userData)))),
);

beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
});

describe("ActiveStorageProvider", () => {
  const defaultProps = {
    directUploadsPath: "direct_uploads/",
    endpoint,
    headers: { "X-Custom": "true" },
    multiple: false,
    onBeforeBlobRequest: vi.fn(),
    onBeforeStorageRequest: vi.fn(),
    onError: vi.fn(),
    onSubmit: vi.fn(),
    render: (props) => <ButtonHandleUpload {...props} />,
  } satisfies ActiveStorageProviderProps;

  it("hits the given endpoint with the signed id of the upload after it has finished", async () => {
    const user = userEvent.setup();

    render(<ActiveStorageProvider {...defaultProps} />);

    await user.click(screen.getByRole("button"));

    expect(fetch).toHaveBeenCalledWith(
      endpoint.path,
      expect.objectContaining({
        method: endpoint.method,
        body: JSON.stringify({
          [endpoint.model.toLowerCase()]: { avatar: "signedId" },
        }),
      }),
    );
    expect(defaultProps.onSubmit).toHaveBeenCalledWith(userData);
  });

  it("doesn’t hit the endpoint if handleUpload is called with no files", async () => {
    const user = userEvent.setup();

    render(
      <ActiveStorageProvider
        {...defaultProps}
        render={(props) => (
          <button onClick={() => props.handleUpload([])}>No files</button>
        )}
      />,
    );

    await user.click(screen.getByRole("button"));
    expect(fetch).not.toHaveBeenCalled();
  });

  describe("if custom headers are provided", () => {
    it("merges headers indifferently", async () => {
      const user = userEvent.setup();

      const baseCustomHeaders = { "TEST-HEADER": "testValue" };
      const customHeaders = {
        ...baseCustomHeaders,
        "X-CSRF-Token": "testToken",
      };

      render(
        <ActiveStorageProvider {...defaultProps} headers={customHeaders} />,
      );

      await user.click(screen.getByRole("button"));

      expect(fetch).toHaveBeenCalledWith(
        endpoint.path,
        expect.objectContaining({
          method: endpoint.method,
          body: JSON.stringify({
            [endpoint.model.toLowerCase()]: { avatar: "signedId" },
          }),
          headers: new Headers({
            Accept: "application/json",
            "Content-Type": "application/json",
            ...customHeaders,
          }),
        }),
      );

      cleanup();

      const newCustomHeaders = {
        ...baseCustomHeaders,
        "x-csrf-token": "testToken",
      };

      render(
        <ActiveStorageProvider {...defaultProps} headers={newCustomHeaders} />,
      );

      await user.click(screen.getByRole("button"));

      expect(fetch).toHaveBeenCalledWith(
        endpoint.path,
        expect.objectContaining({
          headers: new Headers({
            Accept: "application/json",
            "Content-Type": "application/json",
            ...customHeaders,
          }),
        }),
      );

      cleanup();

      render(
        <ActiveStorageProvider {...defaultProps} headers={baseCustomHeaders} />,
      );

      await user.click(screen.getByRole("button"));

      expect(fetch).toHaveBeenCalledWith(
        endpoint.path,
        expect.objectContaining({
          headers: new Headers({
            Accept: "application/json",
            "Content-Type": "application/json",
            ...baseCustomHeaders,
            "X-CSRF-Token": "value from vitest.config.ts",
          }),
        }),
      );
    });
  });

  describe("if no headers are provided", () => {
    it("adds a CSRF token through the meta tag", async () => {
      const user = userEvent.setup();

      render(<ActiveStorageProvider {...defaultProps} />);

      await user.click(screen.getByRole("button"));
      expect(fetch).toHaveBeenCalledWith(
        endpoint.path,
        expect.objectContaining({
          method: endpoint.method,
          body: JSON.stringify({
            [endpoint.model.toLowerCase()]: { avatar: "signedId" },
          }),
          headers: new Headers({
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-CSRF-Token": "value from vitest.config.ts",
          }),
        }),
      );
    });
  });
});
