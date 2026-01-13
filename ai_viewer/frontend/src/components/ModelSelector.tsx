"use client";

import { useState, useRef } from "react";

interface Model {
  id: string;
  name: string;
  type: string;
  custom?: boolean;
}

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  onLoadModel: () => void;
  isLoading: boolean;
  models: Model[];
  onModelUpload: (modelData: {
    file: File;
    name: string;
    modelType: string;
    inputChannels: number;
    inputHeight: number;
    inputWidth: number;
  }) => Promise<void>;
  onRefreshModels: () => void;
}

export default function ModelSelector({
  selectedModel,
  onModelChange,
  onLoadModel,
  isLoading,
  models,
  onModelUpload,
  onRefreshModels,
}: ModelSelectorProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadType, setUploadType] = useState("cnn");
  const [inputChannels, setInputChannels] = useState(3);
  const [inputHeight, setInputHeight] = useState(32);
  const [inputWidth, setInputWidth] = useState(32);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !uploadName) {
      setUploadError("파일과 모델 이름을 입력하세요");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      await onModelUpload({
        file,
        name: uploadName,
        modelType: uploadType,
        inputChannels,
        inputHeight,
        inputWidth,
      });
      setShowUpload(false);
      setUploadName("");
      fileRef.current!.value = "";
      onRefreshModels();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Model</div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="text-xs text-blue-500 hover:text-blue-600"
        >
          {showUpload ? "Cancel" : "+ Upload"}
        </button>
      </div>

      {/* 업로드 폼 */}
      {showUpload && (
        <div className="p-3 bg-gray-50 rounded-lg space-y-2 text-xs">
          <input
            type="file"
            ref={fileRef}
            accept=".pt,.pth"
            className="w-full text-xs"
          />
          <input
            type="text"
            placeholder="Model name"
            value={uploadName}
            onChange={(e) => setUploadName(e.target.value)}
            className="w-full px-2 py-1 border rounded"
          />
          <select
            value={uploadType}
            onChange={(e) => setUploadType(e.target.value)}
            className="w-full px-2 py-1 border rounded"
          >
            <option value="cnn">CNN (Image)</option>
            <option value="transformer">Transformer (Text)</option>
          </select>

          {uploadType === "cnn" && (
            <div className="grid grid-cols-3 gap-1">
              <input
                type="number"
                placeholder="C"
                value={inputChannels}
                onChange={(e) => setInputChannels(Number(e.target.value))}
                className="px-2 py-1 border rounded text-center"
                title="Input Channels"
              />
              <input
                type="number"
                placeholder="H"
                value={inputHeight}
                onChange={(e) => setInputHeight(Number(e.target.value))}
                className="px-2 py-1 border rounded text-center"
                title="Input Height"
              />
              <input
                type="number"
                placeholder="W"
                value={inputWidth}
                onChange={(e) => setInputWidth(Number(e.target.value))}
                className="px-2 py-1 border rounded text-center"
                title="Input Width"
              />
            </div>
          )}

          {uploadError && (
            <div className="text-red-500 text-xs">{uploadError}</div>
          )}

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-1 bg-green-500 hover:bg-green-600 text-white rounded disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload Model"}
          </button>
        </div>
      )}

      {/* 모델 리스트 */}
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {models.map((m) => (
          <label
            key={m.id}
            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm transition-colors ${
              selectedModel === m.id
                ? "bg-blue-50 text-blue-700"
                : "hover:bg-gray-50 text-gray-700"
            }`}
          >
            <input
              type="radio"
              name="model"
              value={m.id}
              checked={selectedModel === m.id}
              onChange={(e) => onModelChange(e.target.value)}
              className="accent-blue-500"
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{m.name}</div>
              <div className="text-xs text-gray-400">
                {m.type}
                {m.custom && " (Custom)"}
              </div>
            </div>
          </label>
        ))}
      </div>

      <button
        onClick={onLoadModel}
        disabled={isLoading}
        className={`w-full py-2 text-sm rounded-lg transition-colors ${
          isLoading
            ? "bg-gray-100 text-gray-400"
            : "bg-blue-500 hover:bg-blue-600 text-white"
        }`}
      >
        {isLoading ? "Loading..." : "Load Model"}
      </button>
    </div>
  );
}
