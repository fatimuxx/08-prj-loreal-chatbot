/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// System prompt — tells the AI how to behave
// This is sent with every request to guide the AI's responses
const messages = [
  {
    role: "system",
    content: `You are a knowledgeable and friendly L'Oréal beauty advisor. 
You only answer questions related to L'Oréal products, skincare routines, haircare routines, and beauty recommendations. 
If a user asks about anything unrelated to L'Oréal or beauty, politely let them know you can only help with L'Oréal-related topics and redirect them to ask about products or routines.
Always recommend specific L'Oréal product lines when relevant (e.g., Revitalift, EverPure, Elvive, True Match).
Keep your answers helpful, concise, and encouraging.`,
  },
];

// Set initial message in the chat window
chatWindow.innerHTML = `<div class="msg ai">👋 Hello! How can I help you today?</div>`;

/* Add a message bubble to the chat window */
function addMessage(role, text) {
  const div = document.createElement("div");
  div.classList.add("msg", role); // "user" or "ai"
  div.textContent = text;
  chatWindow.appendChild(div);
  // Scroll to the latest message
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Send the conversation to OpenAI and get a response */
async function getAIResponse() {
  // Call the OpenAI Chat Completions API
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // API key stored in secrets.js as: const OPENAI_API_KEY = "sk-..."
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: messages, // full conversation history including system prompt
    }),
  });

  // Parse the JSON response from OpenAI
  const data = await response.json();

  // Extract the AI's reply text
  const aiReply = data.choices[0].message.content;

  // Add the AI reply to the conversation history
  messages.push({ role: "assistant", content: aiReply });

  // Display the AI reply in the chat window
  addMessage("ai", aiReply);
}

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Get what the user typed
  const userText = userInput.value.trim();
  if (!userText) return;

  // Add the user's message to the conversation history
  messages.push({ role: "user", content: userText });

  // Display the user's message in the chat window
  addMessage("user", userText);

  // Clear the input field
  userInput.value = "";

  // Show a loading message while waiting for the API
  addMessage("ai", "Thinking…");

  // Call the API and display the response
  await getAIResponse();

  // Remove the "Thinking…" message
  const thinkingMsg = chatWindow.querySelector(".msg.ai:last-of-type");
  if (thinkingMsg && thinkingMsg.textContent === "Thinking…") {
    chatWindow.removeChild(thinkingMsg);
  }
});
