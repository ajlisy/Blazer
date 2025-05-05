// Gmail Smart Sidebar - Content Script

// Configuration
const REFRESH_INTERVAL = 1000; // Check for new emails every 1 second
const MAX_INSERTION_ATTEMPTS = 10; // Maximum number of attempts to insert sidebar
let lastProcessedEmailId = null;
let sidebarContainer = null;
let isProcessing = false;
let insertionAttempts = 0;
let debugMode = false; // Debug mode toggle

// Main initialization
function initializeExtension() {
  console.log("Gmail Smart Sidebar: Initializing...");
  
  // Create sidebar container if it doesn't exist
  if (!sidebarContainer) {
    createSidebarContainer();
  }
  
  // Set up email change detection
  setInterval(checkForEmailChange, REFRESH_INTERVAL);
  
  // Add debug info to console
  console.log("Gmail Smart Sidebar: URL at initialization:", window.location.href);
  logGmailStructure();
}

// Log Gmail structure for debugging purposes
function logGmailStructure() {
  console.log("Gmail Smart Sidebar: Logging Gmail structure for debugging");
  
  // Check for basic Gmail elements
  const mainElement = document.querySelector('div[role="main"]');
  console.log("Gmail main element found:", !!mainElement);
  
  const rightSidebar = document.querySelector('div[role="complementary"]');
  console.log("Gmail right sidebar element found:", !!rightSidebar);
  
  // Log all elements with role attributes for debugging
  const roleElements = document.querySelectorAll('[role]');
  console.log("Elements with role attributes:", roleElements.length);
  console.log("Role values:", Array.from(roleElements).map(el => el.getAttribute('role')).filter((v, i, a) => a.indexOf(v) === i));
}

// Create the sidebar container
function createSidebarContainer() {
  // Create sidebar container
  sidebarContainer = document.createElement('div');
  sidebarContainer.id = 'smart-sidebar-container';
  sidebarContainer.className = 'smart-sidebar';
  
  // Add initial content
  sidebarContainer.innerHTML = `
    <div class="sidebar-header">
      <h2>Smart Sidebar</h2>
      <div class="sidebar-controls">
        <a href="#" id="debug-toggle" title="Toggle Debug Mode" style="font-size: 10px; color: #777;">Debug: OFF</a>
      </div>
    </div>
    <div class="sidebar-content">
      <div class="sidebar-message">
        <p>Open an email to see a summary and calendar events.</p>
      </div>
    </div>
  `;
  
  // Insert sidebar into Gmail's UI using multiple methods
  insertSidebarIntoGmail();
  
  // Also attempt insertion when DOM changes 
  setupMutationObserver();
  
  // Add debug toggle event listener after insertion
  setTimeout(() => {
    const debugToggle = document.getElementById('debug-toggle');
    if (debugToggle) {
      debugToggle.addEventListener('click', (e) => {
        e.preventDefault();
        debugMode = !debugMode;
        debugToggle.textContent = `Debug: ${debugMode ? 'ON' : 'OFF'}`;
        
        // Show/hide all debug elements
        const debugElements = document.querySelectorAll('.event-debug');
        debugElements.forEach(el => {
          el.style.display = debugMode ? 'block' : 'none';
        });
        
        console.log(`Gmail Smart Sidebar: Debug mode ${debugMode ? 'enabled' : 'disabled'}`);
      });
    }
  }, 1000);
}

