
async function sendFirstMessage(event) {
  event.preventDefault();

  if (!currentUser || !pendingSellerTicket) {
    message("sellerNotice", "Please sign in and select a ticket.", true);
    return;
  }

  const body = $("sellerFirstMessage").value.trim();

  if (!body) {
    message("sellerNotice", "Please write a message first.", true);
    return;
  }

  const ticket = pendingSellerTicket;
  const buyerId = currentUser.id;
  const sellerId = ticket.user_id;

  // Check that the ticket belongs to a real seller account.
  if (!sellerId || typeof sellerId !== "string") {
    message(
      "sellerNotice",
      "This ticket has no seller account linked to it. The listing needs to be fixed.",
      true
    );
    return;
  }

  if (buyerId === sellerId) {
    message("sellerNotice", "You cannot message yourself.", true);
    return;
  }

  const participants = [buyerId, sellerId];

  try {
    message("sellerNotice", "Sending message...");

    const { data: existing, error: findError } = await db
      .from("conversations")
      .select("id")
      .eq("ticket_id", ticket.id)
      .contains("participant_ids", participants)
      .maybeSingle();

    if (findError) throw findError;

    let conversationId = existing?.id;

    if (!conversationId) {
      const { data, error } = await db
        .from("conversations")
        .insert({
          ticket_id: ticket.id,
          participant_ids: participants
        })
        .select("id")
        .single();

      if (error) throw error;

      conversationId = data.id;
    }

    const { error: messageError } = await db
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: buyerId,
        body: body
      });

    if (messageError) throw messageError;

    closeSellerModal();
    openMessages();
    await openConversation(conversationId);
    notice("Message sent!");

  } catch (error) {
    console.error("Ticketly messaging error:", error);
    message("sellerNotice", error.message || "Could not send your message.", true);
  }
}
