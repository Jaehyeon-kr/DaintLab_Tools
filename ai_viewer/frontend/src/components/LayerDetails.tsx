"use client";

import { LayerInfo } from "@/types/model";

interface LayerDetailsProps {
  layer: LayerInfo | null;
}

function formatParams(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toString();
}

export default function LayerDetails({ layer }: LayerDetailsProps) {
  if (!layer) {
    return (
      <div className="p-3 bg-gray-50 rounded-lg text-center text-xs text-gray-400">
        Click a layer to see details
      </div>
    );
  }

  return (
    <div className="p-3 bg-gray-50 rounded-lg space-y-2">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Layer Info</div>

      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">Name</span>
          <span className="font-mono text-gray-800">{layer.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Type</span>
          <span className="font-mono text-blue-600">{layer.type}</span>
        </div>
        {layer.input_shape && (
          <div className="flex justify-between">
            <span className="text-gray-500">Input</span>
            <span className="font-mono text-green-600">[{layer.input_shape.join(",")}]</span>
          </div>
        )}
        {layer.output_shape && (
          <div className="flex justify-between">
            <span className="text-gray-500">Output</span>
            <span className="font-mono text-purple-600">[{layer.output_shape.join(",")}]</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-500">Params</span>
          <span className="font-mono text-orange-600">{formatParams(layer.total_params || layer.params || 0)}</span>
        </div>
      </div>
    </div>
  );
}
