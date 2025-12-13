// Admin Panel JavaScript - Enhanced UX

// Toast notifications
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `alert alert-${type}`;
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.right = '20px';
    toast.style.zIndex = '3000';
    toast.style.minWidth = '300px';
    toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Form validation
function validateForm(form) {
    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.style.borderColor = '#ef4444';
            isValid = false;
        } else {
            input.style.borderColor = '';
        }
    });
    
    return isValid;
}

// Enhanced delete confirmation
document.addEventListener('DOMContentLoaded', function() {
    // Delete confirmation with better UX
    const deleteForms = document.querySelectorAll('form[action*="delete"]');
    deleteForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const confirmed = confirm('Are you sure you want to delete this item? This action cannot be undone.');
            if (confirmed) {
                // Show loading state
                const button = form.querySelector('button[type="submit"]');
                const originalText = button.textContent;
                button.disabled = true;
                button.textContent = 'Deleting...';
                
                form.submit();
            }
        });
    });
    
    // Form validation on submit
    const forms = document.querySelectorAll('form:not([action*="delete"]):not([action*="logout"])');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!validateForm(form)) {
                e.preventDefault();
                showToast('Please fill in all required fields', 'error');
            }
        });
    });
    
    // Auto-dismiss alerts
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            alert.style.transition = 'opacity 0.3s';
            setTimeout(() => alert.remove(), 300);
        }, 5000);
    });
    
    // Input focus effects
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'scale(1.01)';
            this.parentElement.style.transition = 'transform 0.2s';
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.style.transform = 'scale(1)';
        });
    });
    
    // Table row hover effects
    const tableRows = document.querySelectorAll('.data-table tbody tr');
    tableRows.forEach(row => {
        row.addEventListener('mouseenter', function() {
            this.style.transform = 'translateX(4px)';
            this.style.transition = 'transform 0.2s';
        });
        
        row.addEventListener('mouseleave', function() {
            this.style.transform = 'translateX(0)';
        });
    });
    
    // Button loading states
    const submitButtons = document.querySelectorAll('button[type="submit"]:not(.btn-delete)');
    submitButtons.forEach(button => {
        button.addEventListener('click', function() {
            const form = this.closest('form');
            if (form && validateForm(form)) {
                this.disabled = true;
                const originalText = this.textContent;
                this.textContent = 'Saving...';
                this.style.opacity = '0.7';
                
                // Re-enable after 5 seconds as fallback
                setTimeout(() => {
                    this.disabled = false;
                    this.textContent = originalText;
                    this.style.opacity = '1';
                }, 5000);
            }
        });
    });
});

// Auto-save draft functionality (localStorage)
function autoSaveDraft(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        const key = `${formId}_${input.name}`;
        
        // Load saved draft
        const saved = localStorage.getItem(key);
        if (saved && !input.value) {
            input.value = saved;
        }
        
        // Save on change
        input.addEventListener('input', function() {
            localStorage.setItem(key, this.value);
        });
    });
    
    // Clear on successful submit
    form.addEventListener('submit', function() {
        inputs.forEach(input => {
            const key = `${formId}_${input.name}`;
            localStorage.removeItem(key);
        });
    });
}

// Search/filter functionality
function initTableSearch() {
    const searchInputs = document.querySelectorAll('.table-search');
    searchInputs.forEach(input => {
        input.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const table = this.closest('.table-container').querySelector('.data-table');
            const rows = table.querySelectorAll('tbody tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    });
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        initTableSearch();
    });
} else {
    initTableSearch();
}

