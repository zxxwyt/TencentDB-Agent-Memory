import { describe, expect, it } from "vitest";
import { responsesBodyToChat } from "../common/responses-chat-compat.js";
import { responsesToAnthropic } from "../common/responses-anthropic-compat.js";

describe("Responses string input", () => {
  it.each(["Hello", "你好 🌏", "  first line\n\tsecond line  "])(
    "preserves the user text %j when converting to Chat Completions",
    (input) => {
      const result = responsesBodyToChat({ model: "test-model", input });

      expect(result.messages).toEqual([{ role: "user", content: input }]);
    },
  );

  it("keeps instructions separate and preserves request options", () => {
    const result = responsesBodyToChat(
      {
        model: "client-model",
        instructions: "Answer briefly.",
        input: "What is 2 + 2?",
        stream: false,
        temperature: 0.2,
      },
      { model: "upstream-model" },
    );

    expect(result).toMatchObject({
      model: "upstream-model",
      messages: [
        { role: "system", content: "Answer briefly." },
        { role: "user", content: "What is 2 + 2?" },
      ],
      stream: false,
      temperature: 0.2,
    });
  });

  it("preserves string input through the composed Anthropic conversion", () => {
    const result = responsesToAnthropic({
      model: "test-model",
      instructions: "Answer briefly.",
      input: "你好",
      stream: false,
    });

    expect(result).toMatchObject({
      system: "Answer briefly.",
      messages: [{ role: "user", content: "你好" }],
    });
  });

  it("preserves an existing message and tool-result history", () => {
    const input = [
      { type: "message", role: "user", content: "Check the weather." },
      {
        type: "function_call",
        call_id: "call_weather",
        name: "weather",
        arguments: '{"city":"Shanghai"}',
      },
      { type: "function_call_output", call_id: "call_weather", output: "Sunny" },
    ];
    const before = structuredClone(input);
    const result = responsesBodyToChat({ model: "test-model", input });

    expect(result.messages).toEqual([
      { role: "user", content: "Check the weather." },
      {
        role: "assistant",
        content: "",
        tool_calls: [{
          id: "call_weather",
          type: "function",
          function: { name: "weather", arguments: '{"city":"Shanghai"}' },
        }],
      },
      { role: "tool", tool_call_id: "call_weather", content: "Sunny" },
    ]);
    expect(input).toEqual(before);
  });
});
