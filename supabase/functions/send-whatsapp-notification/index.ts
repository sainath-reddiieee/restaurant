import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface WhatsAppPayload {
  restaurantPhone: string;
  restaurantName: string;
  orderId: string;
  customerName: string;
  deliveryAddress: string;
  gpsCoordinates?: string;
  voiceNoteUrl?: string;
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const payload: WhatsAppPayload = await req.json();

    const itemsList = payload.items
      .map(item => `${item.quantity}x ${item.name} - ₹${item.price}`)
      .join("\n");

    const googleMapsLink = payload.gpsCoordinates
      ? `https://www.google.com/maps?q=${payload.gpsCoordinates}`
      : "Location not available";

    let message = `🔔 *NEW ORDER RECEIVED*\n\n`;
    message += `*Order ID:* ${payload.orderId}\n`;
    message += `*Customer:* ${payload.customerName}\n`;
    message += `*Payment:* ${payload.paymentMethod}\n\n`;
    message += `*Items:*\n${itemsList}\n\n`;
    message += `*Total Amount:* ₹${payload.totalAmount}\n\n`;
    message += `*Delivery Address:*\n${payload.deliveryAddress}\n\n`;
    message += `*Location:* ${googleMapsLink}\n`;

    if (payload.voiceNoteUrl) {
      message += `\n*Voice Note:* ${payload.voiceNoteUrl}\n`;
    }

    message += `\n⏰ Please confirm order and start preparing!`;

    const whatsappUrl = `https://wa.me/${payload.restaurantPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`;

    console.log("WhatsApp notification prepared for:", payload.restaurantPhone);
    console.log("Message:", message);

    return new Response(
      JSON.stringify({
        success: true,
        message: "WhatsApp notification URL generated",
        whatsappUrl,
        details: {
          orderId: payload.orderId,
          restaurantPhone: payload.restaurantPhone,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error processing WhatsApp notification:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to process notification",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
