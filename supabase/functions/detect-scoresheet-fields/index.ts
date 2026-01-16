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
            content: `You are an expert image analyzer for scoresheet form field detection.

Your task: Find the EXACT pixel positions of blank input lines/areas next to these labels:
- "SHOW:" or "Show:"
- "CLASS:" or "Class:"  
- "DATE:" or "Date:"
- "JUDGE:" or "Judge:" or "Judge's Name:"

CRITICAL INSTRUCTIONS:
1. Look for horizontal lines or blank rectangular areas next to each label
2. For X coordinate: Return the LEFT edge where the blank line/area STARTS (immediately after the label text ends)
3. For Y coordinate: Return the VERTICAL CENTER of the blank line (where text baseline should sit)
4. For width: Return the FULL width of the blank line/area from start to end
5. For height: Return the height of the text area (typically 18-25 pixels)

These are form fields where handwritten or typed values go. The coordinates must be precise for text overlay.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this scoresheet image. Find the blank input fields/lines next to each label.

Return ONLY this exact JSON structure (no markdown, no explanation):
{
  "fields": {
    "show": { "x": number, "y": number, "width": number, "height": number, "found": boolean },
    "class": { "x": number, "y": number, "width": number, "height": number, "found": boolean },
    "date": { "x": number, "y": number, "width": number, "height": number, "found": boolean },
    "judge": { "x": number, "y": number, "width": number, "height": number, "found": boolean }
  },
  "imageWidth": number,
  "imageHeight": number
}

Remember:
- x = left edge of the blank area (after label text)
- y = vertical center of the line where text should be written
- width = full width of the blank input area
- height = height of the text field area
- Set found=false if the field label doesn't exist in the image`
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
