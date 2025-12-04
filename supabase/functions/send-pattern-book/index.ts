import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendPatternBookRequest {
  email: string;
  pdfDataUri: string;
  bookName: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get("RESEND_API_KEY") ?? "");
    
    const { email, pdfDataUri, bookName }: SendPatternBookRequest = await req.json();

    console.log(`Sending pattern book "${bookName}" to ${email}`);

    // Extract base64 data from data URI
    const base64Data = pdfDataUri.split(',')[1];
    if (!base64Data) {
      throw new Error("Invalid PDF data URI format");
    }

    const fileName = `${bookName.replace(/\s+/g, '_')}.pdf`;

    const emailResponse = await resend.emails.send({
      from: "Pattern Book Builder <onboarding@resend.dev>",
      to: [email],
      subject: `Your Pattern Book: ${bookName}`,
      html: `
        <h1>Your Pattern Book is Ready!</h1>
        <p>Hello,</p>
        <p>Please find attached your pattern book: <strong>${bookName}</strong></p>
        <p>Thank you for using Pattern Book Builder!</p>
        <br>
        <p>Best regards,<br>The EquiPattern Team</p>
      `,
      attachments: [
        {
          filename: fileName,
          content: base64Data,
        },
      ],
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-pattern-book function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
