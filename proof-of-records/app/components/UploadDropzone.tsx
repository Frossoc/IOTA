"use client";

import { useCallback } from "react";

type UploadDropzoneProps = {
  onFileSelected: (file: File) => void;
};

export default function UploadDropzone({ onFileSelected }: UploadDropzoneProps) {
  const onInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        onFileSelected(file);
      }
    },
    [onFileSelected]
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (file) {
        onFileSelected(file);
      }
    },
    [onFileSelected]
  );

  return (
    <section style={{ marginTop: 16 }}>
      <input type="file" accept=".xlsx" onChange={onInputChange} />
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        style={{
          marginTop: 10,
          border: "1px dashed #aaa",
          borderRadius: 10,
          padding: 18,
          color: "#555",
        }}
      >
        Drag and drop a spreadsheet file here
      </div>
    </section>
  );
}
