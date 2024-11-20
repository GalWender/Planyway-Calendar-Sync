console.log('Planyway Calendar Sync Loaded');

function logDOMStructure() {
  const selectors = [
    '.pw-card',
    '[class*="card"]',
    '[class*="task"]',
    '[class*="board"]',
    '[class*="list"]',
    '[class*="title"]',
    '[class*="time"]',
    '[class*="date"]'
  ];

  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el, index) => {
      const className = el.className;
      const id = el.id;
      const textContent = el.textContent.trim().substring(0, 100);
      const children = el.children.length;
      const HTML = el.outerHTML.substring(0, 200);
    });
  });

  const mainElements = document.querySelectorAll('main, #root, [class*="board"], [class*="container"]');
  mainElements.forEach(el => {
    const className = el.className;
    const id = el.id;
    const children = el.children.length;
  });
}

async function getAuthToken() {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage({ action: "getAuthToken" }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response) {
          reject(new Error('No response received from background script'));
          return;
        }
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        if (!response.token) {
          reject(new Error('No token received'));
          return;
        }
        resolve(response.token);
      });
    } catch (error) {
      reject(error);
    }
  });
}

function extractCardData(card) {
  const cardContent = card.querySelector('.pw-card__content');
  if (!cardContent) {
    throw new Error('Card content not found');
  }

  const titleEl = cardContent.querySelector('.pw-card__title-text');
  const title = titleEl ? titleEl.textContent.trim() : '';

  const timeText = getCardTime(cardContent);

  const timeRange = parseTimeRange(timeText);

  const calendarEl = cardContent.querySelector('.pw-card__calendar');
  const taskListEl = cardContent.querySelector('.pw-card__task-list');
  
  const calendar = calendarEl ? calendarEl.textContent.trim() : '';
  const taskList = taskListEl ? taskListEl.textContent.trim() : '';

  const rect = card.getBoundingClientRect();
  const date = getDateFromHeader(rect.left);

  const [startHours, startMinutes] = parseTime(timeRange.start);
  const [endHours, endMinutes] = parseTime(timeRange.end);
  
  const startTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), startHours, startMinutes);
  const endTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), endHours, endMinutes);

  return {
    title,
    startTime,
    endTime,
    calendar,
    taskList
  };
}

function parseTimeRange(timeStr) {
  timeStr = timeStr.replace(/–/g, '-').replace(/—/g, '-').trim();
  
  const [startStr, endStr] = timeStr.split(/\s*-\s*/);
  
  if (!startStr || !endStr) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }

  function parseTime(timeStr, useEndPeriod = null) {
    timeStr = timeStr.trim().toUpperCase();
    
    let hours, minutes = 0, period;
    
    if (timeStr.includes('AM')) {
      period = 'AM';
      timeStr = timeStr.replace(/AM/g, '').trim();
    } else if (timeStr.includes('PM')) {
      period = 'PM';
      timeStr = timeStr.replace(/PM/g, '').trim();
    } else if (useEndPeriod) {
      period = useEndPeriod;
    }
    
    if (timeStr.includes(':')) {
      [hours, minutes] = timeStr.split(':').map(num => parseInt(num, 10));
    } else {
      hours = parseInt(timeStr, 10);
      minutes = 0;
    }
    
    if (isNaN(hours) || isNaN(minutes)) {
      throw new Error(`Invalid time format: ${timeStr}`);
    }
    
    return { hours, minutes, period };
  }
  
  const end = parseTime(endStr);
  const start = parseTime(startStr);
  
  function to24Hour(time) {
    let hours = time.hours;
    
    if (time.period === 'PM' && hours < 12) {
      hours += 12;
    } else if (time.period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return `${hours.toString().padStart(2, '0')}:${time.minutes.toString().padStart(2, '0')}`;
  }

  const result = {
    start: to24Hour(start),
    end: to24Hour(end)
  };
  
  return result;
}

function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(num => parseInt(num, 10));
  return [hours, minutes];
}

