import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateStaffUserRequest {
  email: string;
  name: string;
  role: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const resend = new Resend(Deno.env.get('RESEND_API_KEY') ?? '');
    
    const { email, name, role }: CreateStaffUserRequest = await req.json();

    console.log(`Creating user for email: ${email}, name: ${name}, role: ${role}`);

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .single();

    if (existingUser) {
      console.log('User already exists:', existingUser.id);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'User already exists',
          userId: existingUser.id,
          created: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new user with default password
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: '12345',
      email_confirm: true,
      user_metadata: {
        full_name: name
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      throw createError;
    }

    console.log('User created successfully:', newUser.user.id);

    // Update profile with role
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ role: role, full_name: name })
      .eq('id', newUser.user.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
    }

    // Send welcome email
    try {
      await resend.emails.send({
        from: 'EquiPatterns <onboarding@resend.dev>',
        to: [email],
        subject: 'Welcome to EquiPatterns - Your Account Has Been Created',
        html: `
          <h1>Welcome to EquiPatterns, ${name}!</h1>
          <p>Your account has been created as <strong>${role}</strong>.</p>
          <p><strong>Login Credentials:</strong></p>
          <ul>
            <li>Email: ${email}</li>
            <li>Temporary Password: <strong>12345</strong></li>
          </ul>
          <p>Please log in and change your password immediately for security reasons.</p>
          <p>Best regards,<br>The EquiPatterns Team</p>
        `,
      });
      console.log('Welcome email sent to:', email);
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Don't fail the request if email fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User created successfully',
        userId: newUser.user.id,
        created: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in create-staff-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});