// Insert sidebar into Gmail's UI
function insertSidebarIntoGmail() {
  insertionAttempts++;
  console.log(`Gmail Smart Sidebar: Attempting to insert sidebar (Attempt ${insertionAttempts}/${MAX_INSERTION_ATTEMPTS})`);
  
  // Method 1: Try to find Gmail's right sidebar
  const gmailRightSidebar = document.querySelector('div[role="complementary"]');
  if (gmailRightSidebar) {
    console.log("Gmail Smart Sidebar: Found right sidebar element");
    // Insert before the right sidebar
    gmailRightSidebar.parentNode.insertBefore(sidebarContainer, gmailRightSidebar);
    console.log("Gmail Smart Sidebar: Sidebar inserted using Method 1");
    return true;
  }
  
  // Method 2: Try to find Gmail's main content area
  const mainContent = document.querySelector('div[role="main"]');
  if (mainContent) {
    console.log("Gmail Smart Sidebar: Found main content element");
    // Insert after the main content (will appear on the right)
    if (mainContent.parentNode) {
      mainContent.parentNode.insertBefore(sidebarContainer, mainContent.nextSibling);
      console.log("Gmail Smart Sidebar: Sidebar inserted using Method 2");
      return true;
    }
  }
  
  // Method 3: Try to find any major Gmail container
  const gmailApp = document.querySelector('.nH.w-asV.aiw');
  if (gmailApp) {
    console.log("Gmail Smart Sidebar: Found Gmail app container");
    // Append to the container
    gmailApp.appendChild(sidebarContainer);
    console.log("Gmail Smart Sidebar: Sidebar inserted using Method 3");
    return true;
  }
  
  // Method 4: Last resort - insert at the end of the body
  if (insertionAttempts >= MAX_INSERTION_ATTEMPTS) {
    console.log("Gmail Smart Sidebar: Using fallback method to insert sidebar");
    document.body.appendChild(sidebarContainer);
    // Apply additional styling to make it visible
    sidebarContainer.style.position = 'fixed';
    sidebarContainer.style.top = '60px';
    sidebarContainer.style.right = '0';
    sidebarContainer.style.zIndex = '9999';
    sidebarContainer.style.height = 'calc(100vh - 60px)';
    console.log("Gmail Smart Sidebar: Sidebar inserted using fallback method");
    return true;
  }
  
  console.log("Gmail Smart Sidebar: Could not find insertion point, will try again");
  setTimeout(insertSidebarIntoGmail, 1000);
  return false;
}

// Set up a mutation observer to detect DOM changes
function setupMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    // Check if our sidebar is still in the document
    if (!document.body.contains(sidebarContainer) && insertionAttempts < MAX_INSERTION_ATTEMPTS) {
      console.log("Gmail Smart Sidebar: Sidebar not in DOM, reinserting");
      insertSidebarIntoGmail();
    }
    
    // Also check for new emails
    const currentUrl = window.location.href;
    if (currentUrl.includes('#inbox/') || currentUrl.includes('msg/')) {
      checkForEmailChange();
    }
  });
  
  // Start observing the document body for changes
  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
  
  console.log("Gmail Smart Sidebar: Mutation observer set up");
}

// Check if the user has opened a new email
function checkForEmailChange() {
  // Try multiple methods to find the email container
  const emailSelectors = [
    'div[role="main"] div[role="listitem"]',
    '.a3s.aiL',
    '.ii.gt div[dir="ltr"]',
    '.gs .adP'
  ];
  
  let emailContainer = null;
  for (const selector of emailSelectors) {
    emailContainer = document.querySelector(selector);
    if (emailContainer) {
      break;
    }
  }
  
  if (!emailContainer) {
    return; // No email is currently open
  }
  
  // Use some unique identifier for the email (URL, subject, etc.)
  const currentUrl = window.location.href;
  const emailId = getEmailIdFromUrl(currentUrl);
  
  // If this is a new email and it's not already being processed
  if (emailId && emailId !== lastProcessedEmailId && !isProcessing) {
    console.log("Gmail Smart Sidebar: New email detected", emailId);
    lastProcessedEmailId = emailId;
    isProcessing = true;
    
    // Show loading state
    updateSidebarContent({
      state: 'loading',
      message: 'Processing email...'
    });
    
    // Extract email data
    const emailData = extractEmailData(emailContainer);
    
    // Process the email with ChatGPT
    processEmail(emailData);
  }
}

