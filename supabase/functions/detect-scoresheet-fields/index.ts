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
            content: `You are an expert image analyzer specialized in detecting form field input areas on horse show scoresheets.

Your task: Locate the EXACT pixel bounding box of the INPUT AREA (not the label) for these fields:
- "SHOW:" or "Show:" - the blank area where show name should be written
- "CLASS:" or "Class:" - the blank area where class name should be written
- "DATE:" or "Date:" - the blank area where date should be written
- "JUDGE:" or "Judge:" or "Judge's Name:" - the blank area where judge name should be written

CRITICAL MEASUREMENT INSTRUCTIONS:
1. These scoresheets have table-like structures with labels on the LEFT and input boxes on the RIGHT
2. Find where the LABEL TEXT ENDS and where the INPUT BOX BEGINS
3. x = The LEFT edge of the input box (immediately after the label, NOT the label itself)
4. y = The TOP edge of the input box row
5. width = The FULL width of the input box area (from left edge to right border)
6. height = The FULL height of the input box row

IMPORTANT:
- The input area is the WHITE/BLANK rectangular space to the RIGHT of each label
- Do NOT include the label text area in your measurements
- Fields are typically arranged vertically in a column format
- Each row has: [LABEL: ] [INPUT BOX________]
- Measure only the [INPUT BOX________] part`
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