async function createGoogleCalendarEvent(cardData) {
  const token = await getAuthToken();
  
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const event = {
    'summary': cardData.title,
    'start': {
      'dateTime': cardData.startTime.toISOString(),
      'timeZone': userTimeZone
    },
    'end': {
      'dateTime': cardData.endTime.toISOString(),
      'timeZone': userTimeZone
    },
    'description': 'Added from Planyway Calendar'
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create event: ${response.statusText}`);
  }

  const result = await response.json();
  return result;
}

function getGoogleCalendarColorId(planywayColor) {
  const colorMap = {
    'yellow_light': '5',    
    'yellow': '5',          
    'orange_light': '6',    
    'orange': '6',          
    'red_light': '11',      
    'red': '11',            
    'purple_light': '3',    
    'purple': '3',          
    'blue_light': '7',      
    'blue': '7',            
    'sky_light': '9',       
    'sky': '9',             
    'green_light': '2',     
    'green': '2',           
    'lime_light': '10',     
    'lime': '10',           
    'pink_light': '4',      
    'pink': '4',            
    'black_light': '8',     
    'black': '8',           
  };

  return colorMap[planywayColor] || '1'; 
}

async function syncAllCards(cards) {
  const results = [];
  for (const card of cards) {
    try {
      const cardData = extractCardData(card);
      const event = await createGoogleCalendarEvent(cardData);
      results.push({ success: true, card: card.text, eventId: event.id });
    } catch (error) {
      console.error('Error syncing card:', card.text, error);
      results.push({ success: false, card: card.text, error: error.message });
    }
  }
  return results;
}

function addSyncButton() {
  const existingButton = document.querySelector('#sync-to-calendar-btn');
  if (existingButton) return;

  const button = document.createElement('button');
  button.id = 'sync-to-calendar-btn';
  button.className = 'k-button k-primary';
  button.textContent = 'Sync to Google Calendar';
  button.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 9999;';
  
  button.addEventListener('click', async () => {
    try {
      button.disabled = true;
      button.textContent = 'Syncing...';
      
      const cards = Array.from(document.querySelectorAll('.pw-card')).map(card => ({
        text: card.textContent,
        classes: card.className,
        rect: card.getBoundingClientRect(),
        hasTitle: true,
        hasTime: true
      }));
      
      const results = await syncAllCards(cards);
      
      const successCount = results.filter(r => r.success).length;
      alert(`Successfully synced ${successCount} out of ${results.length} events to Google Calendar`);
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Failed to sync events: ' + error.message);
    } finally {
      button.disabled = false;
      button.textContent = 'Sync to Google Calendar';
    }
  });

  document.body.appendChild(button);
}

function addImportButton(cardContent) {
  if (!cardContent || cardContent.querySelector('.calendar-import-btn')) return;

  const button = document.createElement('button');
  button.className = 'calendar-import-btn';
  button.style.cssText = `
    position: absolute;
    top: 5px;
    right: 5px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    z-index: 1000;
    color: #666;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s;
  `;
  
  button.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="currentColor" d="M19,4H17V3a1,1,0,0,0-2,0V4H9V3A1,1,0,0,0,7,3V4H5A3,3,0,0,0,2,7V19a3,3,0,0,0,3,3H19a3,3,0,0,0,3-3V7A3,3,0,0,0,19,4Zm1,15a1,1,0,0,1-1,1H5a1,1,0,0,1-1-1V12H20Zm0-9H4V7A1,1,0,0,1,5,6H7V7A1,1,0,0,0,9,7V6h6V7a1,1,0,0,0,2,0V6h2a1,1,0,0,1,1,1Z"/>
    </svg>
  `;

  button.addEventListener('mouseover', () => {
    button.style.backgroundColor = 'rgba(0,0,0,0.1)';
  });

  button.addEventListener('mouseout', () => {
    button.style.backgroundColor = 'transparent';
  });
  
  button.addEventListener('click', async (e) => {
    e.stopPropagation();
    const card = cardContent.closest('.pw-card') || cardContent;
    if (!card) return;
    
    try {
      const cardData = extractCardData(card);
      if (!cardData.startTime || !cardData.endTime) {
        return;
      }
      
      await createGoogleCalendarEvent(cardData);
      button.style.color = '#4CAF50';
      setTimeout(() => button.style.color = '#666', 2000);
    } catch (err) {
      button.style.color = '#F44336';
      setTimeout(() => button.style.color = '#666', 2000);
    }
  });

  if (cardContent.querySelector('.pw-card__content')) {
    cardContent.querySelector('.pw-card__content').appendChild(button);
  } else {
    cardContent.appendChild(button);
  }
}

function getDateFromHeader(leftPosition) {
  const headerWrap = document.querySelector('.k-scheduler-header-wrap');
  if (!headerWrap) {
    throw new Error('Could not find scheduler header');
  }

  const dateCells = headerWrap.querySelectorAll('th.k-scheduler-cell');
  if (!dateCells || dateCells.length === 0) {
    throw new Error('Could not find date cells');
  }

  const headerRect = headerWrap.getBoundingClientRect();
  const relativeLeft = leftPosition - headerRect.left;
  const cellWidth = headerRect.width / dateCells.length;
  const columnIndex = Math.floor(relativeLeft / cellWidth);

  if (columnIndex >= 0 && columnIndex < dateCells.length) {
    const cell = dateCells[columnIndex];
    
    const dtElement = cell.querySelector('.k-scheduler-header-duration');
    if (dtElement) {
      const dataDt = dtElement.getAttribute('data-dt');
      if (dataDt) {
        return new Date(dataDt);
      }
    }

    const dateDiv = cell.querySelector('.k-scheduler-header-date');
    if (dateDiv) {
      const dayOfWeek = dateDiv.children[0]?.textContent.trim();
      const dayOfMonth = parseInt(dateDiv.children[1]?.textContent.trim());
      
      if (!isNaN(dayOfMonth)) {
        const date = new Date();
        date.setDate(dayOfMonth);
        
        const today = new Date();
        const todayDate = today.getDate();
        
        if (dayOfMonth > 20 && todayDate < 10) {
          date.setMonth(date.getMonth() - 1);
        } else if (dayOfMonth < 10 && todayDate > 20) {
          date.setMonth(date.getMonth() + 1);
        }
        
        return date;
      }
    }
  }
  
  throw new Error('Could not find date header');
}

function getCardTime(cardContent) {
  const timeElement = cardContent.querySelector('.pw-card__time.pw-js-card-time');
  if (!timeElement) {
    throw new Error('Time element not found');
  }
  const timeText = timeElement.textContent.trim();
  return timeText;
}

function findCards() {
  const cards = [];
  const shouldLog = logCount < MAX_LOGS;
  
  document.querySelectorAll('.k-event.pw-card').forEach((card, index) => {
    const cardData = {
      element: card,
      classes: card.className,
      text: card.textContent,
      hasTitle: !!card.querySelector('.pw-card__title-text'),
      hasTime: !!card.querySelector('.pw-card__time'),
      rect: card.getBoundingClientRect()
    };
    cards.push(card); 
  });

  if (cards.length === 0) {
    document.querySelectorAll('.pw-card').forEach((card, index) => {
      const cardData = {
        element: card,
        classes: card.className,
        text: card.textContent,
        hasTitle: !!card.querySelector('.pw-card__title-text'),
        hasTime: !!card.querySelector('.pw-card__time'),
        rect: card.getBoundingClientRect()
      };
      cards.push(card); 
    });
  }

  if (shouldLog) {
    logCount++;
  }

  return cards;
}

function getCardData(card) {
  const cardContent = card.querySelector('.pw-card__content');
  if (!cardContent) {
    throw new Error('Card content not found');
  }

  const titleEl = cardContent.querySelector('.pw-card__title-text');
  const title = titleEl ? titleEl.textContent.trim() : '';

  const timeText = getCardTime(cardContent);

  const timeRange = parseTimeRange(timeText);

  const calendarEl = cardContent.querySelector('.pw-card__calendar');
  const taskListEl = cardContent.querySelector('.pw-card__task-list');
  
  const calendar = calendarEl ? calendarEl.textContent.trim() : '';
  const taskList = taskListEl ? taskListEl.textContent.trim() : '';

  const rect = card.getBoundingClientRect();
  const date = getDateFromHeader(rect.left);

  const [startHours, startMinutes] = parseTime(timeRange.start);
  const [endHours, endMinutes] = parseTime(timeRange.end);
  
  const startTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), startHours, startMinutes);
  const endTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), endHours, endMinutes);

  return {
    title,
    startTime,
    endTime,
    calendar,
    taskList
  };
}