// Extract a unique ID from the Gmail URL
function getEmailIdFromUrl(url) {
  // Gmail URLs can have various formats
  const patterns = [
    /#(?:inbox|all|sent|trash|spam)\/([^/]+)/, // Standard format
    /#msg\/([^/]+)/,                          // Message view
    /\/([a-zA-Z0-9]+)$/                       // Last segment fallback
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  // Fallback: use the entire URL as a hash
  return url.split('#')[1] || url;
}

// Extract email data from the Gmail interface
function extractEmailData(emailContainer) {
  let sender = '';
  let subject = '';
  let body = '';
  
  try {
    // Extract sender (try multiple selectors)
    const senderSelectors = [
      'h3[role="heading"] span[email]',
      '.gD',
      '.gE.iv.gt'
    ];
    
    for (const selector of senderSelectors) {
      const senderElement = emailContainer.querySelector(selector) || 
                         document.querySelector(selector);
      if (senderElement) {
        sender = senderElement.getAttribute('email') || senderElement.textContent.trim();
        break;
      }
    }
    
    // Fallback for sender
    if (!sender) {
      const possibleSenderElement = emailContainer.querySelector('h3[role="heading"]') ||
                                 document.querySelector('h3[role="heading"]');
      if (possibleSenderElement) {
        sender = possibleSenderElement.textContent.trim();
      }
    }
    
    // Extract subject (try multiple selectors)
    const subjectSelectors = [
      'h2[role="heading"]',
      '.hP',
      '.ha h2.hP'
    ];
    
    for (const selector of subjectSelectors) {
      const subjectElement = emailContainer.querySelector(selector) || 
                          document.querySelector(selector);
      if (subjectElement) {
        subject = subjectElement.textContent.trim();
        break;
      }
    }
    
    // Extract body (try multiple selectors)
    const bodySelectors = [
      'div[role="region"]',
      '.a3s.aiL',
      '.ii.gt div[dir="ltr"]',
      '.Ap div[dir="ltr"]'
    ];
    
    for (const selector of bodySelectors) {
      const bodyElement = emailContainer.querySelector(selector) || 
                       document.querySelector(selector);
      if (bodyElement) {
        body = bodyElement.innerText || bodyElement.textContent;
        if (body.length > 20) { // Ensure we have meaningful content
          break;
        }
      }
    }
    
    // If still no meaningful body text, try getting all text from email container
    if (!body || body.length < 20) {
      body = emailContainer.innerText || emailContainer.textContent;
    }
    
    console.log("Gmail Smart Sidebar: Extracted email data", { 
      sender, 
      subject, 
      bodyLength: body.length 
    });
    
    return { sender: sender || "Unknown", subject: subject || "Unknown", body };
  } catch (error) {
    console.error("Gmail Smart Sidebar: Error extracting email data", error);
    return { sender: "Unknown", subject: "Unknown", body: "" };
  }
}

// Process the email using the background script
function processEmail(emailData) {
  console.log("Gmail Smart Sidebar: Sending email data to background script for processing");
  
  chrome.runtime.sendMessage(
    {
      action: "processEmail",
      data: emailData
    },
    response => {
      isProcessing = false;
      
      if (response && response.success) {
        console.log("Gmail Smart Sidebar: Successfully processed email");
        // Update sidebar with the processed data
        updateSidebarContent({
          state: 'success',
          data: response.data,
          originalEmail: emailData
        });
      } else {
        console.error("Gmail Smart Sidebar: Error from background script", response);
        // Show error with details if available
        updateSidebarContent({
          state: 'error',
          message: response?.error || 'Failed to process email',
          details: response?.details,
          originalEmail: emailData
        });
      }
    }
  );
}

// Update the sidebar content based on the state
function updateSidebarContent(options) {
  const { state, message, details, data, originalEmail } = options;
  
  if (!sidebarContainer || !document.body.contains(sidebarContainer)) {
    console.log("Gmail Smart Sidebar: Sidebar container not found, reinserting");
    createSidebarContainer();
    return;
  }
  
  let content = '';
  
  if (state === 'loading') {
    content = `
      <div class="sidebar-header">
        <h2>Smart Sidebar</h2>
        <div class="sidebar-controls">
          <a href="#" id="debug-toggle" title="Toggle Debug Mode" style="font-size: 10px; color: #777;">Debug: ${debugMode ? 'ON' : 'OFF'}</a>
        </div>
      </div>
      <div class="sidebar-content">
        <div class="sidebar-loading">
          <div class="loading-spinner"></div>
          <p>${message || 'Loading...'}</p>
        </div>
      </div>
    `;
  } else if (state === 'error') {
    content = `
      <div class="sidebar-header">
        <h2>Smart Sidebar</h2>
        <div class="sidebar-controls">
          <a href="#" id="debug-toggle" title="Toggle Debug Mode" style="font-size: 10px; color: #777;">Debug: ${debugMode ? 'ON' : 'OFF'}</a>
        </div>
      </div>
      <div class="sidebar-content">
        <div class="sidebar-error">
          <p class="error-message">Error: ${message}</p>
          ${details ? `<div class="error-details">Details: ${details}</div>` : ''}
          <p class="error-help">This could be due to:</p>
          <ul class="error-help-list">
            <li>Connection issue with OpenAI API</li>
            <li>Unusual email format or content</li>
            <li>API quota exceeded</li>
          </ul>
          <button id="retry-button" class="sidebar-button">Retry</button>
          <button id="manual-summary-button" class="sidebar-button sidebar-button-secondary">Use Simple Summary</button>
        </div>
      </div>
    `;
  } else if (state === 'success' && data) {
    // Format the summary bullets
    const summaryHtml = data.summary.map(point => `<li>${point}</li>`).join('');
    
    // Format calendar events
    let calendarEventsHtml = '';
    if (data.calendarEvents && data.calendarEvents.length > 0) {
      calendarEventsHtml = data.calendarEvents.map(event => {
        const calendarLink = createGoogleCalendarLink(event);
        
        // Format date and time for display
        const formattedDate = event.date || 'Date not specified';
        const formattedTime = event.time || 'Time not specified';
        
        // Add any extracted timezone
        const timeWithZone = event.timezone 
          ? `${formattedTime} (${event.timezone})` 
          : formattedTime;
        
        // Get the URL details for debugging
        const urlDetails = calendarLink.includes('dates=') 
          ? calendarLink.match(/dates=([^&]+)/) 
          : ['No dates parameter found'];
        
        const debugInfo = `
          Original date: "${event.date}"
          Original time: "${event.time}"
          Calendar URL param: ${urlDetails ? urlDetails[0] : 'Not found'}
        `;
        
        return `
          <div class="calendar-event">
            <div class="event-title">📅 ${event.title}</div>
            <div class="event-datetime">🕒 ${formattedDate} at ${timeWithZone}</div>
            <a href="${calendarLink}" target="_blank" class="calendar-link">Add to Calendar</a>
            <div class="event-debug" style="font-size: 0.6em; color: #999; margin-top: 4px; white-space: pre-line; display: ${debugMode ? 'block' : 'none'};">
              ${debugInfo}
            </div>
          </div>
        `;
      }).join('');
    }
    
    content = `
      <div class="sidebar-header">
        <h2>Smart Sidebar</h2>
        <div class="sidebar-controls">
          <a href="#" id="debug-toggle" title="Toggle Debug Mode" style="font-size: 10px; color: #777;">Debug: ${debugMode ? 'ON' : 'OFF'}</a>
        </div>
      </div>
      <div class="sidebar-content">
        <div class="section">
          <h3>Sender</h3>
          <div class="sender-info">${originalEmail.sender}</div>
        </div>
        
        <div class="section">
          <h3>Subject</h3>
          <div class="subject-info">${originalEmail.subject}</div>
        </div>
        
        <div class="section">
          <h3>Summary</h3>
          <ul class="summary-list">
            ${summaryHtml}
          </ul>
        </div>
        
        ${data.calendarEvents && data.calendarEvents.length > 0 ? 
          `<div class="section">
            <h3>Calendar Events</h3>
            <div class="calendar-events">
              ${calendarEventsHtml}
            </div>
          </div>` : ''
        }
      </div>
    `;
  }
  
  sidebarContainer.innerHTML = content;
  
  // Add event listeners if there's a retry button
  if (state === 'error') {
    const retryButton = sidebarContainer.querySelector('#retry-button');
    if (retryButton && originalEmail) {
      retryButton.addEventListener('click', () => {
        isProcessing = true;
        updateSidebarContent({
          state: 'loading',
          message: 'Retrying...'
        });
        processEmail(originalEmail);
      });
    }
    
    // Add event listener for manual summary button
    const manualSummaryButton = sidebarContainer.querySelector('#manual-summary-button');
    if (manualSummaryButton && originalEmail) {
      manualSummaryButton.addEventListener('click', () => {
        // Generate a simple summary without the API
        const simpleData = generateSimpleSummary(originalEmail);
        updateSidebarContent({
          state: 'success',
          data: simpleData,
          originalEmail: originalEmail
        });
      });
    }
  }
  
  // Reattach debug toggle listener
  const debugToggle = document.getElementById('debug-toggle');
  if (debugToggle) {
    debugToggle.addEventListener('click', (e) => {
      e.preventDefault();
      debugMode = !debugMode;
      debugToggle.textContent = `Debug: ${debugMode ? 'ON' : 'OFF'}`;
      
      // Show/hide all debug elements
      const debugElements = document.querySelectorAll('.event-debug');
      debugElements.forEach(el => {
        el.style.display = debugMode ? 'block' : 'none';
      });
      
      console.log(`Gmail Smart Sidebar: Debug mode ${debugMode ? 'enabled' : 'disabled'}`);
    });
  }
}

// Generate a simple summary without using the API
function generateSimpleSummary(emailData) {
  const { body } = emailData;
  
  // Create a simple fallback summary by extracting sentences
  let sentences = body.split(/[.!?]+/).filter(s => s.trim().length > 20).slice(0, 10);
  
  // Use the first few sentences as summary points
  const summary = sentences.slice(0, 3).map(s => s.trim());
  
  // Simple regex pattern for dates (very basic)
  const datePattern = /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?,? \d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4}/gi;
  const timePattern = /\d{1,2}:\d{2} ?(?:am|pm|a\.m\.|p\.m\.)/gi;
  
  // Try to extract dates and times
  const dates = body.match(datePattern) || [];
  const times = body.match(timePattern) || [];
  const calendarEvents = [];
  
  // If we found dates and times, create calendar events
  if (dates.length > 0) {
    // Try to pair dates with times or use generic times
    for (let i = 0; i < Math.min(dates.length, 2); i++) {
      calendarEvents.push({
        title: `Event from email (${emailData.subject})`,
        date: dates[i],
        time: times[i] || "12:00 PM"
      });
    }
  }
  
  return {
    summary: summary.length > 0 ? summary : ["No automatic summary available - simple extraction mode"],
    calendarEvents
  };
}

