// Gmail Smart Sidebar - Configuration Template
// Create a copy of this file named 'config.js' and add your actual API keys

const CONFIG = {
  // OpenAI API configuration
  openai: {
    apiKey: "YOUR_OPENAI_API_KEY_HERE", // Replace with your actual OpenAI API key
    model: "gpt-4o" // The model to use for API calls
  },
  
  // Extension settings
  settings: {
    defaultSidebarVisible: true, // Should the sidebar be visible by default?
    refreshInterval: 1000, // How often to check for new emails (in milliseconds)
    debugMode: false // Enable debug mode by default?
  }
};

// Export the configuration
export default CONFIG; 