function findSchedulerContainer() {
  const selectors = [
    '.k-scheduler-content',
    '.pw-calendar',
    '.pw-board',
    '[class*="scheduler"]',
    '[class*="calendar"]',
    '[class*="board"]',
    '#pw-app',
    '.pw-app',
    '[class*="planyway"]'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
  }
  return null;
}

function waitForContainer() {
  return new Promise((resolve) => {
    const maxAttempts = 30;
    let attempts = 0;
    
    const check = () => {
      const container = findSchedulerContainer();
      if (container) {
        resolve(container);
        return;
      }

      attempts++;
      if (attempts >= maxAttempts) {
        resolve(document.body);
        return;
      }

      setTimeout(check, 2000);
    };

    check();
  });
}

async function startObserving(container) {
  console.log('Starting observation on container:', container);

  const processedCards = new Set();

  const observer = new MutationObserver((mutations) => {
    const cards = findCards();
    cards.forEach(card => {
      if (!processedCards.has(card) && !card.querySelector('.calendar-import-btn')) {
        processedCards.add(card);
        addImportButton(card);
      }
    });
  });

  observer.observe(container, {
    childList: true,
    subtree: true,
    attributes: false, 
    characterData: false 
  });

  const initialCards = findCards();
  initialCards.forEach(card => {
    if (!processedCards.has(card) && !card.querySelector('.calendar-import-btn')) {
      processedCards.add(card);
      addImportButton(card);
    }
  });
}

