import assert from "node:assert/strict";
import test from "node:test";
import { serviceBookingDefinition } from "../lib/flow-definition/service-booking.ts";
import { validateFlowDefinition } from "../lib/flow-definition/validate.ts";
import { advanceRuntime, initialRuntimeState } from "../lib/runtime/engine.ts";

test("validates the service-booking definition and rejects unsafe graphs", () => {
  const definition = serviceBookingDefinition("flow_test");
  const valid = validateFlowDefinition(definition);
  assert.equal(valid.ok, true);

  const dangling = structuredClone(definition);
  const start = dangling.nodes.find((node) => node.id === "start");
  assert.ok(start && start.type === "start");
  start.next = "missing";
  const danglingResult = validateFlowDefinition(dangling);
  assert.equal(danglingResult.ok, false);
  if (!danglingResult.ok) assert.match(danglingResult.errors.join(" "), /missing node/i);

  const cycle = structuredClone(definition);
  const confirmation = cycle.nodes.find((node) => node.id === "confirm");
  assert.ok(confirmation && confirmation.type === "message");
  confirmation.next = "ask_name";
  const cycleResult = validateFlowDefinition(cycle);
  assert.equal(cycleResult.ok, false);
  if (!cycleResult.ok) assert.match(cycleResult.errors.join(" "), /cycle/i);
});

test("pauses, resumes, captures fields, runs one action, and completes with booking_created", () => {
  const definition = serviceBookingDefinition("flow_test");
  let result = advanceRuntime(definition, initialRuntimeState(definition));
  assert.equal(result.state.status, "waiting_for_input");
  assert.equal(result.state.waitingFor?.type, "input");
  assert.match(result.effects.find((effect) => effect.type === "message")?.text ?? "", /full name/i);

  const answers = ["Alya Putri", "+62 812 0000", "Toyota Yaris", "B 1234 CD", "Oil change", "2026-08-10"];
  for (const answer of answers) {
    result = advanceRuntime(definition, result.state, { type: "input", text: answer });
  }

  assert.equal(result.state.status, "waiting_for_action");
  const action = result.effects.find((effect) => effect.type === "action");
  assert.ok(action && action.type === "action");
  assert.equal(action.tool, "record_service_booking");
  assert.equal(action.input.customer_name, "Alya Putri");
  assert.ok(
    result.effects.some(
      (effect) => effect.type === "message" && effect.text.includes("Toyota Yaris") && effect.text.includes("B 1234 CD"),
    ),
  );

  result = advanceRuntime(definition, result.state, {
    type: "action_result",
    ok: true,
    output: { bookingId: "booking_123", bookingStatus: "created" },
  });
  assert.equal(result.state.status, "completed");
  assert.equal(result.state.outcome, "booking_created");
  assert.equal(result.state.variables.bookingId, "booking_123");
  assert.ok(result.effects.some((effect) => effect.type === "message" && /booking has been created/i.test(effect.text)));
});

test("runtime advancement is deterministic for the same definition, state, and input", () => {
  const definition = serviceBookingDefinition("flow_test");
  const initial = initialRuntimeState(definition);
  assert.deepEqual(advanceRuntime(definition, initial), advanceRuntime(definition, initial));
});
