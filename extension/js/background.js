// Gmail Smart Sidebar - Background Script
const OPENAI_API_KEY = "YOUR_OPENAI_API_KEY"; // Replace with your actual API key
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// Store sidebar visibility state
let sidebarVisible = true;

// Listen for extension icon clicks
chrome.action.onClicked.addListener((tab) => {
  if (tab.url.includes('mail.google.com')) {
    // Toggle the sidebar visibility state
    sidebarVisible = !sidebarVisible;
    
    // Update the icon to reflect current state
    const iconPath = sidebarVisible 
      ? "images/icon128.png" 
      : "images/icon48.png"; // Using a different icon for off state
      
    chrome.action.setIcon({ path: iconPath, tabId: tab.id });
    
    // Send a message to the content script to toggle sidebar
    chrome.tabs.sendMessage(tab.id, {
      action: "toggleSidebar",
      visible: sidebarVisible
    }).catch(error => {
      console.error("Error sending toggle message:", error);
    });
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "processEmail") {
    console.log("Background: Received request to process email", {
      sender: request.data.sender,
      subject: request.data.subject,
      bodyLength: request.data.body ? request.data.body.length : 0
    });
    
    processEmailWithOpenAI(request.data)
      .then(response => {
        console.log("Background: Successfully processed email with OpenAI", response);
        sendResponse({ success: true, data: response });
      })
      .catch(error => {
        console.error("Background: Error processing email:", error);
        sendResponse({ 
          success: false, 
          error: error.message,
          details: error.details || "No additional details available"
        });
      });
    return true; // Required to use sendResponse asynchronously
  } else if (request.action === "getSidebarState") {
    // Respond with current sidebar visibility state
    sendResponse({ visible: sidebarVisible });
    return false;
  }
});

/**
 * Process email content with OpenAI API
 * @param {Object} emailData - The email data to process
 * @param {string} emailData.sender - The email sender
 * @param {string} emailData.subject - The email subject
 * @param {string} emailData.body - The email body
 * @returns {Promise<Object>} - The processed data with summary and calendar events
 */
async function processEmailWithOpenAI(emailData) {
  const { sender, subject, body } = emailData;
  
  // Verify we have sufficient data to process
  if (!body || body.length < 10) {
    console.error("Background: Email body is too short or empty", body);
    throw new Error("Email body is too short or empty");
  }
  
  // Prepare the prompt for OpenAI
  const prompt = `
  You are an email processing assistant. 
  Please analyze the following email and provide:
  1. A summary in 3-5 bullet points
  2. Extract any calendar events or appointments mentioned (with title, date, and time)
  
  Sender: ${sender}
  Subject: ${subject}
  Body: ${body.substring(0, 15000)} ${body.length > 15000 ? '... (content truncated due to length)' : ''}
  
  Please format your response as a JSON object with the following structure:
  {
    "summary": ["bullet point 1", "bullet point 2", "bullet point 3"],
    "calendarEvents": [
      {
        "title": "Event title",
        "date": "Event date (Month Day, Year format - e.g. 'May 7, 2023')",
        "time": "Event time (e.g. '2:00 PM' or '14:00')"
      }
    ]
  }

  For dates, please use a standardized format like "May 7, 2023" or "December 15, 2023".
  For times, please use a standardized format like "2:00 PM" or "14:00".
  Always include the year in the date, even if it's the current year.
  
  Be thorough in detecting events. Look for phrases like "meeting", "call", "appointment", "due date", "deadline", etc.
  Include the timezone if it's mentioned in the email.

  Ensure your response is valid JSON format with no markdown formatting or additional text.
  `;
  
  console.log("Background: Sending request to OpenAI", {
    promptLength: prompt.length,
    model: "gpt-4o"
  });
  
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an email processing assistant. Your responses must be valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { "type": "json_object" }
      })
    });
    
    // Check if the response is okay
    if (!response.ok) {
      let errorInfo = { status: response.status, statusText: response.statusText };
      
      try {
        const errorData = await response.json();
        console.error("Background: OpenAI API error response:", errorData);
        errorInfo.details = errorData.error || errorData;
        throw new Error(`OpenAI API error: ${errorData.error?.message || errorData.error || 'Unknown error'}`);
      } catch (jsonError) {
        // If the response isn't JSON, get the text instead
        const errorText = await response.text();
        console.error("Background: OpenAI API returned non-JSON error:", errorText);
        throw new Error(`OpenAI API error (${response.status}): ${errorText.substring(0, 100)}`);
      }
    }
    
    // Process the response
    const responseData = await response.json();
    console.log("Background: Received raw response from OpenAI:", responseData);
    
    const content = responseData.choices[0].message.content;
    console.log("Background: OpenAI content response:", content);
    
    try {
      // Parse the JSON response from OpenAI
      const parsedResponse = JSON.parse(content);
      
      // Validate the response structure
      if (!parsedResponse.summary || !Array.isArray(parsedResponse.summary)) {
        console.error("Background: Invalid response structure - missing summary array");
        throw new Error("Invalid response from OpenAI - missing summary");
      }
      
      // Ensure calendarEvents is at least an empty array
      if (!parsedResponse.calendarEvents) {
        parsedResponse.calendarEvents = [];
      }
      
      return parsedResponse;
    } catch (parseError) {
      console.error("Background: Error parsing OpenAI response:", parseError, "Content:", content);
      
      // Attempt to extract JSON from the response if it contains other text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extractedJson = JSON.parse(jsonMatch[0]);
          console.log("Background: Successfully extracted JSON from response", extractedJson);
          return extractedJson;
        } catch (extractError) {
          console.error("Background: Failed to extract JSON:", extractError);
        }
      }
      
      // If we couldn't parse the response, create a fallback
      const errorWithDetails = new Error("Failed to process email. Could not parse the response.");
      errorWithDetails.details = `Response was not valid JSON: ${content.substring(0, 100)}...`;
      throw errorWithDetails;
    }
  } catch (error) {
    console.error("Background: Error in OpenAI API call:", error);
    throw error;
  }
}

// Log extension initialization
console.log("Gmail Smart Sidebar: Background script initialized"); 