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

    // Validate modelUrl format - should be like https://detect.roboflow.com/workspace/project/version
    if (!modelUrl.includes('roboflow.com')) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid model URL format',
          hint: 'URL should be like: https://detect.roboflow.com/workspace/project/version'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construct Roboflow inference URL
    const inferenceUrl = `${modelUrl}?api_key=${ROBOFLOW_API_KEY}`;
    console.log('Calling Roboflow inference to:', modelUrl);

    const response = await fetch(inferenceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: imageBase64,
    });

    // Get response as text first to debug HTML responses
    const responseText = await response.text();
    const contentType = response.headers.get('content-type') || '';

    // Check if response is HTML (error page) instead of JSON
    if (contentType.includes('text/html') || responseText.trim().startsWith('<!') || responseText.includes('<html')) {
      console.error('Roboflow returned HTML instead of JSON. Status:', response.status);
      console.error('Response preview:', responseText.substring(0, 300));
      
      let errorMessage = 'Roboflow API returned an error page';
      if (response.status === 401 || response.status === 403) {
        errorMessage = 'Invalid or missing Roboflow API key';
      } else if (response.status === 404) {
        errorMessage = 'Model not found. Check your model URL format (workspace/project/version)';
      } else if (response.status === 429) {
        errorMessage = 'Rate limited by Roboflow API';
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage, status: response.status }),
        { status: response.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      console.error('Roboflow API error:', response.status, responseText);
      return new Response(
        JSON.stringify({ error: `Roboflow API error: ${response.status}`, details: responseText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON from text
    let result: RoboflowResponse;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Roboflow response:', responseText.substring(0, 200));
      return new Response(
        JSON.stringify({ error: 'Invalid JSON response from Roboflow', preview: responseText.substring(0, 100) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Roboflow returned ${result.predictions?.length || 0} predictions`);

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
