import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model_name } = body;

    console.log(`[API] Running inference: ${model_name}`);

    // 백엔드 inference 엔드포인트 호출
    const response = await fetch(`${BACKEND_URL}/inference/${model_name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[API] Inference error:", error);
      return NextResponse.json(
        { error: "Failed to run inference" },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[API] Inference steps: ${data.steps?.length || 0}`);

    return NextResponse.json({
      inference: data,
    });
  } catch (error) {
    console.error("[API] Error running inference:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
