/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const latestQuestion = document.getElementById("latestQuestion");

// System prompt — tells the AI how to behave
// This is sent with every request to guide the AI's responses
const messages = [
  {
    role: "system",
    content: `You are a knowledgeable and friendly L'Oréal beauty advisor.

Your expertise covers ONLY these topics:
- L'Oréal products and product lines (e.g., Revitalift, EverPure, Elvive, True Match, Age Perfect, Infallible)
- Skincare routines and advice (cleansing, moisturizing, SPF, anti-aging, etc.)
- Haircare routines and advice (washing, conditioning, styling, color care, etc.)
- Beauty tips, makeup application, and ingredient recommendations related to L'Oréal

If a user asks about ANYTHING outside these topics — including but not limited to politics, sports, technology, food, travel, or other brands — you must:
1. Politely decline to answer that specific question
2. Remind the user that you are only able to assist with L'Oréal beauty topics
3. Suggest a related L'Oréal topic they could ask about instead

Example refusal: "I'm only able to help with L'Oréal beauty topics! I can't assist with that, but I'd love to recommend a skincare routine or help you find the perfect L'Oréal product. What can I help you with?"

Always be warm, encouraging, and on-brand.`,
  },
];

// Set initial message in the chat window
chatWindow.innerHTML = `<div class="msg ai">👋 Hello! How can I help you today?</div>`;

// Simple in-browser memory for better multi-turn conversations
const conversationMemory = {
  userName: null,
  pastQuestions: [],
};

/* Add a message bubble to the chat window */
function addMessage(role, text) {
  const div = document.createElement("div");
  div.classList.add("msg", role); // "user" or "ai"
  div.textContent = text;
  chatWindow.appendChild(div);
  // Scroll to the latest message
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return div;
}

/* Try to detect the user's name from a message like "my name is Ana" */
function updateUserName(userText) {
  const nameMatch = userText.match(
    /\b(?:my name is|i am|i'm)\s+([a-z][a-z'\-]*)\b/i,
  );
  if (nameMatch && nameMatch[1]) {
    const rawName = nameMatch[1];
    const cleanName =
      rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
    conversationMemory.userName = cleanName;
  }
}

/* Keep the last 5 user questions so the assistant can reference context */
function updatePastQuestions(userText) {
  conversationMemory.pastQuestions.push(userText);
  if (conversationMemory.pastQuestions.length > 5) {
    conversationMemory.pastQuestions.shift();
  }
}

/* Build a short system note with remembered conversation details */
function buildMemorySystemMessage() {
  const nameText = conversationMemory.userName
    ? `Known user name: ${conversationMemory.userName}.`
    : "Known user name: unknown.";

  const questionsText = conversationMemory.pastQuestions.length
    ? `Recent user questions: ${conversationMemory.pastQuestions.join(" | ")}`
    : "Recent user questions: none yet.";

  return {
    role: "system",
    content: `${nameText} ${questionsText} Use this context to give natural, multi-turn replies.`,
  };
}

/* Send the conversation to OpenAI and get a response */
async function getAIResponse() {
  // Send the original prompt + memory note + full chat history
  const messagesWithMemory = [
    messages[0],
    buildMemorySystemMessage(),
    ...messages.slice(1),
  ];

  // Call the Cloudflare Worker (which securely calls OpenAI server-side)
  const response = await fetch("https://lorealchatbot.farodr12.workers.dev/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: messagesWithMemory,
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

  // Update memory from the latest user message
  updateUserName(userText);
  updatePastQuestions(userText);

  // Add the user's message to the conversation history
  messages.push({ role: "user", content: userText });

  // Show only the latest question above the chat response area
  latestQuestion.textContent = `Latest question: ${userText}`;

  // Display the user's message in the chat window
  addMessage("user", userText);

  // Clear the input field
  userInput.value = "";

  // Show a loading message while waiting for the API
  const thinkingMsg = addMessage("ai", "Thinking...");

  // Call the API and display the response
  await getAIResponse();

  // Remove the "Thinking…" message
  if (thinkingMsg && thinkingMsg.parentNode) {
    chatWindow.removeChild(thinkingMsg);
  }
});
