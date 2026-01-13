"use client";

import { useState, useCallback, useMemo, Suspense, lazy, useEffect } from "react";
import { ModelStructure, LayerInfo, ComputationStep } from "@/types/model";
import ModelSelector from "@/components/ModelSelector";
import ModelViewer2D from "@/components/ModelViewer2D";
import LayerDetails from "@/components/LayerDetails";
import ComputationAnimation from "@/components/ComputationAnimation";
import ErrorBoundary from "@/components/ErrorBoundary";

const ModelViewer3D = lazy(() => import("@/components/ModelViewer3D"));

type ViewMode = "2d" | "3d";

interface ModelInfo {
  id: string;
  name: string;
  type: string;
  custom?: boolean;
}

export default function Home() {
  const [models, setModels] = useState<ModelInfo[]>([
    { id: "tiny_resnet", name: "Tiny ResNet", type: "CNN" },
    { id: "mini_transformer", name: "Mini Transformer", type: "Transformer" },
  ]);
  const [selectedModel, setSelectedModel] = useState("tiny_resnet");
  const [modelStructure, setModelStructure] = useState<ModelStructure | null>(null);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("2d");
  const [isLoading, setIsLoading] = useState(false);
  const [computationSteps, setComputationSteps] = useState<ComputationStep[]>([]);
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // 모델 목록 가져오기
  const fetchModels = useCallback(async () => {
    try {
      const response = await fetch("/api/models/list");
      if (response.ok) {
        const data = await response.json();
        setModels(data.models);
      }
    } catch (err) {
      console.error("Failed to fetch models:", err);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // 모델 업로드
  const handleModelUpload = useCallback(async (modelData: {
    file: File;
    name: string;
    modelType: string;
    inputChannels: number;
    inputHeight: number;
    inputWidth: number;
  }) => {
    const formData = new FormData();
    formData.append("file", modelData.file);
    formData.append("name", modelData.name);
    formData.append("model_type", modelData.modelType);
    formData.append("input_channels", modelData.inputChannels.toString());
    formData.append("input_height", modelData.inputHeight.toString());
    formData.append("input_width", modelData.inputWidth.toString());

    const response = await fetch("/api/models/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Upload failed");
    }

    const data = await response.json();

    // 업로드 성공 시 자동으로 선택
    setSelectedModel(data.model_id);
    return data;
  }, []);

  const loadModel = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/models/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_name: selectedModel }),
      });
      if (!response.ok) throw new Error("모델 로드 실패");
      const data = await response.json();
      setModelStructure(data.structure);
      setActiveLayerId(null);
      setComputationSteps([]);
      setInputImage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setIsLoading(false);
    }
  }, [selectedModel]);

  const runInference = useCallback(async () => {
    if (!modelStructure) return;
    try {
      const response = await fetch("/api/inference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_name: selectedModel }),
      });
      if (!response.ok) throw new Error("추론 실패");
      const data = await response.json();
      setComputationSteps(data.inference.steps);
      setInputImage(data.inference.input_image || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    }
  }, [modelStructure, selectedModel]);

  const handleStepChange = useCallback(
    (stepIndex: number) => {
      if (computationSteps[stepIndex]) {
        setActiveLayerId(computationSteps[stepIndex].layer_id);
      }
    },
    [computationSteps]
  );

  const activeLayer = useMemo((): LayerInfo | null => {
    if (!modelStructure || !activeLayerId) return null;
    const findLayer = (layers: LayerInfo[]): LayerInfo | null => {
      for (const layer of layers) {
        if (layer.id === activeLayerId) return layer;
        if (layer.children) {
          const found = findLayer(layer.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findLayer(modelStructure.layers);
  }, [modelStructure, activeLayerId]);

  return (
    <main className="h-screen flex flex-col bg-gray-50">
      {/* 헤더 */}
      <header className="h-12 bg-white border-b border-gray-200 px-4 flex items-center gap-3 shrink-0">
        <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
          <span className="text-white text-sm font-bold">AI</span>
        </div>
        <h1 className="text-base font-semibold text-gray-800">Model Viewer</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 사이드바 */}
        <aside className="w-64 bg-white border-r border-gray-200 p-3 overflow-y-auto shrink-0">
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            onLoadModel={loadModel}
            isLoading={isLoading}
            models={models}
            onModelUpload={handleModelUpload}
            onRefreshModels={fetchModels}
          />

          {error && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-xs">
              {error}
            </div>
          )}

          {modelStructure && (
            <div className="mt-3 space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-800">{modelStructure.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {modelStructure.total_params.toLocaleString()} params · {modelStructure.layers.length} layers
                </div>
              </div>

              <button
                onClick={runInference}
                className="w-full py-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
              >
                Run Inference
              </button>

              {/* 입력 이미지 표시 */}
              {inputImage && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Input Image</div>
                  <img
                    src={`data:image/png;base64,${inputImage}`}
                    alt="Input"
                    className="w-full rounded border border-gray-300"
                  />
                </div>
              )}

              <LayerDetails layer={activeLayer} />
            </div>
          )}
        </aside>

        {/* 메인 영역 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 뷰 모드 토글 */}
          {modelStructure && (
            <div className="h-10 bg-white border-b border-gray-200 px-4 flex items-center gap-1 shrink-0">
              <button
                onClick={() => setViewMode("2d")}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  viewMode === "2d"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                2D
              </button>
              <button
                onClick={() => setViewMode("3d")}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  viewMode === "3d"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                3D
              </button>
            </div>
          )}

          {/* 뷰어 */}
          <div className="flex-1 overflow-auto">
            {!modelStructure ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">🔬</div>
                  <p className="text-sm">Select a model and click Load</p>
                </div>
              </div>
            ) : viewMode === "2d" ? (
              <ModelViewer2D
                layers={modelStructure.layers}
                activeLayerId={activeLayerId}
                onLayerClick={setActiveLayerId}
              />
            ) : (
              <ErrorBoundary
                fallback={
                  <div className="h-full flex items-center justify-center text-red-400">
                    <div className="text-center">
                      <div className="text-2xl mb-2">3D Error</div>
                      <p className="text-sm">Failed to load 3D viewer</p>
                    </div>
                  </div>
                }
              >
                <Suspense
                  fallback={
                    <div className="h-full flex items-center justify-center text-gray-400">
                      Loading 3D viewer...
                    </div>
                  }
                >
                  <ModelViewer3D
                    layers={modelStructure.layers}
                    activeLayerId={activeLayerId}
                    onLayerClick={setActiveLayerId}
                    computationSteps={computationSteps}
                    inputImage={inputImage}
                  />
                </Suspense>
              </ErrorBoundary>
            )}
          </div>

          {/* 연산 과정 */}
          {modelStructure && (
            <div className="shrink-0 border-t border-gray-200 bg-white">
              <ComputationAnimation
                steps={computationSteps}
                isPlaying={isPlaying}
                onStepChange={handleStepChange}
                onPlayToggle={() => setIsPlaying(!isPlaying)}
                speed={animationSpeed}
                onSpeedChange={setAnimationSpeed}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
