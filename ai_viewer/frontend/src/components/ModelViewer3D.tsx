"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html, Line, RoundedBox, Text } from "@react-three/drei";
import { LayerInfo, ComputationStep } from "@/types/model";
import { useMemo, useState } from "react";
import * as THREE from "three";

interface ModelViewer3DProps {
  layers: LayerInfo[];
  activeLayerId: string | null;
  onLayerClick: (layerId: string) => void;
  computationSteps?: ComputationStep[];
  inputImage?: string | null; // base64 인코딩된 입력 이미지
}

type Vec3 = [number, number, number];

// 레이어 타입별 색상
const layerColors: Record<string, string> = {
  Conv2d: "#3b82f6",
  Linear: "#22c55e",
  BatchNorm2d: "#eab308",
  ReLU: "#f97316",
  MaxPool2d: "#a855f7",
  AdaptiveAvgPool2d: "#c084fc",
  Embedding: "#06b6d4",
  LayerNorm: "#facc15",
  TransformerEncoderLayer: "#ec4899",
  TransformerEncoder: "#f43f5e",
  MultiheadAttention: "#e879f9",
  default: "#6b7280",
};

function getLayerColor(type: string): string {
  return layerColors[type] || layerColors.default;
}

// 레이어 박스의 크기를 파라미터 수에 따라 계산
function getLayerSize(layer: LayerInfo): [number, number, number] {
  const params = layer.total_params || layer.params || 1;
  const baseWidth = 1.2;
  const baseHeight = 0.6;
  const baseDepth = 0.4;

  // 파라미터가 많을수록 더 큰 박스 (NaN 방지)
  const logVal = Math.log10(Math.max(1, params));
  const scale = Math.min(2, Math.max(1, isFinite(logVal) ? logVal / 4 : 1));
  return [baseWidth * scale, baseHeight * scale, baseDepth * scale];
}

// 개별 레이어 3D 박스
function LayerBox3D({
  layer,
  position,
  isActive,
  onClick,
  activationStep,
}: {
  layer: LayerInfo;
  position: Vec3;
  isActive: boolean;
  onClick: () => void;
  activationStep?: ComputationStep;
}) {
  const [hovered, setHovered] = useState(false);
  const color = getLayerColor(layer.type);
  const size = getLayerSize(layer);

  // activation이 있으면 intensity를 mean 값에 따라 조절
  const hasActivation = activationStep?.activation_stats !== undefined;
  const activationIntensity = hasActivation
    ? Math.min(1, Math.abs(activationStep!.activation_stats!.mean) * 2)
    : 0;

  return (
    <group position={position}>
      <RoundedBox
        args={size}
        radius={0.08}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={color}
          emissive={hasActivation ? "#ff6b6b" : color}
          emissiveIntensity={
            isActive ? 0.8 : hasActivation ? 0.3 + activationIntensity * 0.4 : hovered ? 0.3 : 0
          }
          transparent
          opacity={isActive ? 1 : 0.85}
        />
      </RoundedBox>

      {/* 레이어 타입 텍스트 */}
      <Text
        position={[0, 0, size[2] / 2 + 0.01]}
        fontSize={0.12}
        color="#fff"
        anchorX="center"
        anchorY="middle"
        maxWidth={size[0] - 0.1}
      >
        {layer.type}
      </Text>

      {/* 호버/활성 시 상세 정보 */}
      {(hovered || isActive) && (
        <Html position={[0, size[1] / 2 + 0.3, 0]} center>
          <div className="bg-white shadow-lg px-3 py-2 rounded-lg text-xs border min-w-[140px]">
            <div className="font-bold text-gray-800">{layer.type}</div>
            <div className="text-gray-500 text-[10px]">{layer.name}</div>
            {layer.total_params !== undefined && (
              <div className="text-blue-600 mt-1">
                {layer.total_params.toLocaleString()} params
              </div>
            )}
            {activationStep?.input_shape && (
              <div className="text-green-600 text-[10px]">
                In: [{activationStep.input_shape.join(", ")}]
              </div>
            )}
            {activationStep?.output_shape && (
              <div className="text-purple-600 text-[10px]">
                Out: [{activationStep.output_shape.join(", ")}]
              </div>
            )}
            {/* Feature Map 이미지 */}
            {activationStep?.feature_map_image && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="text-[10px] font-medium text-gray-600 mb-1">Feature Map</div>
                <img
                  src={`data:image/png;base64,${activationStep.feature_map_image}`}
                  alt="Feature Map"
                  className="w-16 h-16 rounded border border-gray-300"
                />
              </div>
            )}
            {activationStep?.activation_stats && (
              <div className="mt-1 pt-1 border-t border-gray-200">
                <div className="text-[10px] font-medium text-gray-600">Stats</div>
                <div className="text-[9px] text-gray-500">
                  mean: {activationStep.activation_stats.mean.toFixed(4)}
                </div>
                <div className="text-[9px] text-gray-500">
                  std: {activationStep.activation_stats.std.toFixed(4)}
                </div>
              </div>
            )}
          </div>
        </Html>
      )}

      {/* 활성화 시 글로우 효과 */}
      {(isActive || hasActivation) && (
        <mesh>
          <sphereGeometry args={[Math.max(...size) * 0.8, 16, 16]} />
          <meshBasicMaterial
            color={hasActivation ? "#ff6b6b" : color}
            transparent
            opacity={isActive ? 0.2 : 0.1 + activationIntensity * 0.1}
          />
        </mesh>
      )}
    </group>
  );
}

