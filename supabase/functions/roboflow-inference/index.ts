import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface RoboflowPrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
}

interface RoboflowResponse {
  predictions: RoboflowPrediction[];
  time: number;
  image: {
    width: number;
    height: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ROBOFLOW_API_KEY = Deno.env.get('ROBOFLOW_API_KEY');
    if (!ROBOFLOW_API_KEY) {
      throw new Error('ROBOFLOW_API_KEY is not configured');
    }

    const { imageBase64, modelUrl } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Image data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!modelUrl) {
      return new Response(
        JSON.stringify({ error: 'Model URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construct Roboflow inference URL
    // Format: https://detect.roboflow.com/{workspace}/{project}/{version}
    const inferenceUrl = `${modelUrl}?api_key=${ROBOFLOW_API_KEY}`;

    console.log('Calling Roboflow inference...');

    const response = await fetch(inferenceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: imageBase64,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Roboflow API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Roboflow API error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: RoboflowResponse = await response.json();
    console.log(`Roboflow returned ${result.predictions.length} predictions in ${result.time}s`);

    // Transform predictions to our Detection format
    const detections = result.predictions.map((pred, index) => ({
      id: index,
      type: pred.class,
      // Convert from center coordinates to top-left percentage
      x: ((pred.x - pred.width / 2) / result.image.width) * 100,
      y: ((pred.y - pred.height / 2) / result.image.height) * 100,
      width: (pred.width / result.image.width) * 100,
      height: (pred.height / result.image.height) * 100,
      confidence: pred.confidence * 100,
      // Raw pixel values for combat logic
      centerX: pred.x,
      centerY: pred.y,
      rawWidth: pred.width,
      rawHeight: pred.height,
    }));

    return new Response(
      JSON.stringify({ 
        detections, 
        inferenceTime: result.time,
        imageSize: result.image 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Inference error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
