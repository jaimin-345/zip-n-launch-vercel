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

Your task: Find the PIXEL coordinates of the BLANK INPUT LINE/BOX next to each label on this scoresheet.

Labels to find:
1. SHOW: - find the horizontal line/box where show name gets written
2. CLASS: - find the horizontal line/box where class name gets written  
3. DATE: - find the horizontal line/box where date gets written
4. JUDGE: or Judge's Name: - find the line/box where judge name gets written

MEASUREMENT RULES:
- x = LEFT edge of the blank input area (where text would START, AFTER the colon and any space)
- y = TOP edge of that input line/row
- width = horizontal length of the input area (to the right edge or border)
- height = vertical height of the input line/row

Example: If "SHOW:" label ends at pixel 100, and the input line goes from pixel 105 to pixel 400, then x=105, width=295.

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
  "imageWidth": number,
  "imageHeight": number
}

Field measurement guide:
- x = LEFT edge of the input box (where text should START, after the label)
- y = TOP edge of the input row
- width = FULL width of the input box
- height = FULL height of the input row
- found = false if that label doesn't exist in the image`
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
