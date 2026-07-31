import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { serviceBookings, toolInvocations } from "@/db/schema";

const REQUIRED_FIELDS = [
  "customer_name",
  "phone",
  "vehicle_model",
  "license_plate",
  "service_needed",
  "preferred_date",
] as const;

export type BookingToolContext = {
  workspaceId: string;
  conversationId: string;
  executionId: string;
  nodeId: string;
};

export type BookingToolResult = { bookingId: string; bookingStatus: string };

function validatedInput(input: Record<string, string>): Record<(typeof REQUIRED_FIELDS)[number], string> {
  const result = {} as Record<(typeof REQUIRED_FIELDS)[number], string>;
  for (const field of REQUIRED_FIELDS) {
    const value = input[field]?.trim();
    if (!value) throw new Error(`Booking field ${field} is required.`);
    result[field] = value.slice(0, 500);
  }
  return result;
}

export async function recordServiceBooking(
  context: BookingToolContext,
  input: Record<string, string>,
): Promise<BookingToolResult> {
  const values = validatedInput(input);
  const db = await getDb();
  const idempotencyKey = `${context.executionId}:${context.nodeId}:record_service_booking`;
  const now = Date.now();

  const [existingInvocation] = await db
    .select()
    .from(toolInvocations)
    .where(eq(toolInvocations.idempotencyKey, idempotencyKey))
    .limit(1);
  if (existingInvocation?.status === "completed" && existingInvocation.output) {
    return JSON.parse(existingInvocation.output) as BookingToolResult;
  }

  await db
    .insert(toolInvocations)
    .values({
      id: crypto.randomUUID(),
      executionId: context.executionId,
      nodeId: context.nodeId,
      toolName: "record_service_booking",
      idempotencyKey,
      status: "running",
      input: JSON.stringify(values),
      createdAt: now,
    })
    .onConflictDoNothing({ target: toolInvocations.idempotencyKey });

  const candidateId = crypto.randomUUID();
  await db
    .insert(serviceBookings)
    .values({
      id: candidateId,
      workspaceId: context.workspaceId,
      conversationId: context.conversationId,
      customerName: values.customer_name,
      phone: values.phone,
      vehicleModel: values.vehicle_model,
      licensePlate: values.license_plate,
      serviceNeeded: values.service_needed,
      preferredDate: values.preferred_date,
      status: "created",
      createdAt: now,
    })
    .onConflictDoNothing({ target: serviceBookings.conversationId });

  const [booking] = await db
    .select({ id: serviceBookings.id, status: serviceBookings.status })
    .from(serviceBookings)
    .where(eq(serviceBookings.conversationId, context.conversationId))
    .limit(1);
  if (!booking) throw new Error("The booking could not be stored.");

  const output: BookingToolResult = { bookingId: booking.id, bookingStatus: booking.status };
  await db
    .update(toolInvocations)
    .set({ status: "completed", output: JSON.stringify(output), completedAt: Date.now() })
    .where(eq(toolInvocations.idempotencyKey, idempotencyKey));
  return output;
}
