"use client";

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  onLoadModel: () => void;
  isLoading: boolean;
}

const models = [
  { id: "tiny_resnet", name: "Tiny ResNet", desc: "CNN for images" },
  { id: "mini_transformer", name: "Mini Transformer", desc: "Transformer for text" },
];

export default function ModelSelector({
  selectedModel,
  onModelChange,
  onLoadModel,
  isLoading,
}: ModelSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Model</div>

      <div className="space-y-1">
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
            <div>
              <div className="font-medium">{m.name}</div>
              <div className="text-xs text-gray-400">{m.desc}</div>
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
