import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();
    
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'imageUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Analyzing scoresheet image for field positions...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert at analyzing form images and detecting input field coordinates.

Your task: Find the BLANK INPUT LINE/BOX next to each label on this scoresheet.

Labels to find:
1. SHOW: - find the horizontal line/box where show name gets written
2. CLASS: - find the horizontal line/box where class name gets written
3. DATE: - find the horizontal line/box where date gets written
4. JUDGE: or Judge's Name: - find the line/box where judge name gets written

OUTPUT FORMAT (IMPORTANT):
- Return NORMALIZED coordinates (fractions), not pixels.
- x, y, width, height must be numbers between 0 and 1.
  - x = left edge of blank input area / imageWidth
  - y = top edge of blank input area / imageHeight
  - width = input area width / imageWidth
  - height = input area height / imageHeight

This avoids guessing image dimensions and keeps results consistent.

Return ONLY the coordinates you can see. If a field's input area is unclear, set found=false.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this scoresheet image carefully. Find the blank INPUT AREAS (not labels) for each field.

The scoresheet has a box/table structure. For each field, measure the WHITE INPUT AREA next to the label.

Return ONLY this exact JSON structure (no markdown, no code blocks, no explanation):
{
  "fields": {
    "show": { "x": number, "y": number, "width": number, "height": number, "found": boolean },
    "class": { "x": number, "y": number, "width": number, "height": number, "found": boolean },
    "date": { "x": number, "y": number, "width": number, "height": number, "found": boolean },
    "judge": { "x": number, "y": number, "width": number, "height": number, "found": boolean }
  },
  "imageWidth": 1,
  "imageHeight": 1,
  "units": "normalized"
}

Normalization guide (MUST follow):
- x, y, width, height are FRACTIONS between 0 and 1
- x = left edge of input area / full image width
- y = top edge of input area / full image height
- width = input width / full image width
- height = input height / full image height

If a label doesn't exist in the image, set found=false and set x/y/width/height to 0.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits required. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log('AI Response:', content);

    // Parse the JSON response
    let fieldPositions;
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      }
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();
      
      fieldPositions = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Return default positions if parsing fails
      fieldPositions = {
        fields: {
          show: { x: 0, y: 0, width: 0, found: false },
          date: { x: 0, y: 0, width: 0, found: false },
          judge: { x: 0, y: 0, width: 0, found: false },
          class: { x: 0, y: 0, width: 0, found: false }
        },
        imageWidth: 0,
        imageHeight: 0,
        parseError: true
      };
    }

    return new Response(
      JSON.stringify(fieldPositions),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in detect-scoresheet-fields:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