// 레이어 간 연결선
function LayerConnection({
  from,
  to,
  isActive,
}: {
  from: Vec3;
  to: Vec3;
  isActive: boolean;
}) {
  return (
    <Line
      points={[from, to]}
      color={isActive ? "#3b82f6" : "#cbd5e1"}
      lineWidth={isActive ? 3 : 1.5}
    />
  );
}

// 그룹 박스 (Transformer 블록 등을 감싸는 용도)
function GroupBox({
  position,
  size,
  label,
  color,
}: {
  position: Vec3;
  size: [number, number, number];
  label: string;
  color: string;
}) {
  return (
    <group position={position}>
      <RoundedBox args={size} radius={0.15}>
        <meshStandardMaterial color={color} transparent opacity={0.1} />
      </RoundedBox>
      <Text
        position={[0, size[1] / 2 + 0.2, 0]}
        fontSize={0.2}
        color={color}
        anchorX="center"
      >
        {label}
      </Text>
    </group>
  );
}

// 입력 이미지를 3D 공간에 표시하는 컴포넌트
function InputImagePlane({
  imageBase64,
  position,
  firstLayerX,
}: {
  imageBase64: string;
  position: Vec3;
  firstLayerX: number;
}) {
  const texture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    return loader.load(`data:image/png;base64,${imageBase64}`);
  }, [imageBase64]);

  // 이미지에서 첫 레이어까지의 거리 계산
  const arrowEndX = firstLayerX - position[0] - 0.8;

  return (
    <group position={position}>
      {/* 이미지 배경 프레임 */}
      <RoundedBox args={[2.4, 2.4, 0.15]} radius={0.12} position={[0, 0, -0.1]}>
        <meshStandardMaterial color="#1e293b" />
      </RoundedBox>
      {/* 실제 이미지 */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[2.2, 2.2]} />
        <meshBasicMaterial map={texture} />
      </mesh>
      {/* 라벨 */}
      <Text
        position={[0, -1.6, 0]}
        fontSize={0.25}
        color="#94a3b8"
        anchorX="center"
        fontWeight="bold"
      >
        Input Image
      </Text>
      {/* 화살표 라인 - 첫 레이어까지 연결 */}
      <Line
        points={[[1.4, 0, 0], [arrowEndX, 0, 0]]}
        color="#3b82f6"
        lineWidth={3}
      />
      {/* 화살표 머리 */}
      <mesh position={[arrowEndX + 0.15, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.18, 0.35, 8]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
    </group>
  );
}

