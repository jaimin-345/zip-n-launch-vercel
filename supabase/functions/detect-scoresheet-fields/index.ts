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
            content: `You analyze scoresheet/form images and must detect the BLANK INPUT LINE/BOX to the RIGHT of each header label.

CRITICAL:
- You MUST first read the printed label text on the LEFT, then choose the blank input area that belongs to THAT label on the SAME row.
- Do NOT guess by row order.
- Do NOT use the SIGNATURE row for JUDGE.
- Return NORMALIZED coordinates (fractions), not pixels.

Allowed label types (lowercase): show, class, date, judge, signature

For each detected row, return:
- label: one of the allowed label types
- box: the blank input area to the right of that label

Coordinates:
- x, y = TOP-LEFT of the blank input area
- width, height = full size of the blank input area
- all numbers must be between 0 and 1

If a label is not present, omit it from lines.
Return ONLY JSON (no markdown).`
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
      
       const parsed = JSON.parse(cleanContent);

       // Normalize new "lines[]" format into legacy "fields" format expected by the frontend
       if (parsed?.lines && Array.isArray(parsed.lines)) {
         const blank = { x: 0, y: 0, width: 0, height: 0, found: false };
         const fields: Record<string, any> = {
           show: { ...blank },
           class: { ...blank },
           date: { ...blank },
           judge: { ...blank },
         };

         for (const item of parsed.lines) {
           const label = String(item?.label || '').toLowerCase().trim();
           const box = item?.box;
           if (!box) continue;
           if (label === 'show' || label === 'class' || label === 'date' || label === 'judge') {
             fields[label] = {
               x: Number(box.x) || 0,
               y: Number(box.y) || 0,
               width: Number(box.width) || 0,
               height: Number(box.height) || 0,
               found: Boolean(box.found),
             };
           }
         }

         fieldPositions = {
           fields,
           imageWidth: 1,
           imageHeight: 1,
           units: 'normalized',
           debug: { lines: parsed.lines },
         };
       } else {
         fieldPositions = parsed;
       }
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
