import type { FlowDefinition } from "./types.ts";

export function serviceBookingDefinition(flowId: string): FlowDefinition {
  return {
    schemaVersion: 1,
    id: `service_booking_${flowId}`,
    name: "Dealership Service Booking",
    entryNodeId: "start",
    variables: [
      { name: "customer_name", required: true },
      { name: "phone", required: true },
      { name: "vehicle_model", required: true },
      { name: "license_plate", required: true },
      { name: "service_needed", required: true },
      { name: "preferred_date", required: true },
    ],
    metadata: { domain: "dealership", scenario: "service_booking", language: "adaptive" },
    nodes: [
      { id: "start", type: "start", next: "ask_name" },
      {
        id: "ask_name",
        type: "capture",
        field: "customer_name",
        prompt: "Welcome! I can create a service booking for you. What is your full name?",
        required: true,
        next: "ask_phone",
      },
      {
        id: "ask_phone",
        type: "capture",
        field: "phone",
        prompt: "What phone number should the dealership use to contact you?",
        required: true,
        next: "ask_vehicle",
      },
      {
        id: "ask_vehicle",
        type: "capture",
        field: "vehicle_model",
        prompt: "What is your vehicle model?",
        required: true,
        next: "ask_plate",
      },
      {
        id: "ask_plate",
        type: "capture",
        field: "license_plate",
        prompt: "What is the vehicle license plate?",
        required: true,
        next: "ask_service",
      },
      {
        id: "ask_service",
        type: "capture",
        field: "service_needed",
        prompt: "What service or vehicle issue do you need help with?",
        required: true,
        next: "ask_date",
      },
      {
        id: "ask_date",
        type: "capture",
        field: "preferred_date",
        prompt: "What date would you prefer for the service?",
        required: true,
        next: "confirm",
      },
      {
        id: "confirm",
        type: "message",
        text: "Thanks, {{customer_name}}. I have {{vehicle_model}} ({{license_plate}}) for {{service_needed}} on {{preferred_date}}. I am creating that booking now.",
        next: "create_booking",
      },
      { id: "create_booking", type: "action", tool: "record_service_booking", next: "done" },
      {
        id: "done",
        type: "end",
        outcome: "booking_created",
        message: "Your booking has been created. The booking details are shown below in this chat.",
      },
    ],
  };
}
