// UX Layout JSON Helper for Admin Panel

// Example templates for different section types
const sectionTemplates = {
  hero: {
    type: 'hero',
    title: 'Welcome',
    subtitle: 'Your subtitle here',
    image: 'https://via.placeholder.com/1600x600',
    cta: { label: 'Get Started', url: '/' }
  },
  paragraph: {
    type: 'paragraph',
    text: 'Your paragraph text here'
  },
  grid: {
    type: 'grid',
    columns: 3,
    items: [
      { title: 'Item 1', text: 'Description 1', image: 'https://via.placeholder.com/400x300' },
      { title: 'Item 2', text: 'Description 2', image: 'https://via.placeholder.com/400x300' },
      { title: 'Item 3', text: 'Description 3', image: 'https://via.placeholder.com/400x300' }
    ]
  },
  cta: {
    type: 'cta',
    text: 'Call to Action',
    link: '/contact',
    variant: 'primary'
  },
  featureList: {
    type: 'featureList',
    items: [
      { title: 'Feature 1', description: 'Description 1' },
      { title: 'Feature 2', description: 'Description 2' },
      { title: 'Feature 3', description: 'Description 3' }
    ]
  }
};

// Validate JSON
function validateJSON(jsonString) {
  try {
    JSON.parse(jsonString);
    return { valid: true, error: null };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Format JSON
function formatJSON(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    return jsonString;
  }
}

// Add section template
function addSectionTemplate(type) {
  const textarea = document.querySelector('textarea[name="uxLayout"]');
  if (!textarea) return;

  const template = sectionTemplates[type];
  if (!template) return;

  try {
    const current = JSON.parse(textarea.value || '{"sections": []}');
    if (!current.sections) current.sections = [];
    current.sections.push(template);
    textarea.value = JSON.stringify(current, null, 2);
    
    // Show success message
    showToast('Section added!', 'success');
  } catch (error) {
    showToast('Error adding section: ' + error.message, 'error');
  }
}

// Initialize UX Layout helper
document.addEventListener('DOMContentLoaded', function() {
  const uxLayoutTextarea = document.querySelector('textarea[name="uxLayout"]') || document.getElementById('uxLayoutTextarea');
  if (!uxLayoutTextarea) return;

  // Validate on blur
  uxLayoutTextarea.addEventListener('blur', function() {
    const validation = validateJSON(this.value);
    if (!validation.valid) {
      this.style.borderColor = '#ef4444';
      showToast('Invalid JSON: ' + validation.error, 'error');
    } else {
      this.style.borderColor = '';
      // Auto-format
      this.value = formatJSON(this.value);
    }
  });

  // Add format button
  const formGroup = uxLayoutTextarea.closest('.form-group');
  if (formGroup) {
    const buttonContainer = document.createElement('div');
    buttonContainer.style.marginTop = '8px';
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '8px';
    buttonContainer.style.flexWrap = 'wrap';

    const formatBtn = document.createElement('button');
    formatBtn.type = 'button';
    formatBtn.className = 'btn btn-sm btn-secondary';
    formatBtn.textContent = 'Format JSON';
    formatBtn.onclick = () => {
      uxLayoutTextarea.value = formatJSON(uxLayoutTextarea.value);
      showToast('JSON formatted!', 'success');
    };

    const validateBtn = document.createElement('button');
    validateBtn.type = 'button';
    validateBtn.className = 'btn btn-sm btn-secondary';
    validateBtn.textContent = 'Validate JSON';
    validateBtn.onclick = () => {
      const validation = validateJSON(uxLayoutTextarea.value);
      if (validation.valid) {
        showToast('JSON is valid!', 'success');
      } else {
        showToast('Invalid JSON: ' + validation.error, 'error');
      }
    };

    buttonContainer.appendChild(formatBtn);
    buttonContainer.appendChild(validateBtn);
    formGroup.appendChild(buttonContainer);
  }
});

