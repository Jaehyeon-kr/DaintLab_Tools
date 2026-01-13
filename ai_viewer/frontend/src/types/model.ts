export interface LayerInfo {
  id: string;
  name: string;
  type: string;
  input_shape?: number[];
  output_shape?: number[];
  params?: number;
  total_params?: number;
  trainable_params?: number;
  children?: LayerInfo[];
  depth?: number;
}

export interface ModelStructure {
  name: string;
  total_params: number;
  layers: LayerInfo[];
}

export interface ActivationStats {
  mean: number;
  std: number;
  min: number;
  max: number;
}

export interface ComputationStep {
  step_index: number;
  layer_id: string;
  layer_name: string;
  operation: string;
  input_shape: number[];
  output_shape: number[];
  activation_stats?: ActivationStats;
  heatmap?: number[] | number[][];
  feature_map_image?: string;  // base64 encoded PNG
}

export interface InferenceResult {
  model_name: string;
  input_shape: number[];
  output_shape: number[];
  input_image?: string;  // base64 encoded input image
  steps: ComputationStep[];
}