function getEventDetailsFromModal(modal) {
  try {
    const titleInput = modal.querySelector('.pw-dialog-edit-card__title-text');
    const title = titleInput ? titleInput.value.trim() : '';

    const labelElement = modal.querySelector('.pw-dialog-edit-card__label');
    let colorId = '1'; 
    
    if (labelElement) {
      const classList = labelElement.className.split(' ');
      for (const className of classList) {
        if (className.startsWith('pw-dialog-edit-card__label--')) {
          const colorName = className.replace('pw-dialog-edit-card__label--', '');
          if (colorName !== 'color-empty') {
            colorId = getGoogleCalendarColorId(colorName);
            break;
          }
        }
      }
    }

    const startDateBtn = modal.querySelector('.pw-dialog-edit-card__date-picker button p');
    const startDateText = startDateBtn ? startDateBtn.textContent.trim() : '';

    const timeInputs = modal.querySelectorAll('.pw-dialog-edit-card__time-picker input.MuiInputBase-input');
    const startTimeText = timeInputs[0] ? timeInputs[0].value.trim() : '';
    const endTimeText = timeInputs[1] ? timeInputs[1].value.trim() : startTimeText;

    const endDateBtn = modal.querySelectorAll('.pw-dialog-edit-card__date-picker button p')[1];
    const endDateText = endDateBtn ? endDateBtn.textContent.trim() : startDateText;

    const currentYear = new Date().getFullYear();
    
    function parse12HourTime(timeStr) {
      
      if (!timeStr) return null;
      
      const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!match) {
        return null;
      }
      
      let [_, hours, minutes, period] = match;
      hours = parseInt(hours);
      minutes = parseInt(minutes);
      
      if (period.toUpperCase() === 'PM' && hours < 12) {
        hours += 12;
      } else if (period.toUpperCase() === 'AM' && hours === 12) {
        hours = 0;
      }
      
      return { hours, minutes };
    }

    const startTime = parse12HourTime(startTimeText);
    if (!startTime) {
      throw new Error('Invalid start time format');
    }
    
    const endTime = parse12HourTime(endTimeText);
    if (!endTime) {
      throw new Error('Invalid end time format');
    }

    const startDate = new Date(`${startDateText}, ${currentYear} ${startTimeText}`);
    const endDate = new Date(`${endDateText}, ${currentYear} ${endTimeText}`);

    const startDateTime = startDate;
    const endDateTime = endDate;

    return {
      title,
      startTime: startDateTime,
      endTime: endDateTime,
      colorId: colorId
    };

  } catch (error) {
    throw error;
  }
}

async function createCalendarEvent(eventDetails) {
  try {
    const event = {
      summary: eventDetails.title,
      start: {
        dateTime: eventDetails.startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: eventDetails.endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      colorId: eventDetails.colorId
    };

    const token = await getAuthToken();
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      throw new Error(`Failed to create event: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    throw error;
  }
}

function addCalendarButton() {
  const modal = document.querySelector('.pw-dialog-edit-card');
  if (!modal) {
    return;
  }

  if (modal.querySelector('.add-to-calendar-btn')) {
    return;
  }

  const button = document.createElement('button');
  button.className = 'add-to-calendar-btn pw-dialog-edit-card__btn md-button';
  button.innerHTML = '<span>Add to Calendar</span>';
  
  button.style.cssText = `
    margin-left: 8px;
    font-family: inherit;
    font-size: 13px;
    line-height: 20px;
    font-weight: 400;
    padding: 4px 8px;
    border-radius: 4px;
    background-color: transparent;
    color: #8B8E93;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
  `;

  button.addEventListener('mouseover', () => {
    button.style.backgroundColor = 'rgba(69, 139, 246, 0.1)';
    button.style.color = '#458BF6';
  });

  button.addEventListener('mouseout', () => {
    button.style.backgroundColor = 'transparent';
    button.style.color = '#8B8E93';
  });

  button.addEventListener('click', async () => {
    try {
      const eventDetails = getEventDetailsFromModal(modal);
      if (!eventDetails) {
        return;
      }
      await createCalendarEvent(eventDetails);
    } catch (error) {
      throw error;
    }
  });

  const buttonContainer = modal.querySelector('.pw-dialog-edit-card__header-action-group');
  if (buttonContainer) {
    buttonContainer.appendChild(button);
  }
}

function setupModalObserver() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const modal = node.classList?.contains('pw-dialog-edit-card') ? 
            node : node.querySelector('.pw-dialog-edit-card');
          
          if (modal) {
            setTimeout(addCalendarButton, 100);
            return;
          }
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
}

function initializeExtension() {
  setupModalObserver();
}

initializeExtension();
