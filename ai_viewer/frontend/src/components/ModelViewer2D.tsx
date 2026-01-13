"use client";

import { LayerInfo } from "@/types/model";
import { useCallback } from "react";

interface ModelViewer2DProps {
  layers: LayerInfo[];
  activeLayerId: string | null;
  onLayerClick: (layerId: string) => void;
}

const colors: Record<string, string> = {
  Conv2d: "border-blue-400 bg-blue-50",
  Linear: "border-green-400 bg-green-50",
  BatchNorm2d: "border-amber-400 bg-amber-50",
  ReLU: "border-orange-400 bg-orange-50",
  MaxPool2d: "border-purple-400 bg-purple-50",
  AdaptiveAvgPool2d: "border-violet-400 bg-violet-50",
  LayerNorm: "border-yellow-400 bg-yellow-50",
  MultiheadAttention: "border-pink-400 bg-pink-50",
  Embedding: "border-cyan-400 bg-cyan-50",
  TransformerEncoderLayer: "border-fuchsia-400 bg-fuchsia-50",
  TransformerEncoder: "border-rose-400 bg-rose-50",
  default: "border-gray-300 bg-gray-50",
};

function getColor(type: string) {
  return colors[type] || colors.default;
}

export default function ModelViewer2D({ layers, activeLayerId, onLayerClick }: ModelViewer2DProps) {
  const renderLayer = useCallback(
    (layer: LayerInfo, index: number) => {
      const isActive = layer.id === activeLayerId;

      return (
        <div key={layer.id} className="flex flex-col items-center">
          {index > 0 && <div className="w-px h-3 bg-gray-300" />}
          <div
            onClick={() => onLayerClick(layer.id)}
            className={`
              cursor-pointer rounded border px-3 py-2 text-xs transition-all
              ${getColor(layer.type)}
              ${isActive ? "ring-2 ring-blue-500 ring-offset-1" : "hover:shadow-sm"}
            `}
          >
            <div className="font-medium text-gray-800">{layer.type}</div>
            <div className="text-gray-500 mt-0.5">{layer.name}</div>
          </div>
          {layer.children?.map((child, i) => renderLayer(child, i))}
        </div>
      );
    },
    [activeLayerId, onLayerClick]
  );

  return (
    <div className="p-4 overflow-auto h-full">
      <div className="flex flex-col items-center">
        {layers.map((layer, i) => renderLayer(layer, i))}
      </div>
    </div>
  );
}