export default function ModelViewer3D({
  layers,
  activeLayerId,
  onLayerClick,
  computationSteps = [],
  inputImage = null,
}: ModelViewer3DProps) {
  // layer_id -> ComputationStep 매핑
  const activationMap = useMemo(() => {
    const map = new Map<string, ComputationStep>();
    computationSteps.forEach((step) => {
      map.set(step.layer_id, step);
    });
    return map;
  }, [computationSteps]);

  // 레이어 배치 계산
  const { positions, connections, groups, cameraPosition, cameraTarget, inputImagePosition, firstLayerX } = useMemo(() => {
    const pos = new Map<string, Vec3>();
    const conn: { from: Vec3; to: Vec3; fromId: string; toId: string }[] = [];
    const grps: { position: Vec3; size: [number, number, number]; label: string; color: string }[] = [];

    // Transformer 레이어 그룹화 체크
    const transformerLayers = layers.filter(
      (l) => l.type.includes("Transformer") || l.type.includes("Attention")
    );
    const isTransformer = transformerLayers.length > 0;

    if (isTransformer) {
      // Transformer 모델: 세로 배치 + 그룹화
      const embeddingLayers = layers.filter(
        (l) => l.type === "Embedding" || l.type === "LayerNorm"
      );
      const otherLayers = layers.filter(
        (l) => !l.type.includes("Transformer") && l.type !== "Embedding" && l.type !== "LayerNorm"
      );

      let yOffset = layers.length * 0.5;
      const spacing = 1.2;

      // Embedding 레이어들
      embeddingLayers.forEach((layer, i) => {
        const y = yOffset - i * spacing;
        pos.set(layer.id, [-3, y, 0]);
      });

      // Transformer 레이어들 (그룹으로 묶음)
      if (transformerLayers.length > 0) {
        const groupY = yOffset - embeddingLayers.length * spacing - transformerLayers.length * spacing / 2;
        grps.push({
          position: [0, groupY, 0],
          size: [4, transformerLayers.length * spacing + 1, 0.6],
          label: "Transformer",
          color: "#ec4899",
        });

        transformerLayers.forEach((layer, i) => {
          const y = yOffset - (embeddingLayers.length + i) * spacing;
          pos.set(layer.id, [0, y, 0]);
        });
      }

      // 나머지 레이어들 (Linear 등)
      otherLayers.forEach((layer, i) => {
        const y = yOffset - (embeddingLayers.length + transformerLayers.length + i) * spacing;
        pos.set(layer.id, [3, y, 0]);
      });

      // 연결선
      layers.forEach((layer, i) => {
        if (i > 0) {
          const prevPos = pos.get(layers[i - 1].id);
          const currPos = pos.get(layer.id);
          if (prevPos && currPos) {
            conn.push({
              from: [prevPos[0], prevPos[1] - 0.4, prevPos[2]],
              to: [currPos[0], currPos[1] + 0.4, currPos[2]],
              fromId: layers[i - 1].id,
              toId: layer.id,
            });
          }
        }
      });
    } else {
      // CNN/일반 모델: 수평 배치 (입력 이미지 공간 확보를 위해 오프셋)
      const cnnSpacing = 2.5;
      const startX = 3; // 입력 이미지 오른쪽부터 시작
      layers.forEach((layer, i) => {
        pos.set(layer.id, [startX + i * cnnSpacing, 0, 0]);
        if (i > 0) {
          const prevPos = pos.get(layers[i - 1].id);
          if (prevPos) {
            conn.push({
              from: [prevPos[0] + 0.7, 0, 0],
              to: [startX + i * cnnSpacing - 0.7, 0, 0],
              fromId: layers[i - 1].id,
              toId: layer.id,
            });
          }
        }
      });
    }

    // 입력 이미지 위치 (첫 레이어 왼쪽)
    const imgPos: Vec3 = isTransformer
      ? [-6, layers.length * 0.5, 0]
      : [-2, 0, 0];

    // 카메라 위치 계산 (입력 이미지 포함해서 더 넓게)
    const totalWidth = isTransformer ? 0 : (3 + (layers.length - 1) * 2.5);
    const centerX = isTransformer ? 0 : totalWidth / 2;
    const camPos: Vec3 = isTransformer
      ? [0, 0, 18]
      : [centerX, 3, Math.max(30, layers.length * 3)];

    // 카메라 타겟 (레이어 체인 중앙)
    const camTarget: Vec3 = isTransformer
      ? [0, 0, 0]
      : [centerX, 0, 0];

    // 첫 번째 레이어의 X 위치
    const firstX = isTransformer ? -3 : 3;

    return {
      positions: pos,
      connections: conn,
      groups: grps,
      cameraPosition: camPos,
      cameraTarget: camTarget,
      inputImagePosition: imgPos,
      firstLayerX: firstX,
    };
  }, [layers]);

  // 활성화된 레이어의 인덱스 찾기
  const activeIndex = useMemo(() => {
    return layers.findIndex((l) => l.id === activeLayerId);
  }, [layers, activeLayerId]);

  return (
    <div className="w-full h-full bg-gradient-to-b from-gray-100 to-gray-200">
      <Canvas camera={{ position: cameraPosition, fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 10]} intensity={0.8} />
        <pointLight position={[-10, -10, -10]} intensity={0.3} />

        {/* 입력 이미지 */}
        {inputImage && (
          <InputImagePlane
            imageBase64={inputImage}
            position={inputImagePosition}
            firstLayerX={firstLayerX}
          />
        )}

        {/* 그룹 박스 */}
        {groups.map((group, i) => (
          <GroupBox
            key={i}
            position={group.position}
            size={group.size}
            label={group.label}
            color={group.color}
          />
        ))}

        {/* 레이어 박스들 */}
        {layers.map((layer) => {
          const p = positions.get(layer.id);
          if (!p) return null;
          return (
            <LayerBox3D
              key={layer.id}
              layer={layer}
              position={p}
              isActive={layer.id === activeLayerId}
              onClick={() => onLayerClick(layer.id)}
              activationStep={activationMap.get(layer.id)}
            />
          );
        })}

        {/* 연결선 */}
        {connections.map((c, i) => {
          // 활성화된 레이어로 들어오는 연결선 하이라이트
          const isActive =
            activeLayerId !== null &&
            (c.toId === activeLayerId ||
              (activeIndex > 0 && c.fromId === layers[activeIndex - 1]?.id && c.toId === activeLayerId));
          return (
            <LayerConnection key={i} from={c.from} to={c.to} isActive={isActive} />
          );
        })}

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={3}
          maxDistance={150}
          minPolarAngle={0}
          maxPolarAngle={Math.PI}
          minAzimuthAngle={-Infinity}
          maxAzimuthAngle={Infinity}
          target={cameraTarget}
          panSpeed={1.5}
          rotateSpeed={0.8}
        />

        {/* 바닥 그리드 */}
        <gridHelper args={[50, 50, "#ddd", "#eee"]} position={[0, -2, 0]} />
      </Canvas>

      {/* 범례 */}
      <div className="absolute bottom-4 left-4 bg-white/90 rounded-lg p-3 shadow text-xs">
        <div className="font-medium text-gray-700 mb-2">Layer Types</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {Object.entries(layerColors)
            .filter(([key]) => key !== "default")
            .slice(0, 6)
            .map(([type, color]) => (
              <div key={type} className="flex items-center gap-1">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: color }}
                />
                <span className="text-gray-600">{type}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