// Create a Google Calendar link for an event
function createGoogleCalendarLink(event) {
  try {
    // Get the current year
    const currentYear = new Date().getFullYear();
    
    // Clean and normalize date and time formats
    let dateStr = event.date.trim();
    let timeStr = event.time.trim();
    
    // Add current year if not present in the date
    if (!dateStr.match(/\d{4}/) && !dateStr.match(/\d{2,4}$/)) {
      dateStr = `${dateStr} ${currentYear}`;
    }
    
    // Handle various date formats
    let eventDate;
    
    // Try different date parsing approaches
    const parseMethods = [
      // Try direct parsing
      () => new Date(`${dateStr} ${timeStr}`),
      
      // Try with more flexible date format handling
      () => {
        // Convert common month formats
        const monthMap = {
          'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
          'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
        };
        
        // Handle format like "May 7th, 2023"
        const longDateMatch = dateStr.match(/(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
        if (longDateMatch) {
          const month = monthMap[longDateMatch[1].toLowerCase().substring(0, 3)];
          const day = longDateMatch[2].padStart(2, '0');
          const year = longDateMatch[3] || currentYear;
          const formattedDate = `${year}-${month}-${day}`;
          
          // Handle AM/PM time format
          const timeMatch = timeStr.match(/(\d{1,2}):?(\d{2})?\s?(am|pm|a\.m\.|p\.m\.)?/i);
          if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            const minutes = timeMatch[2] || '00';
            const period = timeMatch[3]?.toLowerCase();
            
            // Convert to 24-hour format if needed
            if (period && (period.startsWith('p') || period.startsWith('p.')) && hours < 12) {
              hours += 12;
            } else if (period && (period.startsWith('a') || period.startsWith('a.')) && hours === 12) {
              hours = 0;
            }
            
            const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes}:00`;
            return new Date(`${formattedDate}T${formattedTime}`);
          }
        }
        
        // Handle short date formats (MM/DD/YYYY)
        const shortDateMatch = dateStr.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
        if (shortDateMatch) {
          const month = shortDateMatch[1].padStart(2, '0');
          const day = shortDateMatch[2].padStart(2, '0');
          let year = shortDateMatch[3];
          
          // Adjust 2-digit years
          if (year.length === 2) {
            year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
          }
          
          const formattedDate = `${year}-${month}-${day}`;
          return new Date(`${formattedDate}T${timeStr.replace(/\s?(am|pm|a\.m\.|p\.m\.)/i, '')}`);
        }
        
        throw new Error("Could not parse date format");
      }
    ];
    
    // Try each parsing method until one works
    for (const parseMethod of parseMethods) {
      try {
        eventDate = parseMethod();
        if (eventDate && !isNaN(eventDate.getTime())) {
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // If we couldn't parse the date, throw an error
    if (!eventDate || isNaN(eventDate.getTime())) {
      throw new Error("Invalid date format");
    }
    
    // End time is 1 hour later by default
    const endDate = new Date(eventDate.getTime() + 60 * 60 * 1000);
    
    // Format for Google Calendar URL (YYYYMMDDTHHMMSSZ)
    const formatDate = (date) => {
      return date.toISOString().replace(/-|:|\.\d+/g, '');
    };
    
    const startDateStr = formatDate(eventDate);
    const endDateStr = formatDate(endDate);
    
    console.log("Calendar event parsed successfully:", {
      original: { date: event.date, time: event.time },
      parsed: { start: eventDate.toString(), end: endDate.toString() },
      formatted: { start: startDateStr, end: endDateStr }
    });
    
    // Create Google Calendar URL
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startDateStr}/${endDateStr}`;
  } catch (error) {
    console.error("Gmail Smart Sidebar: Error creating calendar link", error, {date: event.date, time: event.time});
    
    // Fallback to a simpler approach - let Google Calendar handle the parsing
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&details=${encodeURIComponent(`Date: ${event.date}, Time: ${event.time}`)}&dates=${encodeURIComponent(formatSimpleDate(event))}`;
  }
}

// Fallback function to create a simple date format for Google Calendar
function formatSimpleDate(event) {
  try {
    // Get current date parts as defaults
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    const currentDay = now.getDate().toString().padStart(2, '0');
    
    // Try to extract some date information from the event strings
    const dayMatch = event.date.match(/\b(\d{1,2})(st|nd|rd|th)?\b/);
    const monthMatch = event.date.toLowerCase().match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/);
    const yearMatch = event.date.match(/\b(20\d{2})\b/);
    
    // Map month abbreviations to numbers
    const monthMap = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
      'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    };
    
    // Extract hour and check for AM/PM
    const hourMatch = event.time.match(/(\d{1,2})(?::(\d{2}))?(?:\s*(am|pm))?/i);
    
    // Build date parts, using extracted values or defaults
    const year = yearMatch ? yearMatch[1] : currentYear.toString();
    const month = monthMatch ? monthMap[monthMatch[1]] : currentMonth;
    const day = dayMatch ? dayMatch[1].padStart(2, '0') : currentDay;
    
    // Calculate hours (default to noon if not parsable)
    let hours = 12;
    let minutes = '00';
    
    if (hourMatch) {
      hours = parseInt(hourMatch[1]);
      if (hourMatch[3] && hourMatch[3].toLowerCase() === 'pm' && hours < 12) {
        hours += 12;
      } else if (hourMatch[3] && hourMatch[3].toLowerCase() === 'am' && hours === 12) {
        hours = 0;
      }
      minutes = hourMatch[2] || '00';
    }
    
    // Format as YYYYMMDDTHHMMSS/YYYYMMDDTHHMMSS (adding one hour for end time)
    const startDate = `${year}${month}${day}T${hours.toString().padStart(2, '0')}${minutes}00`;
    const endHours = (hours + 1) % 24;
    const endDate = `${year}${month}${day}T${endHours.toString().padStart(2, '0')}${minutes}00`;
    
    console.log("Simple date format fallback:", {
      original: { date: event.date, time: event.time },
      parsed: { year, month, day, hours, minutes },
      formatted: { start: startDate, end: endDate }
    });
    
    return `${startDate}/${endDate}`;
  } catch (e) {
    console.error("Error in simple date formatting:", e);
    // Ultimate fallback: just use current date/time + 1 hour
    const now = new Date();
    const later = new Date(now.getTime() + 60 * 60 * 1000);
    const formatDigits = date => date.toISOString().replace(/[-:]/g, '').split('.')[0];
    return `${formatDigits(now)}/${formatDigits(later)}`;
  }
}

// Initialize when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}

// Listen for Gmail navigation events
window.addEventListener('hashchange', () => {
  // Reset the last processed email when the URL changes
  lastProcessedEmailId = null;
  isProcessing = false;
  console.log("Gmail Smart Sidebar: URL changed, resetting email state");
});

// Force insertion on load
window.addEventListener('load', () => {
  console.log("Gmail Smart Sidebar: Window loaded");
  setTimeout(() => {
    if (!document.body.contains(sidebarContainer)) {
      console.log("Gmail Smart Sidebar: Sidebar not found after page load, reinserting");
      createSidebarContainer();
    }
  }, 2000);
}); 