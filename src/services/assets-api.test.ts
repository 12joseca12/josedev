import { buildAssetStoragePath, mapAssetRow } from "./assets-api";

describe("assets-api pure helpers", () => {
  it("builds the client-scoped storage path", () => {
    expect(buildAssetStoragePath("c-1", "a-9")).toBe("clients/c-1/a-9");
  });

  it("maps a snake_case row to the camelCase DTO", () => {
    const row = {
      id: "a-9",
      client_id: "c-1",
      source: "client" as const,
      storage_path: "clients/c-1/a-9",
      file_name: "logo.png",
      mime_type: "image/png",
      size_bytes: 1234,
      titulo: null,
      descripcion: "marca",
      created_at: "2026-07-11T10:00:00Z",
    };
    expect(mapAssetRow(row)).toEqual({
      id: "a-9",
      clientId: "c-1",
      source: "client",
      storagePath: "clients/c-1/a-9",
      fileName: "logo.png",
      mimeType: "image/png",
      sizeBytes: 1234,
      titulo: null,
      descripcion: "marca",
      createdAt: "2026-07-11T10:00:00Z",
    });
  });
});
