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
            content: `You are analyzing a horse show scoresheet form. Your job is to find the BLANK INPUT AREAS where text will be written.

CRITICAL MATCHING RULES:
1. Look for these EXACT printed label texts: "SHOW:", "CLASS:", "DATE:", "JUDGE:" (or "Judge's Name:")
2. For EACH label, find the blank input line/box that is HORIZONTALLY ALIGNED on the SAME ROW
3. The input area is ALWAYS to the RIGHT of its label text
4. Do NOT confuse rows - each label has its OWN input area on the SAME horizontal line
5. "SIGNATURE" is NOT "JUDGE" - ignore signature lines
6. The JUDGE input is usually near the bottom, separate from SHOW/CLASS/DATE at top

COORDINATE RULES (normalized 0-1):
- x = left edge of blank input area / image width
- y = TOP edge of blank input area / image height  
- width = input area width / image width
- height = input area height / image height

Return ONLY valid JSON, no markdown.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Find the blank input areas for SHOW, CLASS, DATE, and JUDGE on this scoresheet.

STEP BY STEP:
1. Find the text "SHOW:" - look at what's directly to its RIGHT on the same line. That horizontal area is the show input.
2. Find the text "CLASS:" - look at what's directly to its RIGHT on the same line. That horizontal area is the class input.
3. Find the text "DATE:" - look at what's directly to its RIGHT on the same line. That horizontal area is the date input.
4. Find "JUDGE:" or "Judge's Name:" - look at what's directly to its RIGHT. That's the judge input. NOT the signature line.

Return this EXACT JSON structure:
{
  "fields": {
    "show": { "x": 0.XX, "y": 0.XX, "width": 0.XX, "height": 0.XX, "found": true },
    "class": { "x": 0.XX, "y": 0.XX, "width": 0.XX, "height": 0.XX, "found": true },
    "date": { "x": 0.XX, "y": 0.XX, "width": 0.XX, "height": 0.XX, "found": true },
    "judge": { "x": 0.XX, "y": 0.XX, "width": 0.XX, "height": 0.XX, "found": true }
  },
  "imageWidth": 1,
  "imageHeight": 1,
  "units": "normalized"
}

REMEMBER: 
- y is the TOP edge, not center
- Each field's y value should match the vertical position of its label
- SHOW, CLASS, DATE are usually stacked vertically at the top
- JUDGE is usually lower on the page`
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
