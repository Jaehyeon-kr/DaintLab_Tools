import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model_name } = body;

    console.log(`[API] Loading model: ${model_name}`);

    const response = await fetch(`${BACKEND_URL}/models/${model_name}`);

    if (!response.ok) {
      console.error(`[API] Backend error: ${response.status}`);
      return NextResponse.json(
        { error: "Failed to load model from backend" },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[API] Model loaded: ${data.model_name}, layers: ${data.layers?.length}`);

    // 백엔드 응답을 프론트엔드 형식으로 변환
    const structure = {
      name: data.model_name,
      total_params: data.total_params,
      trainable_params: data.trainable_params,
      layers: data.layers,
    };

    return NextResponse.json({ structure });
  } catch (error) {
    console.error("[API] Error loading model:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
