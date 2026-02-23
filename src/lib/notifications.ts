import { supabase } from "@/integrations/supabase/client";

interface NotifyParams {
  recipientEmail: string;
  recipientUserId?: string;
  type: string;
  subject: string;
  body: string;
  entityType?: string;
  entityId?: string;
}

export async function sendNotification(params: NotifyParams) {
  // 1. Log to notifications table
  const { data: notification, error: insertError } = await supabase
    .from("notifications")
    .insert({
      recipient_email: params.recipientEmail,
      recipient_user_id: params.recipientUserId,
      notification_type: params.type,
      subject: params.subject,
      body: params.body,
      entity_type: params.entityType,
      entity_id: params.entityId,
    } as any)
    .select("id")
    .single();

  if (insertError) {
    console.error("Failed to log notification:", insertError);
    return;
  }

  // 2. Invoke edge function to send email
  try {
    await supabase.functions.invoke("send-notification", {
      body: {
        to: params.recipientEmail,
        subject: params.subject,
        html: params.body,
        notification_id: notification?.id,
      },
    });
  } catch (err) {
    console.error("Failed to invoke send-notification:", err);
  }
}

// Email templates
export function orderStatusEmail(orderRef: string, newStatus: string, companyName: string): { subject: string; body: string } {
  return {
    subject: `Order ${orderRef} — Status Updated to ${newStatus}`,
    body: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">Order Status Update</h2>
        <p>The order <strong>${orderRef}</strong> for <strong>${companyName}</strong> has been updated.</p>
        <div style="background: #f4f4f8; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; font-size: 18px;">New Status: <strong>${newStatus}</strong></p>
        </div>
        <p style="color: #666; font-size: 13px;">— EWL Portal</p>
      </div>
    `,
  };
}

export function workerStageEmail(workerName: string, orderRef: string, newStage: string, companyName: string): { subject: string; body: string } {
  return {
    subject: `Worker ${workerName} — Pipeline Stage: ${newStage}`,
    body: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">Pipeline Stage Update</h2>
        <p>Worker <strong>${workerName}</strong> on order <strong>${orderRef}</strong> (${companyName}) has reached a new stage.</p>
        <div style="background: #f4f4f8; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; font-size: 18px;">New Stage: <strong>${newStage}</strong></p>
        </div>
        <p style="color: #666; font-size: 13px;">— EWL Portal</p>
      </div>
    `,
  };
}
